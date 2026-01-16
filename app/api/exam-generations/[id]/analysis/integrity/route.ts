import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";
import { analyzeIntegrity } from "../../../../../../app/lib/biPointAnalysis";
import { ExamVariantForAnalysis, StudentResponse } from "../../../../../../app/types/analysis";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const generationId = params.id;

    // Fetch exam generation with variants
    const generation = await prisma.examGeneration.findUnique({
      where: { id: generationId },
      include: {
        exam: true,
        variants: true,
      },
    });

    if (!generation) {
      return NextResponse.json({ error: "Exam generation not found" }, { status: 404 });
    }

    // Fetch exam results for this generation with student information
    const examResults = await prisma.examResult.findMany({
      where: {
        examId: generation.examId,
      },
      include: {
        studentAnswers: true,
        student: true,
      },
    });

    if (examResults.length === 0) {
      return NextResponse.json({ error: "No student responses found" }, { status: 404 });
    }

    // Transform data for analysis
    const examVariants: ExamVariantForAnalysis[] = generation.variants.map(variant => ({
      id: variant.id,
      examId: variant.examId,
      variantCode: variant.variantCode,
      questions: [], // Questions are stored separately in ExamQuestion model
      metadata: {
        questionOrder: variant.questionOrder ? JSON.parse(variant.questionOrder) : [],
        optionPermutations: variant.answerOrder ? JSON.parse(variant.answerOrder) : {},
        answerKey: variant.answerKey || "[]",
      },
    }));

    const transformedStudentResponses: StudentResponse[] = examResults.map(response => {
      const studentDisplayId = response.student.studentId || response.student.name || response.studentId;
      const variantCode = response.variantCode || "unknown";

      return {
        studentId: `${studentDisplayId} (${variantCode})`,
        variantCode: variantCode,
        questionResponses: response.studentAnswers.map(qr => ({
          questionId: qr.questionId,
          studentAnswer: qr.studentAnswer,
          isCorrect: qr.isCorrect,
          points: qr.points,
          maxPoints: qr.points, // Assuming maxPoints equals points for now
          responseTime: 0, // Not stored in current schema
        })),
        totalScore: response.score,
        maxPossibleScore: response.totalPoints,
        completionTime: 0, // Not stored in current schema
        startedAt: response.createdAt,
        completedAt: response.updatedAt,
      };
    });

    // Perform integrity analysis
    const integrityResult = analyzeIntegrity(examVariants, transformedStudentResponses);

    return NextResponse.json(integrityResult);
  } catch (error) {
    console.error("Error in integrity analysis:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 