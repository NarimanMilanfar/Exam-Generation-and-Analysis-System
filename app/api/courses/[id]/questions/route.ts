import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to the course
    const { hasAccess, error } = await validateCourseAccess(params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const questions = await prisma.question.findMany({
      where: {
        courseId: params.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform questions to ensure options are parsed correctly
    const transformedQuestions = questions.map((question) => ({
      ...question,
      options: question.options
        ? typeof question.options === "string"
          ? JSON.parse(question.options)
          : question.options
        : [],
      negativePoints: question.negativePoints ?? null,
    }));

    return NextResponse.json(transformedQuestions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
