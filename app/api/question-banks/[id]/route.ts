import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { QuestionType } from "../../../types/course";
import { validateCourseAccess } from "../../../../lib/coursePermissions";
import { logActivity } from "../../../../lib/activityLogger";

// GET /api/question-banks/[id] - Get a specific question bank
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questionBank = await prisma.questionBank.findUnique({
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

    if (!questionBank) {
      return NextResponse.json(
        { error: "Question bank not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the course
    const { hasAccess } = await validateCourseAccess(questionBank.courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Transform the data to match the frontend interface
    const transformedBank = {
      id: questionBank.id,
      name: questionBank.name,
      description: questionBank.description,
      topic: questionBank.topic,
      color: (questionBank as any).color || "#3b82f6",
      courseId: questionBank.courseId,
      course: questionBank.course,
      questions: questionBank.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type as QuestionType,
        options: question.options ? JSON.parse(question.options) : [],
        correctAnswer: question.correctAnswer,
        points: question.points,
        negativePoints: question.negativePoints ?? null, 
        difficulty: question.difficulty,
        topic: question.topic,
        courseId: question.courseId,
        questionBankId: question.questionBankId,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
      totalPoints: questionBank.questions.reduce(
        (sum, question) => sum + question.points,
        0
      ),
      questionCount: questionBank._count.questions,
      createdAt: questionBank.createdAt.toISOString(),
    };

    return NextResponse.json(transformedBank);
  } catch (error) {
    console.error("Error fetching question bank:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/question-banks/[id] - Update a question bank
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, topic, color, questionIds } =
      await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // First check if the question bank exists
    const existingBank = await prisma.questionBank.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existingBank) {
      return NextResponse.json(
        { error: "Question bank not found" },
        { status: 404 }
      );
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(existingBank.courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: 403 });
    }

    // If questionIds are provided, verify they exist and can be assigned
    if (questionIds && Array.isArray(questionIds)) {
      const questions = await prisma.question.findMany({
        where: {
          id: { in: questionIds },
          courseId: existingBank.courseId, // Ensure questions belong to the same course
        },
      });

      if (questions.length !== questionIds.length) {
        return NextResponse.json(
          { error: "Some questions not found or not accessible" },
          { status: 400 }
        );
      }
    }

    // Update the question bank
    const updatedBank = await prisma.questionBank.update({
      where: {
        id: params.id,
      },
      data: {
        name,
        description: description || null,
        topic: topic || null,
        ...(color && { color }),
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
      session.user.id,
      existingBank.courseId,
      'UPDATED_QUESTION_BANK',
      'question_bank',
      params.id,
      {
        name: updatedBank.name,
        description: updatedBank.description,
        topic: updatedBank.topic,
      }
    );

    // If questionIds are provided, update question assignments
    if (questionIds && Array.isArray(questionIds)) {
      // Note: We can't unassign questions since questionBankId is required
      // Questions will be reassigned to other banks or need to be deleted

      // Then assign the new questions to this bank
      if (questionIds.length > 0) {
        await prisma.question.updateMany({
          where: {
            id: { in: questionIds },
          },
          data: {
            questionBankId: params.id,
          },
        });
      }

      // Fetch the updated question bank with new questions
      const finalBank = await prisma.questionBank.findUnique({
        where: { id: params.id },
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

      if (finalBank) {
        const transformedBank = {
          id: finalBank.id,
          name: finalBank.name,
          description: finalBank.description,
          topic: finalBank.topic,
          color: (finalBank as any).color || "#3b82f6",
          courseId: finalBank.courseId,
          course: finalBank.course,
          questions: finalBank.questions.map((question) => ({
            id: question.id,
            text: question.text,
            type: question.type as QuestionType,
            options: question.options ? JSON.parse(question.options) : [],
            correctAnswer: question.correctAnswer,
            points: question.points,
            negativePoints: question.negativePoints ?? null, 
            difficulty: question.difficulty,
            topic: question.topic,
            courseId: question.courseId,
            questionBankId: question.questionBankId,
            createdAt: question.createdAt.toISOString(),
            updatedAt: question.updatedAt.toISOString(),
          })),
          totalPoints: finalBank.questions.reduce(
            (sum, question) => sum + question.points,
            0
          ),
          questionCount: finalBank._count.questions,
          createdAt: finalBank.createdAt.toISOString(),
        };

        return NextResponse.json(transformedBank);
      }
    }

    // Transform the response for basic update
    const transformedBank = {
      id: updatedBank.id,
      name: updatedBank.name,
      description: updatedBank.description,
      topic: updatedBank.topic,
      color: (updatedBank as any).color || "#3b82f6",
      courseId: updatedBank.courseId,
      course: updatedBank.course,
      questions: updatedBank.questions.map((question) => ({
        id: question.id,
        text: question.text,
        type: question.type as QuestionType,
        options: question.options ? JSON.parse(question.options) : [],
        correctAnswer: question.correctAnswer,
        points: question.points,
        negativePoints: question.negativePoints ?? null, 
        difficulty: question.difficulty,
        topic: question.topic,
        courseId: question.courseId,
        questionBankId: question.questionBankId,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      })),
      totalPoints: updatedBank.questions.reduce(
        (sum, question) => sum + question.points,
        0
      ),
      questionCount: updatedBank._count.questions,
      createdAt: updatedBank.createdAt.toISOString(),
    };

    return NextResponse.json(transformedBank);
  } catch (error) {
    console.error("Error updating question bank:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/question-banks/[id] - Delete a question bank
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First check if the question bank exists
    const questionBank = await prisma.questionBank.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!questionBank) {
      return NextResponse.json(
        { error: "Question bank not found" },
        { status: 404 }
      );
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(questionBank.courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: 403 });
    }

    // Delete all questions in this bank since questionBankId is required
    await prisma.question.deleteMany({
      where: {
        questionBankId: params.id,
      },
    });

    // Delete the question bank
    await prisma.questionBank.delete({
      where: {
        id: params.id,
      },
    });

    // Log the activity
    await logActivity(
      session.user.id,
      questionBank.courseId,
      'DELETED_QUESTION_BANK',
      'question_bank',
      params.id,
      {
        name: questionBank.name,
        description: questionBank.description,
        topic: questionBank.topic,
      }
    );

    return NextResponse.json({ message: "Question bank deleted successfully" });
  } catch (error) {
    console.error("Error deleting question bank:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
