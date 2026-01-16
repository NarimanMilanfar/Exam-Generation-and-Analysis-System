import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { validateCourseAccess } from "../../../../lib/coursePermissions";
import { logActivity } from "../../../../lib/activityLogger";

// PUT /api/questions/[id] - Update a question
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      text,
      options,
      correctAnswer,
      type,
      points,
      negativePoints, 
      difficulty,
      topic,
      courseId,
      questionBankId,
    } = body;

    // Get the existing question to check permissions
    const existingQuestion = await prisma.question.findUnique({
      where: { id: params.id },
      select: { id: true, courseId: true }
    });

    if (!existingQuestion) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(existingQuestion.courseId!, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: 403 });
    }

    const question = await prisma.question.update({
      where: {
        id: params.id,
      },
      data: {
        text,
        options: JSON.stringify(options),
        correctAnswer,
        type,
        points,
        negativePoints: negativePoints ?? null, 
        difficulty: difficulty || "MEDIUM",
        topic: topic || null,
        courseId: courseId || existingQuestion.courseId,
        questionBankId,
      },
    });

    // Log the activity
    await logActivity(
      session.user.id,
      existingQuestion.courseId!,
      'UPDATED_QUESTION',
      'question',
      question.id,
      {
        text: question.text,
        type: question.type,
        points: question.points,
      }
    );

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error updating question:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE /api/questions/[id] - Delete a question
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the question with its course information to check permissions
    const question = await prisma.question.findUnique({
      where: { id: params.id },
      select: { id: true, courseId: true, text: true, type: true, points: true }
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(question.courseId!, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: 403 });
    }

    await prisma.question.delete({
      where: {
        id: params.id,
      },
    });

    // Log the activity
    await logActivity(
      session.user.id,
      question.courseId!,
      'DELETED_QUESTION',
      'question',
      question.id,
      {
        text: question.text,
        type: question.type,
        points: question.points,
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting question:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
