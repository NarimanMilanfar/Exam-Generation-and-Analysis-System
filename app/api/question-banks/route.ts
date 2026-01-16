import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { validateCourseAccess } from "../../../lib/coursePermissions";
import { logActivity } from "../../../lib/activityLogger";

// GET /api/question-banks - Get all question banks for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    let whereClause: any = {};

    if (courseId) {
      // Check if user has access to the specific course
      const { hasAccess } = await validateCourseAccess(courseId);
      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to course" }, { status: 403 });
      }
      whereClause.courseId = courseId;
    } else {
      // Get all courses the user has access to
      const [ownedCourses, collaboratedCourses] = await Promise.all([
        prisma.course.findMany({
          where: { userId: (session.user as any).id },
          select: { id: true }
        }),
        prisma.course.findMany({
          where: {
            collaborators: {
              some: { userId: (session.user as any).id }
            }
          },
          select: { id: true }
        })
      ]);

      const accessibleCourseIds = [
        ...ownedCourses.map(c => c.id),
        ...collaboratedCourses.map(c => c.id)
      ];

      if (accessibleCourseIds.length === 0) {
        return NextResponse.json([]);
      }

      whereClause.courseId = {
        in: accessibleCourseIds
      };
    }

    const questionBanks = await prisma.questionBank.findMany({
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
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to match the frontend interface
    const transformedBanks = questionBanks.map((bank) => ({
      id: bank.id,
      name: bank.name,
      description: bank.description,
      topic: bank.topic,
      color: (bank as any).color || "#3b82f6",
      courseId: bank.courseId,
      course: bank.course,
      questions: bank.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type,
        options: question.options ? JSON.parse(question.options) : [],
        correctAnswer: question.correctAnswer,
        points: question.points,
        negativePoints: question.negativePoints ?? null, 
        difficulty: question.difficulty,
        topic: question.topic,
        questionBankId: question.questionBankId,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
      totalPoints: bank.questions.reduce(
        (sum, question) => sum + question.points,
        0
      ),
      questionCount: bank._count.questions,
      createdAt: bank.createdAt.toISOString(),
    }));

    return NextResponse.json(transformedBanks);
  } catch (error) {
    console.error("Error fetching question banks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/question-banks - Create a new question bank
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any)?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, topic, color, courseId, questionIds } =
      await request.json();

    if (!name || !courseId) {
      return NextResponse.json(
        { error: "Name and courseId are required" },
        { status: 400 }
      );
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: 403 });
    }

    // If questionIds are provided, verify they exist and can be added
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
    }

    // Create the question bank
    const questionBank = await prisma.questionBank.create({
      data: {
        name,
        description: description || null,
        topic: topic || null,
        ...(color && { color }),
        courseId,
        userId: (session.user as any).id, // Keep for database constraint, but permissions are course-based
      } as any,
      include: {
        course: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        questions: {
          orderBy: {
            createdAt: "asc",
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    // Log the activity
    await logActivity(
      (session.user as any).id,
      courseId,
      'CREATED_QUESTION_BANK',
      'question_bank',
      questionBank.id,
      {
        name: questionBank.name,
        description: questionBank.description,
        topic: questionBank.topic,
      }
    );

    // If questionIds are provided, assign them to the question bank
    if (questionIds && Array.isArray(questionIds) && questionIds.length > 0) {
      await prisma.question.updateMany({
        where: {
          id: { in: questionIds },
        },
        data: {
          questionBankId: questionBank.id,
        },
      });

      // Fetch the updated question bank with questions
      const updatedQuestionBank = await prisma.questionBank.findUnique({
        where: { id: questionBank.id },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          questions: {
            orderBy: {
              createdAt: "asc",
            },
          },
          _count: {
            select: {
              questions: true,
            },
          },
        },
      });

      if (updatedQuestionBank) {
        const transformedBank = {
          id: updatedQuestionBank.id,
          name: updatedQuestionBank.name,
          description: updatedQuestionBank.description,
          topic: updatedQuestionBank.topic,
          courseId: updatedQuestionBank.courseId,
          course: updatedQuestionBank.course,
          questions: updatedQuestionBank.questions.map((question) => ({
            id: question.id,
            text: question.text,
            type: question.type,
            options: question.options ? JSON.parse(question.options) : [],
            correctAnswer: question.correctAnswer,
            points: question.points,
            negativePoints: question.negativePoints ?? null, 
            difficulty: question.difficulty,
            topic: question.topic,
            questionBankId: question.questionBankId,
            createdAt: question.createdAt.toISOString(),
            updatedAt: question.updatedAt.toISOString(),
          })),
          totalPoints: updatedQuestionBank.questions.reduce(
            (sum, question) => sum + question.points,
            0
          ),
          questionCount: updatedQuestionBank._count.questions,
          createdAt: updatedQuestionBank.createdAt.toISOString(),
        };

        return NextResponse.json(transformedBank, { status: 201 });
      }
    }

    // Transform the response for new question bank without questions
    const transformedBank = {
      id: questionBank.id,
      name: questionBank.name,
      description: questionBank.description,
      topic: questionBank.topic,
      color: (questionBank as any).color || "#3b82f6",
      courseId: questionBank.courseId,
      course: questionBank.course,
      questions: [],
      totalPoints: 0,
      questionCount: 0,
      createdAt: questionBank.createdAt.toISOString(),
    };

    return NextResponse.json(transformedBank, { status: 201 });
  } catch (error) {
    console.error("Error creating question bank:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
