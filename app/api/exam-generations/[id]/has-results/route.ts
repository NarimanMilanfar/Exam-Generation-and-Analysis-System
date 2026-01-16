// app/api/exam-generations/[id]/has-results/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "@/lib/prisma";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const generationId = params.id;

    const generation = await prisma.examGeneration.findUnique({
      where: { id: generationId },
      include: {
        exam: {
          select: { id: true, courseId: true },
        },
        variants: {
          select: { variantCode: true },
        },
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Exam generation not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the course
    const { hasAccess } = await validateCourseAccess(generation.exam.courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // ROBUST FIX: Check if ANY current variants have results (ignore deleted variants)
    const currentVariantCodes = generation.variants.map((v) => v.variantCode);
    
    if (currentVariantCodes.length === 0) {
      return NextResponse.json({ hasResults: false });
    }
    
    // Check if ANY of the remaining variants have results
    const resultCount = await prisma.examResult.count({
      where: {
        examId: generation.exam.id,
        variantCode: { in: currentVariantCodes },
      },
    });

    return NextResponse.json({
      hasResults: resultCount > 0,
    });
  } catch (error) {
    console.error("Error checking results:", error);
    return NextResponse.json(
      { error: "Failed to check results status" },
      { status: 500 }
    );
  }
}
