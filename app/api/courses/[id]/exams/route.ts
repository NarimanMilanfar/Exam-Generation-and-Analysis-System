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

    // Only allow teachers/professors to access exams
    if (session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if user has access to the course
    const { hasAccess, error } = await validateCourseAccess(params.id);
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const exams = await prisma.exam.findMany({
      where: {
        courseId: params.id,
      },
      include: {
        term: true, 
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
    const transformedExams = exams.map((exam: any) => ({
      id: exam.id,
      title: exam.title,
      description: exam.description || "",
      isPublished: exam.isPublished,
      timeLimit: exam.timeLimit || 0,
      questionCount: exam._count.questions,
      createdAt: exam.createdAt.toISOString(),
      term: exam.term
        ? { term: exam.term.term, year: exam.term.year }
        : null,
      section: exam.section,
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
