import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { validateSection } from "../../lib/sectionUtils";
import { validateCourseAccess } from "../../../lib/coursePermissions";
import { logActivity } from "../../../lib/activityLogger";
import { validateExamAgainstCourseConfig } from "../../lib/courseConfigValidation";

// GET /api/exams - Get all exams for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    let whereClause: any = {};

    if (courseId) {
      // Check if user has access to the specific course
      const { hasAccess } = await validateCourseAccess(courseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to course" },
          { status: 403 }
        );
      }
      whereClause.courseId = courseId;
    } else {
      // Get all courses the user has access to
      const [ownedCourses, collaboratedCourses] = await Promise.all([
        prisma.course.findMany({
          where: { userId: session.user.id },
          select: { id: true },
        }),
        prisma.course.findMany({
          where: {
            collaborators: {
              some: { userId: session.user.id },
            },
          },
          select: { id: true },
        }),
      ]);

      const accessibleCourseIds = [
        ...ownedCourses.map((c) => c.id),
        ...collaboratedCourses.map((c) => c.id),
      ];

      if (accessibleCourseIds.length === 0) {
        return NextResponse.json([]);
      }

      whereClause.courseId = {
        in: accessibleCourseIds,
      };
    }

    const exams = await prisma.exam.findMany({
      where: whereClause,
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
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                points: true,
                negativePoints:true,
                difficulty: true,
                topic: true,
              },
            },
            questionBank: {
              select: {
                id: true,
                name: true,
                topic: true,
              },
            },
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to match the frontend interface
    const transformedExams = exams.map((exam) => ({
      id: exam.id,
      name: exam.title, // Map title to name for compatibility
      title: exam.title,
      description: exam.description,
      courseId: exam.courseId,
      course: exam.course,
      questions: exam.questions.map((eq) => ({
        id: eq.id,
        examId: eq.examId,
        questionId: eq.questionId,
        question: eq.question,
        questionBankId: eq.questionBankId,
        questionBank: eq.questionBank,
        order: eq.order,
        points: eq.points || eq.question.points,
        negativePoints: eq.negativePoints ?? eq.question.negativePoints,
      })),
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
      totalPoints:
        exam.totalPoints ||
        exam.questions.reduce(
          (sum, eq) => sum + (eq.points || eq.question.points),
          0
        ),
      instructions: exam.instructions,
      questionCount: exam._count.questions,
      resultCount: exam._count.results,
      variants: exam.variants,
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    }));

    return NextResponse.json(transformedExams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/exams - Create a new exam
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    console.log("POST /api/exams - Request body:", body);

    const {
      title,
      description,
      courseId,
      termId,
      section,
      questionIds,
      questionBankIds,
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
    } = body;

    if (!title || !courseId || !termId) {
      console.log("Missing required fields:", { title, courseId, termId });
      return NextResponse.json(
        { error: "Title, courseId, and termId are required" },
        { status: 400 }
      );
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

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(courseId, "edit");
    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: 403 }
      );
    }

    // Prepare question data for validation and detect exam format
    let examQuestionsForValidation: Array<{ questionId: string; negativePoints?: number | null; points?: number }> | undefined;
    let detectedExamFormat: 'MCQ' | 'TrueFalse' | 'Mixed' | undefined;
    
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      // Get question details for validation including type
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: courseId,
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
    }

    // If using question banks, detect format from bank questions
    if (questionBankIds && Array.isArray(questionBankIds) && questionBankIds.length > 0) {
      const bankQuestions = await prisma.question.findMany({
        where: { 
          questionBankId: { in: questionBankIds },
          courseId: courseId 
        },
        select: { type: true }
      });
      
      const bankQuestionTypes = bankQuestions.map(q => q.type);
      const uniqueBankTypes = Array.from(new Set(bankQuestionTypes));
      
      if (uniqueBankTypes.length === 1) {
        if (uniqueBankTypes[0] === 'TRUE_FALSE') {
          detectedExamFormat = 'TrueFalse';
        } else if (uniqueBankTypes[0] === 'MULTIPLE_CHOICE') {
          detectedExamFormat = 'MCQ';
        } else {
          detectedExamFormat = 'Mixed';
        }
      } else {
        detectedExamFormat = 'Mixed';
      }
    }

    console.log("🎯 Detected exam format:", detectedExamFormat);

    // Check course configuration constraints
    const validation = await validateExamAgainstCourseConfig({
      courseId,
      negativeMarking,
      questionIds,
      questionBankIds,
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

    // If questionIds are provided, verify they exist
    let questionsToAdd: any[] = [];
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: courseId, // Ensure questions belong to the same course
        },
      });

      if (questions.length !== questionIds.length) {
        return NextResponse.json(
          { error: "Some questions not found or not accessible" },
          { status: 400 }
        );
      }

      questionsToAdd = questions.map((q, index) => ({
        questionId: q.id,
        questionBankId: q.questionBankId, // Include the questionBankId from the question
        order: index,
        points: q.points, // Use original question points unless overridden
        negativePoints: q.negativePoints ?? null,
      }));
    }

    // If questionBankIds are provided, get questions from those banks
    if (
      questionBankIds &&
      Array.isArray(questionBankIds) &&
      questionBankIds.length > 0
    ) {
      const questionBanks = await prisma.questionBank.findMany({
        where: {
          id: { in: questionBankIds },
          courseId: courseId,
        },
        include: {
          questions: true,
        },
      });

      if (questionBanks.length !== questionBankIds.length) {
        return NextResponse.json(
          { error: "Some question banks not found or not accessible" },
          { status: 400 }
        );
      }

      // Add questions from question banks
      const bankQuestions: any[] = [];
      questionBanks.forEach((bank) => {
        bank.questions.forEach((q, index) => {
          bankQuestions.push({
            questionId: q.id,
            questionBankId: bank.id,
            order: questionsToAdd.length + bankQuestions.length,
            points: q.points,
            negativePoints: q.negativePoints ?? null,
          });
        });
      });

      questionsToAdd = [...questionsToAdd, ...bankQuestions];
    }

    // Calculate total points
    const totalPoints = questionsToAdd.reduce((sum, q) => sum + q.points, 0);

    // Check if any questions have negative marking to set the exam's negativeMarking flag
    const hasNegativeMarking = negativeMarking || questionsToAdd.some(q => q.negativePoints !== null && q.negativePoints !== undefined);

    // Create the exam
    console.log("Creating exam with data:", {
      title,
      courseId,
      userId: session.user.id,
      questionsToAdd,
      hasNegativeMarking,
    });

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || null,
        courseId,
        userId: session.user.id,
        termId: termId,
        section: section || null,
        timeLimit: timeLimit || null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        totalPoints,
        questionsPerExam: questionsToAdd.length,
        negativeMarking: hasNegativeMarking,
        instructions: instructions || null,
      },
    });

    // Create ExamQuestion records separately
    for (const questionData of questionsToAdd) {
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: questionData.questionId,
          questionBankId: questionData.questionBankId,
          order: questionData.order,
          points: questionData.points,
          negativePoints: questionData.negativePoints ?? null,
        },
      });
    }

    // Log the activity
    await logActivity(
      session.user.id,
      courseId,
      'CREATED_EXAM',
      'exam',
      exam.id,
      {
        title: exam.title,
        description: exam.description,
        totalPoints: exam.totalPoints,
        questionCount: questionsToAdd.length,
      }
    );

    // Transform the response
    const transformedExam = {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      courseId: exam.courseId,
      questions: [], // Will be populated separately
      isPublished: exam.isPublished,
      timeLimit: exam.timeLimit,
      startDate: exam.startDate?.toISOString(),
      endDate: exam.endDate?.toISOString(),
      totalPoints: exam.totalPoints,
      instructions: exam.instructions,
      questionCount: questionsToAdd.length,
      resultCount: 0,
      variants: [],
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    };

    return NextResponse.json(transformedExam, { status: 201 });
  } catch (error) {
    console.error("Error creating exam:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
