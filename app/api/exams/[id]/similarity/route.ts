import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { 
  generateExamVariations, 
  recreateVariant, 
  ExamVariationConfig 
} from "../../../../lib/examVariations";
import { QuestionType } from "../../../../types/course";

// Similarity analysis thresholds
const SIMILARITY_THRESHOLDS = {
  HIGH_SIMILARITY: 0.8,           // Combined similarity threshold for warnings
  HIGH_QUESTION_SIMILARITY: 0.9,  // Question order similarity threshold
  HIGH_OPTION_SIMILARITY: 0.9,    // Option order similarity threshold
} as const;

interface SimilarityAnalysis {
  examId: string;
  examTitle: string;
  generationId?: string;
  totalVariants: number;
  questionSimilarity: {
    questionId: string;
    questionText: string;
    positionSimilarity: number; // 0-1, where 1 means always in same position
    averagePosition: number;
    positionVariance: number;
    positions: number[]; // Position in each variant
  }[];
  optionSimilarity: {
    questionId: string;
    questionText: string;
    optionSimilarity: number; // 0-1, where 1 means options always in same order
    averagePermutation: number[];
    permutationVariance: number;
    permutations: number[][]; // Permutation in each variant
  }[];
  overallSimilarity: {
    questionOrderSimilarity: number; // 0-1, where 1 means identical order
    optionOrderSimilarity: number; // 0-1, where 1 means identical option orders
    combinedSimilarity: number; // Overall similarity score
  };
  flags: {
    type: "HIGH_SIMILARITY" | "LOW_RANDOMIZATION" | "IDENTICAL_VARIANTS";
    severity: "WARNING" | "ERROR";
    message: string;
    details: string;
  }[];
  recommendations: string[];
}

