
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";
import { analyzeExam } from "../../../../lib/biPointAnalysis";
import { getDataForBiPointAnalysis } from "../../../../lib/examAnalysisAdapter";
import prisma from "../../../../../lib/prisma";

interface ExamMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get analysis for an exam generation
 * @param request - The request object
 * @param params - The parameters object
 * @returns The analysis result
 */
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

    // Fetch exam generation to get exam ID
    const examGeneration = await prisma.examGeneration.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            course: true,
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
    const { hasAccess } = await validateCourseAccess(examGeneration.exam.course.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get data for bi-point analysis
    const examMetadata: ExamMetadata = {
      id: examGeneration.exam.id,
      title: examGeneration.exam.title,
      description: examGeneration.exam.description || "",
      createdAt: examGeneration.exam.createdAt,
      updatedAt: examGeneration.exam.updatedAt,
    };

    const { studentResponses, examVariants } = await getDataForBiPointAnalysis(
      examGeneration.examId,
      examMetadata,
      examGeneration.id
    );

    if (studentResponses.length === 0) {
      return NextResponse.json(
        {
          error:
            "No student results available for this exam generation. Please upload results first.",
        },
        { status: 400 }
      );
    }

    // Perform bi-point analysis
    const analysisResult = await analyzeExam(examVariants, studentResponses, {
      examTitle: examMetadata.title,
      minSampleSize: 1,
      includeDiscriminationIndex: true,
      includeDifficultyIndex: true,
      includePointBiserial: true,
      includeDistractorAnalysis: true,
      confidenceLevel: 0.95,
    });

    // Return the analysis result
    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("Error performing bi-point analysis:", error);
    return NextResponse.json(
      { error: `Failed to perform analysis: ${error}` },
      { status: 500 }
    );
  }
}
