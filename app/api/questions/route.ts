import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { QuestionType } from "../../types/course";
import { validateCourseAccess } from "../../../lib/coursePermissions";
import { logActivity } from "../../../lib/activityLogger";

// GET /api/questions - Get all questions
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all courses the user has access to (owned + collaborated)
    const [ownedCourses, collaboratedCourses] = await Promise.all([
      prisma.course.findMany({
        where: { userId: session.user.id },
        select: { id: true }
      }),
      prisma.course.findMany({
        where: {
          collaborators: {
            some: { userId: session.user.id }
          }
        },
        select: { id: true }
      })
    ]);

    const accessibleCourseIds = [
      ...ownedCourses.map(c => c.id),
      ...collaboratedCourses.map(c => c.id)
    ];

    const questions = await prisma.question.findMany({
      where: {
        courseId: {
          in: accessibleCourseIds
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform questions to ensure options are parsed correctly and type is cast to enum
    const transformedQuestions = questions.map((question) => ({
      ...question,
      type: question.type as QuestionType,
      options: question.options
        ? typeof question.options === "string"
          ? JSON.parse(question.options)
          : question.options
        : [],
    }));

    return NextResponse.json(transformedQuestions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/questions - Create a new question
export async function POST(request: Request) {
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
      courseId,
      questionBankId,
      type = "MULTIPLE_CHOICE",
      points = 1,
      difficulty,
      topic,
      negativePoints, 
    } = body;

    if (!questionBankId) {
      return NextResponse.json(
        { error: "Question bank ID is required" },
        { status: 400 }
      );
    }

    // Verify that the question bank exists and user has edit access to the course
    const questionBank = await prisma.questionBank.findUnique({
      where: { id: questionBankId },
      select: { id: true, courseId: true }
    });

    if (!questionBank) {
      return NextResponse.json(
        { error: "Question bank not found" },
        { status: 400 }
      );
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(questionBank.courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: 403 });
    }

    const question = await prisma.question.create({
      data: {
        text,
        options: JSON.stringify(options),
        correctAnswer,
        type,
        points,
        difficulty: difficulty || "MEDIUM",
        topic: topic || null,
        courseId,
        questionBankId,
        negativePoints: negativePoints ?? null, 
      },
    });

    // Activity Logging: Record this action for audit trail and collaboration tracking
    // This appears in the course Activity tab so collaborators can see what happened
    await logActivity(
      session.user.id,          // Who performed the action
      questionBank.courseId,    // Which course this affects
      'CREATED_QUESTION',       // What action was performed  
      'question',               // What type of resource
      question.id,              // The specific resource ID
      {                         // Additional context details
        text: question.text,
        type: question.type,
        points: question.points,
        questionBankId: questionBankId,
      }
    );

    return NextResponse.json(question);
  } catch (error) {
    console.error("Error creating question:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