// GET /api/exams/[id]/similarity - Analyze similarity in exam variants
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("generationId");

    // Verify the exam exists and belongs to the user
    const exam = await prisma.exam.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
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

    // Get the generation details if specified
    let generation;
    if (generationId) {
      generation = await prisma.examGeneration.findFirst({
        where: {
          id: generationId,
          examId: params.id,
        },
      });
    } else {
      // Get the most recent generation
      generation = await prisma.examGeneration.findFirst({
        where: {
          examId: params.id,
        },
        orderBy: {
          generatedAt: "desc",
        },
      });
    }

    if (!generation) {
      return NextResponse.json(
        { error: "No exam generation found" },
        { status: 404 }
      );
    }

    // Convert exam questions to the format expected by examVariations
    const questions = exam.questions.map((eq) => ({
      id: eq.question.id,
      text: eq.question.text,
      type: eq.question.type as QuestionType,
      options: eq.question.options ? JSON.parse(eq.question.options) : [],
      correctAnswer: eq.question.correctAnswer,
      points: eq.question.points,
      courseId: eq.question.courseId,
      createdAt: eq.question.createdAt.toISOString(),
      updatedAt: eq.question.updatedAt.toISOString(),
    }));

    // Generate variants using the same configuration as the original generation
    // CRITICAL: Use the same seed format as the variations page to ensure identical ordering
    const config: ExamVariationConfig = {
      randomizeQuestionOrder: generation.randomizeQuestionOrder,
      randomizeOptionOrder: generation.randomizeOptionOrder,
      randomizeTrueFalseOptions: generation.randomizeTrueFalse,
      maxVariations: generation.numberOfVariants,
      seed: generation.id, // Use generation ID directly, same as variations page
    };

    const variationResult = generateExamVariations(questions, config);
    const variants = variationResult.variants;

    // Analyze question position similarity
    const questionSimilarity = questions.map((question, originalIndex) => {
      const positions = variants.map((variant) => {
        const questionIndex = variant.questions.findIndex(
          (q) => q.id === question.id
        );
        return questionIndex;
      });

      const averagePosition = positions.reduce((sum, pos) => sum + pos, 0) / positions.length;
      const positionVariance = positions.reduce(
        (sum, pos) => sum + Math.pow(pos - averagePosition, 2),
        0
      ) / positions.length;

      // Calculate similarity (0-1, where 1 means always in same position)
      const positionSimilarity = positionVariance === 0 ? 1 : 1 / (1 + positionVariance);

      return {
        questionId: question.id,
        questionText: question.text.substring(0, 100), // Truncate for display
        positionSimilarity,
        averagePosition,
        positionVariance,
        positions,
      };
    });

    // Analyze option order similarity
    // Include TRUE_FALSE questions even if they don't have options in DB, 
    // since they get default options during variant generation
    const optionSimilarity = questions
      .filter((q) => 
        q.type === 'TRUE_FALSE' || 
        (q.options && q.options.length > 1)
      )
      .map((question) => {
        const permutations = variants.map((variant) => {
          const variantQuestion = variant.questions.find((q) => q.id === question.id);
          if (!variantQuestion || !variantQuestion.options) {
            return [];
          }

          // Calculate permutation indices
          // Handle TRUE_FALSE questions specially since they might not have options in original DB
          let originalOptions = question.options;
          
          if (question.type === 'TRUE_FALSE' && (!originalOptions || originalOptions.length === 0)) {
            // Use default TRUE_FALSE options for comparison
            originalOptions = ['True', 'False'];
          }
          
          const variantOptions = variantQuestion.options;
          return variantOptions.map((option) => originalOptions.indexOf(option));
        });

        // Calculate average permutation
        const averagePermutation = permutations[0]?.map((_, index) => {
          const sum = permutations.reduce((acc, perm) => acc + (perm[index] || 0), 0);
          return sum / permutations.length;
        }) || [];

        // Calculate permutation variance
        const permutationVariance = permutations.length > 0 ? 
          permutations.reduce((sum, perm) => {
            return sum + perm.reduce((innerSum, val, index) => {
              return innerSum + Math.pow(val - averagePermutation[index], 2);
            }, 0);
          }, 0) / (permutations.length * (averagePermutation.length || 1)) : 0;

        // Calculate similarity (0-1, where 1 means options always in same order)
        const optionSimilarity = permutationVariance === 0 ? 1 : 1 / (1 + permutationVariance);

        return {
          questionId: question.id,
          questionText: question.text.substring(0, 100),
          optionSimilarity,
          averagePermutation,
          permutationVariance,
          permutations,
        };
      });

    // Calculate overall similarity metrics
    const questionOrderSimilarity = questionSimilarity.reduce(
      (sum, q) => sum + q.positionSimilarity,
      0
    ) / questionSimilarity.length;

    const optionOrderSimilarity = optionSimilarity.length > 0 ? 
      optionSimilarity.reduce((sum, o) => sum + o.optionSimilarity, 0) / optionSimilarity.length : 0;

    const combinedSimilarity = (questionOrderSimilarity + optionOrderSimilarity) / 2;

    // Generate flags and recommendations
    const flags: SimilarityAnalysis["flags"] = [];
    const recommendations: string[] = [];

    if (combinedSimilarity > SIMILARITY_THRESHOLDS.HIGH_SIMILARITY) {
      flags.push({
        type: "HIGH_SIMILARITY",
        severity: "WARNING",
        message: "High similarity detected between exam variants",
        details: `Combined similarity score: ${(combinedSimilarity * 100).toFixed(1)}%`,
      });
      recommendations.push("Consider increasing randomization settings");
      recommendations.push("Review questions with high position similarity");
    }

    if (questionOrderSimilarity > SIMILARITY_THRESHOLDS.HIGH_QUESTION_SIMILARITY) {
      flags.push({
        type: "LOW_RANDOMIZATION",
        severity: "WARNING",
        message: "Questions appear in very similar positions across variants",
        details: `Question order similarity: ${(questionOrderSimilarity * 100).toFixed(1)}%`,
      });
      recommendations.push("Enable or increase question order randomization");
    }

    if (optionOrderSimilarity > SIMILARITY_THRESHOLDS.HIGH_OPTION_SIMILARITY) {
      flags.push({
        type: "LOW_RANDOMIZATION",
        severity: "WARNING",
        message: "Answer options appear in very similar orders across variants",
        details: `Option order similarity: ${(optionOrderSimilarity * 100).toFixed(1)}%`,
      });
      recommendations.push("Enable or increase answer option randomization");
    }

    // Check for identical variants and track which ones
    const identicalPairs: Array<{variant1: number, variant2: number}> = [];
    variants.forEach((variant, index) => {
      variants.slice(index + 1).forEach((otherVariant, otherIndex) => {
        const actualOtherIndex = index + 1 + otherIndex;
        
        // Compare question order
        const sameQuestionOrder = variant.metadata.questionOrder.join(",") === 
          otherVariant.metadata.questionOrder.join(",");
        
        // Compare option permutations
        const sameOptionOrder = Object.keys(variant.metadata.optionPermutations).every(questionId => {
          const perm1 = variant.metadata.optionPermutations[questionId]?.join(",") || "";
          const perm2 = otherVariant.metadata.optionPermutations[questionId]?.join(",") || "";
          return perm1 === perm2;
        });
        
        if (sameQuestionOrder && sameOptionOrder) {
          identicalPairs.push({
            variant1: index + 1,
            variant2: actualOtherIndex + 1
          });
        }
      });
    });

    if (identicalPairs.length > 0) {
      const pairDescriptions = identicalPairs.map(pair => 
        `Variant ${pair.variant1} and Variant ${pair.variant2}`
      ).join(", ");
      
      flags.push({
        type: "IDENTICAL_VARIANTS",
        severity: "ERROR",
        message: "Identical variants detected",
        details: `The following variants are completely identical: ${pairDescriptions}. These variants have the same question order and answer option arrangements.`,
      });
      recommendations.push("Increase the number of possible variations");
      recommendations.push("Review randomization settings");
      recommendations.push("Consider regenerating with different randomization options");
    }

    if (flags.length === 0) {
      recommendations.push("Exam variants show good randomization");
      recommendations.push("Continue with current randomization settings");
    }

    const analysis: SimilarityAnalysis = {
      examId: params.id,
      examTitle: exam.title,
      generationId: generation.id,
      totalVariants: variants.length,
      questionSimilarity,
      optionSimilarity,
      overallSimilarity: {
        questionOrderSimilarity,
        optionOrderSimilarity,
        combinedSimilarity,
      },
      flags,
      recommendations,
    };

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Error analyzing exam similarity:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 