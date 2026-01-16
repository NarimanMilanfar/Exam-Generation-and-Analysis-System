import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { generateExamVariations } from "../../../lib/examVariations";
import { QuestionType } from "../../../types/course";
import { validateCourseAccess } from "../../../../lib/coursePermissions";

// POST /api/exam-variants/regenerate - Regenerate answer keys for an exam generation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { generationId, examId } = body;

    if (!generationId || !examId) {
      return NextResponse.json(
        { error: "Generation ID and Exam ID are required" },
        { status: 400 }
      );
    }

    // Get exam and check course permissions
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            question: true,
          },
          orderBy: {
            order: "asc",
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(exam.courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Get the generation
    const generation = await prisma.examGeneration.findFirst({
      where: {
        id: generationId,
        examId: examId,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // CRITICAL: Prevent regenerating answer keys for completed exams
    if (generation.status === "COMPLETED") {
      return NextResponse.json(
        {
          error:
            "Cannot regenerate answer keys for completed exam generation. This would invalidate existing OMR results.",
        },
        { status: 403 }
      );
    }

    // Transform exam questions to the expected format
    const questions = exam.questions.map((eq) => ({
      id: eq.question.id,
      text: eq.question.text,
      type: eq.question.type as QuestionType,
      options: eq.question.options
        ? typeof eq.question.options === "string"
          ? JSON.parse(eq.question.options)
          : eq.question.options
        : null,
      correctAnswer: eq.question.correctAnswer,
      points: eq.question.points,
      negativePoints: eq.question.negativePoints ?? null,
      courseId: eq.question.courseId,
      createdAt: eq.question.createdAt.toISOString(),
      updatedAt: eq.question.updatedAt.toISOString(),
    }));

    // Generate variants using the same logic as the frontend
    const result = generateExamVariations(questions, {
      maxVariations: generation.numberOfVariants,
      randomizeQuestionOrder: generation.randomizeQuestionOrder,
      randomizeOptionOrder: generation.randomizeOptionOrder,
      randomizeTrueFalseOptions: generation.randomizeTrueFalse,
      seed: generation.id, // Use generation ID as seed for consistency
    });

    // Delete existing variants for this generation
    await prisma.examVariant.deleteMany({
      where: {
        generationId: generationId,
      },
    });

    // Save new variants with answer keys
    const savedVariants: any[] = [];
    for (let i = 0; i < result.variants.length; i++) {
      const variant = result.variants[i];

      // Create answer key with A/B/C/D format
      const answerKey = variant.questions.map((question, qIndex) => {
        let correctOption = question.correctAnswer;

        if (question.type === "TRUE_FALSE") {
          // Convert True/False to A/B format with null safety
          const options = question.options || ["True", "False"];
          const correctAnswer = question.correctAnswer || "";
          const correctIndex = options.findIndex(
            (opt) => opt.toLowerCase() === correctAnswer.toLowerCase()
          );
          // Fallback logic if still not found
          if (correctIndex === -1) {
            const normalizedAnswer = correctAnswer.toLowerCase().trim();
            if (normalizedAnswer === "true" || normalizedAnswer === "1") {
              correctOption = "A";
            } else if (
              normalizedAnswer === "false" ||
              normalizedAnswer === "0"
            ) {
              correctOption = "B";
            } else {
              correctOption = "A";
            }
          } else {
            correctOption = String.fromCharCode(65 + correctIndex);
          }
        } else if (question.type === "MULTIPLE_CHOICE") {
          // Find the correct option letter (A, B, C, D)
          const options = question.options || [];
          const correctIndex = options.findIndex(
            (opt) => opt === question.correctAnswer
          );
          correctOption =
            correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";
        }

        return {
          questionId: question.id,
          questionNumber: qIndex + 1,
          correctAnswer: correctOption,
          originalAnswer: question.correctAnswer,
        };
      });

      // Save variant to database
      const savedVariant = await prisma.examVariant.create({
        data: {
          generationId: generationId,
          examId: examId,
          variantNumber: i + 1,
          variantCode: `V${i + 1}`,
          answerKey: JSON.stringify(answerKey),
          questionOrder: JSON.stringify(variant.metadata.questionOrder),
          answerOrder: JSON.stringify(variant.metadata.optionPermutations),
        },
      });

      savedVariants.push(savedVariant);
    }

    return NextResponse.json({
      message: "Answer keys regenerated successfully",
      variantsCount: savedVariants.length,
      variants: savedVariants,
    });
  } catch (error) {
    console.error("Error regenerating answer keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
