import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

// GET /api/courses/[id]/export - Get comprehensive course data for export
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the course exists and belongs to the user
    const course = await prisma.course.findUnique({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Fetch comprehensive course data in parallel
    const [
      questionBanks,
      exams,
      students,
      examResults,
      examGenerations,
      examVariants,
    ] = await Promise.all([
      // Question banks with questions
      prisma.questionBank.findMany({
        where: { courseId: params.id },
        include: {
          questions: {
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { questions: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Exams with questions and question bank info
      prisma.exam.findMany({
        where: { courseId: params.id },
        include: {
          questions: {
            include: {
              question: true,
              questionBank: {
                select: {
                  id: true,
                  name: true,
                  topic: true,
                },
              },
            },
            orderBy: { order: "asc" },
          },
          term: true,
          _count: {
            select: {
              questions: true,
              results: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Students (course enrollments)
      prisma.courseEnrollment.findMany({
        where: { courseId: params.id },
        include: {
          student: true,
          term: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      // Exam results
      prisma.examResult.findMany({
        where: {
          exam: { courseId: params.id },
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
            },
          },
          student: true,
          term: true,
        },
        orderBy: { createdAt: "desc" },
      }),

      // Exam generations
      prisma.examGeneration.findMany({
        where: {
          exam: { courseId: params.id },
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { generatedAt: "desc" },
      }),

      // Exam variants
      prisma.examVariant.findMany({
        where: {
          exam: { courseId: params.id },
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
            },
          },
          generation: {
            select: {
              id: true,
              numberOfVariants: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Transform question banks data
    const transformedQuestionBanks = questionBanks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      description: bank.description,
      topic: bank.topic,
      color: bank.color,
      courseId: bank.courseId,
      questionCount: bank._count.questions,
      totalPoints: bank.questions.reduce((sum, q) => sum + q.points, 0),
      averageQuestionPoints:
        bank.questions.length > 0
          ? bank.questions.reduce((sum, q) => sum + q.points, 0) /
            bank.questions.length
          : 0,
      questions: bank.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type,
        options: question.options ? JSON.parse(question.options) : [],
        correctAnswer: question.correctAnswer,
        points: question.points,
        difficulty: question.difficulty,
        topic: question.topic,
        questionBankId: question.questionBankId,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
      createdAt: bank.createdAt.toISOString(),
      updatedAt: bank.updatedAt.toISOString(),
    }));

    // Transform exams data
    const transformedExams = exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      termId: exam.termId,
      term: exam.term,
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
      totalPoints: exam.totalPoints,
      instructions: exam.instructions,
      questionCount: exam._count.questions,
      resultCount: exam._count.results,
      questions: exam.questions.map((eq) => ({
        id: eq.id,
        examId: eq.examId,
        questionId: eq.questionId,
        questionBankId: eq.questionBankId,
        order: eq.order,
        points: eq.points,
        question: {
          id: eq.question.id,
          text: eq.question.text,
          type: eq.question.type,
          options: eq.question.options ? JSON.parse(eq.question.options) : [],
          correctAnswer: eq.question.correctAnswer,
          points: eq.question.points,
          difficulty: eq.question.difficulty,
          topic: eq.question.topic,
        },
        questionBank: eq.questionBank,
        createdAt: eq.createdAt.toISOString(),
      })),
      createdAt: exam.createdAt.toISOString(),
      updatedAt: exam.updatedAt.toISOString(),
    }));

    // Transform students data
    const transformedStudents = students.map((enrollment) => ({
      id: enrollment.id,
      studentId: enrollment.studentId,
      courseId: enrollment.courseId,
      termId: enrollment.termId,
      enrolledAt: enrollment.createdAt.toISOString(),
      student: {
        id: enrollment.student.id,
        name: enrollment.student.name,
        studentId: enrollment.student.studentId,
        createdAt: enrollment.student.createdAt.toISOString(),
      },
      term: {
        id: enrollment.term.id,
        term: enrollment.term.term,
        year: enrollment.term.year,
      },
    }));

    // Transform exam results data
    const transformedExamResults = examResults.map((result) => ({
      id: result.id,
      examId: result.examId,
      studentId: result.studentId,
      termId: result.termId,
      score: result.score,
      totalPoints: result.totalPoints,
      percentage: result.percentage,
      variantCode: result.variantCode,
      exam: result.exam,
      student: {
        id: result.student.id,
        name: result.student.name,
        studentId: result.student.studentId,
      },
      term: {
        id: result.term.id,
        term: result.term.term,
        year: result.term.year,
      },
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    }));

    // Transform exam generations data
    const transformedExamGenerations = examGenerations.map((generation) => ({
      id: generation.id,
      examId: generation.examId,
      numberOfVariants: generation.numberOfVariants,
      randomizeQuestionOrder: generation.randomizeQuestionOrder,
      randomizeOptionOrder: generation.randomizeOptionOrder,
      randomizeTrueFalse: generation.randomizeTrueFalse,
      status: generation.status,
      exam: generation.exam,
      generatedAt: generation.generatedAt.toISOString(),
      completedAt: generation.completedAt?.toISOString(),
      createdAt: generation.createdAt.toISOString(),
      updatedAt: generation.updatedAt.toISOString(),
    }));

    // Transform exam variants data
    const transformedExamVariants = examVariants.map((variant) => ({
      id: variant.id,
      examId: variant.examId,
      generationId: variant.generationId,
      variantNumber: variant.variantNumber,
      variantCode: variant.variantCode,
      questionOrder: variant.questionOrder,
      answerOrder: variant.answerOrder,
      answerKey: variant.answerKey,
      exam: variant.exam,
      generation: variant.generation,
      createdAt: variant.createdAt.toISOString(),
      updatedAt: variant.updatedAt.toISOString(),
    }));

    // Calculate analytics
    const analytics = {
      overview: {
        totalQuestions: transformedQuestionBanks.reduce(
          (sum, bank) => sum + bank.questionCount,
          0
        ),
        totalExams: transformedExams.length,
        totalQuestionBanks: transformedQuestionBanks.length,
        totalStudents: transformedStudents.length,
        totalExamResults: transformedExamResults.length,
      },
      examResults: {
        totalResults: transformedExamResults.length,
        averageScore:
          transformedExamResults.length > 0
            ? transformedExamResults.reduce(
                (sum, result) => sum + result.score,
                0
              ) / transformedExamResults.length
            : 0,
        averagePercentage:
          transformedExamResults.length > 0
            ? transformedExamResults.reduce(
                (sum, result) => sum + (result.percentage || 0),
                0
              ) / transformedExamResults.length
            : 0,
        completionRate:
          transformedStudents.length > 0
            ? (transformedExamResults.length / transformedStudents.length) * 100
            : 0,
      },
      questionBanks: transformedQuestionBanks.map((bank) => ({
        id: bank.id,
        name: bank.name,
        questionCount: bank.questionCount,
        totalPoints: bank.totalPoints,
        averageQuestionPoints: bank.averageQuestionPoints,
        difficultyDistribution: bank.questions.reduce((dist, q) => {
          const difficulty = q.difficulty || "UNKNOWN";
          dist[difficulty] = (dist[difficulty] || 0) + 1;
          return dist;
        }, {} as Record<string, number>),
      })),
      exams: transformedExams.map((exam) => ({
        id: exam.id,
        title: exam.title,
        questionCount: exam.questionCount,
        resultCount: exam.resultCount,
        averageScore:
          transformedExamResults
            .filter((r) => r.examId === exam.id)
            .reduce((sum, result) => sum + result.score, 0) /
          Math.max(
            transformedExamResults.filter((r) => r.examId === exam.id).length,
            1
          ),
        completionRate:
          transformedStudents.length > 0
            ? (transformedExamResults.filter((r) => r.examId === exam.id)
                .length /
                transformedStudents.length) *
              100
            : 0,
      })),
    };

    // Build response
    const courseData = {
      course: {
        id: course.id,
        name: course.name,
        description: course.description,
        color: course.color,
        instructor: course.user,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      },
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.id,
        version: "1.0",
        format: "comprehensive",
      },
      questionBanks: transformedQuestionBanks,
      exams: transformedExams,
      students: transformedStudents,
      examResults: transformedExamResults,
      examGenerations: transformedExamGenerations,
      examVariants: transformedExamVariants,
      analytics,
    };

    return NextResponse.json(courseData);
  } catch (error) {
    console.error("Error exporting course data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
