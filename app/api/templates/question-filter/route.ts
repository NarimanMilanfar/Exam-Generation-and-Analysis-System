import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

// GET /api/templates/question-filters?courseId=xxx&questionBankId=xxx
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameter
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    const questionBankId = searchParams.get("questionBankId");

    if (!courseId) {
      return NextResponse.json(
        { error: "courseId is required" },
        { status: 400 }
      );
    }

    // Obtain all the Question Banks under the current course
    const questionBanks = await prisma.questionBank.findMany({
      where: {
        courseId,
        userId: session.user.id,
      },
      select: {
        id: true,
        name: true,
        description: true,
        color: true,
      },
      orderBy: { name: "asc" },
    });

    // Build question query conditions (based on whether a question bank is specified for filtering)
    const questionWhere = questionBankId
      ? {
          questionBankId,
          questionBank: { courseId },
        }
      : {
          questionBank: { courseId },
        };

    const difficulties = await prisma.question.findMany({
      where: questionWhere,
      select: { difficulty: true },
      distinct: ["difficulty"],
    });
    const uniqueDifficulties = difficulties
      .map((d) => d.difficulty)
      .filter(Boolean) as string[];

    // topic
    const topics = await prisma.question.findMany({
      where: questionWhere,
      select: { topic: true },
      distinct: ["topic"],
    });
    const uniqueTopics = topics.map((t) => t.topic).filter(Boolean) as string[];

    // Get the score list (de-duplicated)
    const points = await prisma.question.findMany({
      where: questionWhere,
      select: { points: true },
      distinct: ["points"],
    });

    const pointValues = points.map((p) => p.points);
    const uniquePoints: number[] = [];
    pointValues.forEach((p) => {
      if (!uniquePoints.includes(p)) {
        uniquePoints.push(p);
      }
    });
    uniquePoints.sort((a, b) => a - b);

    return NextResponse.json({
      questionBanks,
      difficulties: uniqueDifficulties,
      topics: uniqueTopics,
      points: uniquePoints,
    });
  } catch (error) {
    console.error("Error fetching question filters:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
