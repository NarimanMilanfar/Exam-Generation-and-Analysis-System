import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import { validateCourseAccess } from "../../../../lib/coursePermissions";
import prisma from "../../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;

    // Fetch exam generation with related data
    const examGeneration = await prisma.examGeneration.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            course: true,
          },
        },
        variants: {
          select: {
            variantCode: true,
          },
        },
      },
    });

    if (!examGeneration) {
      return NextResponse.json(
        { error: "Exam generation not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this exam's course
    const { hasAccess } = await validateCourseAccess(
      examGeneration.exam.course.id
    );
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ROBUST FIX: Get results only for current variants (ignore deleted variants)
    const currentVariantCodes = examGeneration.variants.map((v) => v.variantCode);

    const examResults = await prisma.examResult.findMany({
      where: {
        examId: examGeneration.exam.id,
        variantCode: {
          in: currentVariantCodes,
        },
      },
      include: {
        student: true,
      },
    });

    // Calculate statistics
    const hasResults = examResults.length > 0;
    const studentsCount = examResults.length;

    let averageScore = 0;
    let completionRate = 0;

    if (hasResults) {
      const validResults = examResults.filter(
        (result) => result.percentage !== null
      );
      if (validResults.length > 0) {
        averageScore =
          validResults.reduce(
            (sum, result) => sum + (result.percentage || 0),
            0
          ) / validResults.length;
      }
      completionRate = 100; // Assuming all results mean completion
    }

    // Format the response
    const response = {
      id: examGeneration.id,
      examId: examGeneration.examId,
      examTitle: examGeneration.exam.title,
      generatedAt: examGeneration.generatedAt.toISOString(),
      variantsCount: examGeneration.numberOfVariants,
      hasResults,
      studentsCount,
      averageScore: hasResults ? Number(averageScore.toFixed(1)) : undefined,
      completionRate: hasResults
        ? Number(completionRate.toFixed(1))
        : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching exam generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
