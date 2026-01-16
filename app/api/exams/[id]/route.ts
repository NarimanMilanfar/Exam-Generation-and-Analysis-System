import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { QuestionType } from "../../../types/course";
import { validateSection } from "../../../lib/sectionUtils";
import { validateCourseAccess } from "../../../../lib/coursePermissions";
import { logActivity } from "../../../../lib/activityLogger";
import { validateExamAgainstCourseConfig } from "../../../lib/courseConfigValidation";

// GET /api/exams/[id] - Get a specific exam
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exam = await prisma.exam.findUnique({
      where: {
        id: params.id,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        term: true,
        questions: {
          include: {
            question: true,
            questionBank: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        variants: true,
        _count: {
          select: {
            questions: true,
            results: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if user has access to the course
    const { hasAccess } = await validateCourseAccess(exam.courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Transform the data to match the frontend interface (compatible with old QuestionList format)
    const transformedExam = {
      id: exam.id,
      name: exam.title, // Map title to name for compatibility
      title: exam.title,
      description: exam.description,
      courseId: exam.courseId,
      termId: exam.termId,
      term: exam.term,
      section: exam.section,
      course: exam.course,
      questions: exam.questions.map((eq: any) => ({
        id: eq.question.id,
        text: eq.question.text,
        type: eq.question.type as QuestionType,
        options: eq.question.options ? JSON.parse(eq.question.options) : [],
        correctAnswer: eq.question.correctAnswer,
        points: eq.points || eq.question.points,
        negativePoints: eq.negativePoints ?? eq.question.negativePoints,
        difficulty: eq.question.difficulty,
        topic: eq.question.topic,
        courseId: eq.question.courseId,
        questionBankId: eq.questionBankId,
        createdAt: exam.createdAt.toISOString(),
        updatedAt: exam.updatedAt.toISOString(),
      })),
      totalPoints:
        exam.totalPoints ||
        exam.questions.reduce(
          (sum: any, eq: any) => sum + (eq.points || eq.question.points),
          0
        ),
      questionCount: exam._count.questions,
      resultCount: exam._count.results,
      isPublished: exam.isPublished,
      timeLimit: exam.timeLimit,
      startDate: exam.startDate?.toISOString(),
      endDate: exam.endDate?.toISOString(),
      numberOfVersions: exam.numberOfVersions,
      questionsPerExam: exam.questionsPerExam,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleAnswers: exam.shuffleAnswers,
      negativeMarking: exam.negativeMarking,
      passingScore: exam.passingScore,
      instructions: exam.instructions,
      variants: exam.variants,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedExam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/exams/[id] - Update an exam
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      title,
      name, // Accept both title and name for compatibility
      description,
      termId,
      section,
      questionIds,
      timeLimit,
      startDate,
      endDate,
      numberOfVersions,
      questionsPerExam,
      shuffleQuestions,
      shuffleAnswers,
      negativeMarking,
      passingScore,
      instructions,
    } = await request.json();

    const examTitle = title || name; // Use title or name

    if (!examTitle) {
      return NextResponse.json(
        { error: "Title/name is required" },
        { status: 400 }
      );
    }

    if (!termId) {
      return NextResponse.json({ error: "Term is required" }, { status: 400 });
    }

    // Validate section format if provided
    if (section) {
      // Get the term name for validation
      const term = await prisma.term.findUnique({
        where: { id: termId },
        select: { term: true },
      });

      if (!term) {
        return NextResponse.json({ error: "Invalid term ID" }, { status: 400 });
      }

      const sectionValidation = validateSection(section, term.term);
      if (!sectionValidation.isValid) {
        return NextResponse.json(
          {
            error: sectionValidation.error,
            suggestions: sectionValidation.suggestions,
          },
          { status: 400 }
        );
      }
    }

    // First check if the exam exists
    const existingExam = await prisma.exam.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existingExam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(
      existingExam.courseId,
      "edit"
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: 403 }
      );
    }

    // Prepare question data for validation and detect exam format if questions are being updated
    let examQuestionsForValidation: Array<{ questionId: string; negativePoints?: number | null; points?: number }> | undefined;
    let detectedExamFormat: 'MCQ' | 'TrueFalse' | 'Mixed' | undefined;
    
    if (questionIds && Array.isArray(questionIds)) {
      // Get question details for validation including type
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: existingExam.courseId,
        },
        select: { id: true, points: true, negativePoints: true, type: true }
      });
      
      examQuestionsForValidation = questions.map(q => ({
        questionId: q.id,
        points: q.points,
        negativePoints: q.negativePoints
      }));

      // Detect exam format based on question types
      const questionTypes = questions.map(q => q.type);
      const uniqueTypes = Array.from(new Set(questionTypes));
      
      if (uniqueTypes.length === 1) {
        if (uniqueTypes[0] === 'TRUE_FALSE') {
          detectedExamFormat = 'TrueFalse';
        } else if (uniqueTypes[0] === 'MULTIPLE_CHOICE') {
          detectedExamFormat = 'MCQ';
        } else {
          detectedExamFormat = 'Mixed'; // Other single types default to Mixed
        }
      } else {
        detectedExamFormat = 'Mixed'; // Multiple question types
      }
      
      console.log("🎯 Detected exam format:", detectedExamFormat);
    }

    // Check course configuration constraints
    const validation = await validateExamAgainstCourseConfig({
      courseId: existingExam.courseId,
      negativeMarking,
      questionIds,
      examQuestions: examQuestionsForValidation,
      examFormat: detectedExamFormat,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: "Exam configuration violates course policy",
          violations: validation.violations,
          coursePolicy: validation.coursePolicy
        },
        { status: 400 }
      );
    }

    // If questionIds are provided, update the exam questions
    if (questionIds && Array.isArray(questionIds)) {
      // Verify questions exist and belong to the same course
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: existingExam.courseId,
        },
      });

      if (questions.length !== questionIds.length) {
        return NextResponse.json(
          { error: "Some questions not found or not accessible" },
          { status: 400 }
        );
      }

      // Remove existing exam questions
      await prisma.examQuestion.deleteMany({
        where: {
          examId: params.id,
        },
      });

      // Add new exam questions
      for (let i = 0; i < questionIds.length; i++) {
        const question = questions.find((q) => q.id === questionIds[i]);
        if (question) {
          await prisma.examQuestion.create({
            data: {
              examId: params.id,
              questionId: question.id,
              questionBankId: question.questionBankId,
              order: i,
              points: question.points,
              negativePoints: question.negativePoints ?? null,
            },
          });
        }
      }
    }

    // Calculate total points
    const examQuestions: any = await prisma.examQuestion.findMany({
      where: { examId: params.id },
      include: { question: true },
    });
    const totalPoints = examQuestions.reduce(
      (sum: number, eq: any) => sum + (eq.points || eq.question.points),
      0
    );

    // Check if any questions have negative marking to set the exam's negativeMarking flag
    const hasNegativeMarking = negativeMarking || examQuestions.some((eq: any) => 
      (eq.negativePoints !== null && eq.negativePoints !== undefined) || 
      (eq.question.negativePoints !== null && eq.question.negativePoints !== undefined)
    );

    // Update the exam
    const updatedExam = await prisma.exam.update({
      where: {
        id: params.id,
      },
      data: {
        title: examTitle,
        description: description || null,
        termId: termId,
        section: section || null,
        timeLimit: timeLimit || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        numberOfVersions: numberOfVersions || 1,
        questionsPerExam: questionsPerExam || examQuestions.length,
        shuffleQuestions: shuffleQuestions || false,
        shuffleAnswers: shuffleAnswers || false,
        negativeMarking: hasNegativeMarking,
        passingScore: passingScore || null,
        totalPoints,
        instructions: instructions || null,
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: "asc",
          },
        },
        _count: {
          select: {
            questions: true,
            results: true,
          },
        },
      },
    });

    // Log the activity
    await logActivity(
      session.user.id,
      existingExam.courseId,
      'UPDATED_EXAM',
      'exam',
      params.id,
      {
        title: updatedExam.title,
        description: updatedExam.description,
        totalPoints: updatedExam.totalPoints,
        questionCount: updatedExam._count.questions,
      }
    );

    // Transform response (same as GET)
    const transformedExam = {
      id: updatedExam.id,
      name: updatedExam.title,
      title: updatedExam.title,
      description: updatedExam.description,
      courseId: updatedExam.courseId,
      course: updatedExam.course,
      questions: updatedExam.questions.map((eq: any) => ({
        id: eq.question.id,
        text: eq.question.text,
        type: eq.question.type as QuestionType,
        options: eq.question.options ? JSON.parse(eq.question.options) : [],
        correctAnswer: eq.question.correctAnswer,
        points: eq.points || eq.question.points,
        negativePoints: eq.negativePoints ?? eq.question.negativePoints,
        courseId: eq.question.courseId,
        createdAt: updatedExam.createdAt.toISOString(),
        updatedAt: updatedExam.updatedAt.toISOString(),
      })),
      totalPoints: updatedExam.totalPoints,
      questionCount: updatedExam._count.questions,
      createdAt: updatedExam.createdAt.toISOString(),
    };

    return NextResponse.json(transformedExam);
  } catch (error) {
    console.error("Error updating exam:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/exams/[id] - Delete an exam
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First check if the exam exists
    const exam = await prisma.exam.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(
      exam.courseId,
      "edit"
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: 403 }
      );
    }

    // Delete the exam (exam questions will be deleted due to cascade)
    await prisma.exam.delete({
      where: {
        id: params.id,
      },
    });

    // Log the activity
    await logActivity(
      session.user.id,
      exam.courseId,
      'DELETED_EXAM',
      'exam',
      params.id,
      {
        title: exam.title,
        description: exam.description,
        totalPoints: exam.totalPoints,
      }
    );

    return NextResponse.json({ message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Error deleting exam:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
