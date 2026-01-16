import prisma from "../../lib/prisma";
import { QuestionType } from "../types/course";

interface ExamMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getDataForBiPointAnalysis(
  examId: string,
  examMetadata: ExamMetadata,
  generationId?: string
) {
  // Collect all data in parallel
  const [rawResults, examVariants] = await Promise.all([
    collectExamResults(examId, generationId),
    collectExamVariants(examId, generationId),
  ]);

  // Transform data for bi-point analysis
  const studentResponses = transformToStudentResponses(
    rawResults,
    examVariants
  );

  return {
    studentResponses,
    examVariants,
    examMetadata,
  };
}

async function collectExamResults(examId: string, generationId?: string) {
  if (generationId) {
    // First get the variant codes for this specific generation
    const variants = await prisma.examVariant.findMany({
      where: { generationId },
      select: { variantCode: true },
    });
    const variantCodes = variants.map(v => v.variantCode);
    
    if (variantCodes.length === 0) {
      return [];
    }
    
    // Filter results by variant codes from this generation
    return await prisma.examResult.findMany({
      where: { 
        examId,
        variantCode: { in: variantCodes }
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentId: true,
          },
        },
        studentAnswers: {
          select: {
            questionId: true,
            studentAnswer: true,
            isCorrect: true,
            points: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
  
  // Fallback: get all results for examId (backward compatibility)
  return await prisma.examResult.findMany({
    where: { examId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          studentId: true,
        },
      },
      studentAnswers: {
        select: {
          questionId: true,
          studentAnswer: true,
          isCorrect: true,
          points: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function collectExamVariants(examId: string, generationId?: string) {
  const examVariants = await prisma.examVariant.findMany({
    where: generationId ? { generationId } : { examId },
    select: {
      id: true,
      examId: true,
      variantCode: true,
      questionOrder: true,
      answerOrder: true,
      answerKey: true,
      generationId: true,
    },
    orderBy: { variantCode: "asc" },
  });

  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId },
    include: {
      question: {
        select: {
          id: true,
          text: true,
          type: true,
          correctAnswer: true,
          options: true,
          points: true,
        },
      },
    },
    orderBy: { order: "asc" },
  });

  return examVariants.map((variant) => {
    let questionOrder: number[] = [];
    let optionPermutations: { [questionId: string]: number[] } = {};

    if (variant.questionOrder) {
      try {
        questionOrder = JSON.parse(variant.questionOrder);
      } catch (error) {
        console.error(
          `Error parsing question order for variant ${variant.variantCode}:`,
          error
        );
      }
    }

    if (variant.answerOrder) {
      try {
        optionPermutations = JSON.parse(variant.answerOrder);
      } catch (error) {
        console.error(
          `Error parsing answer order for variant ${variant.variantCode}:`,
          error
        );
      }
    }

    // CRITICAL FIX: Reconstruct questions in the actual variant order
    let variantQuestions;
    if (questionOrder.length > 0) {
      // Use questionOrder to get questions in the order they appeared in this variant
      variantQuestions = questionOrder
        .map((originalIndex) => {
          const examQuestion = examQuestions[originalIndex];
          if (!examQuestion) {
            console.error(
              `Invalid question order index ${originalIndex} for variant ${variant.variantCode}`
            );
            return null;
          }

          let options: string[] = [];
          if (examQuestion.question.options) {
            try {
              options = JSON.parse(examQuestion.question.options);
            } catch (error) {
              if (examQuestion.question.type === "TRUE_FALSE") {
                options = ["True", "False"];
              }
            }
          } else if (examQuestion.question.type === "TRUE_FALSE") {
            options = ["True", "False"];
          }

          // Apply option permutation if it exists for this question
          if (optionPermutations[examQuestion.question.id]) {
            const permutation = optionPermutations[examQuestion.question.id];
            const originalOptions = [...options];
            options = permutation.map(
              (index) => originalOptions[index] || originalOptions[0]
            );

            // Also need to adjust the correct answer based on option permutation
            const originalCorrectIndex = originalOptions.findIndex(
              (opt) => opt === examQuestion.question.correctAnswer
            );
            if (originalCorrectIndex >= 0) {
              const newCorrectIndex = permutation.indexOf(originalCorrectIndex);
              if (newCorrectIndex >= 0) {
                // The correct answer in the permuted version
                examQuestion.question.correctAnswer = options[newCorrectIndex];
              }
            }
          }

          return {
            id: examQuestion.question.id,
            questionText: examQuestion.question.text,
            questionType: examQuestion.question.type as QuestionType,
            correctAnswer: examQuestion.question.correctAnswer,
            options: options,
            points: examQuestion.points || examQuestion.question.points,
          };
        })
        .filter((q) => q !== null);
    } else {
      // Fallback: use original order if questionOrder is missing
      variantQuestions = examQuestions.map((eq) => {
        let options: string[] = [];
        if (eq.question.options) {
          try {
            options = JSON.parse(eq.question.options);
          } catch (error) {
            if (eq.question.type === "TRUE_FALSE") {
              options = ["True", "False"];
            }
          }
        } else if (eq.question.type === "TRUE_FALSE") {
          options = ["True", "False"];
        }

        return {
          id: eq.question.id,
          questionText: eq.question.text,
          questionType: eq.question.type as QuestionType,
          correctAnswer: eq.question.correctAnswer,
          options: options,
          points: eq.points || eq.question.points,
        };
      });
    }

    return {
      id: variant.id,
      examId: variant.examId,
      variantCode: variant.variantCode,
      questions: variantQuestions,
      metadata: {
        questionOrder: questionOrder,
        optionPermutations: optionPermutations,
        answerKey: variant.answerKey, // Include answerKey for unmapping
      },
    };
  });
}

function transformToStudentResponses(rawResults: any[], examVariants: any[]) {
  const questionMap = new Map<string, any>();
  examVariants.forEach((variant) => {
    variant.questions.forEach((question) => {
      questionMap.set(question.id, question);
    });
  });

  return rawResults.map((rawResult) => {
    const variantCode = rawResult.variantCode || "default";

    const questionResponses = rawResult.studentAnswers.map((answer) => {
      const questionDetails = questionMap.get(answer.questionId);
      return {
        questionId: answer.questionId,
        studentAnswer: answer.studentAnswer,
        isCorrect: answer.isCorrect,
        points: answer.points,
        maxPoints: questionDetails?.points || 1,
        responseTime: undefined,
      };
    });

    const completionTime = Math.round(
      (rawResult.updatedAt.getTime() - rawResult.createdAt.getTime()) /
        (1000 * 60)
    );

    return {
      studentId: rawResult.student?.id || "null",
      displayStudentId: rawResult.student?.studentId || undefined, 
      name: rawResult.student?.name || undefined, 
      variantCode: variantCode,
      questionResponses: questionResponses,
      totalScore: rawResult.score,
      maxPossibleScore: rawResult.totalPoints,
      completionTime: completionTime > 0 ? completionTime : undefined,
      startedAt: rawResult.createdAt,
      completedAt: rawResult.updatedAt,
    };
  });
}
