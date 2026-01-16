
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import { validateCourseAccess } from "../../../../../../lib/coursePermissions";
import { AnalyzeByVariant } from "../../../../../lib/biPointAnalysis";
import { ExamVariantForAnalysis, StudentResponse } from "../../../../../types/analysis";
import { QuestionType } from "../../../../../types/course";
import prisma from "../../../../../../lib/prisma";

interface ExamMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}


/**
 * Get variant analysis for an exam generation
 * @param request - The request object
 * @param params - The parameters object
 * @returns The variant analysis result
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

    // Get fresh variant data directly from database
    const { studentResponses, examVariants } = await getVariantDataForAnalysis(
      examGeneration.examId,
      id
    );

    if (studentResponses.length === 0) {
      console.log('No student responses found, returning 400 error');
      return NextResponse.json(
        { error: 'No student results available for this exam generation. Please upload results first.' },
        { status: 400 }
      );
    }

    if (examVariants.length === 0) {
      console.log('No exam variants found, returning 400 error');
      return NextResponse.json(
        { error: 'No exam variants found for this generation.' },
        { status: 400 }
      );
    }

    // Analyze bi-point by variant
    const variantResults = await AnalyzeByVariant(examVariants, studentResponses, {
      examTitle: examGeneration.exam.title,
      minSampleSize: 1,
      includeDiscriminationIndex: true,
      includeDifficultyIndex: true,
      includePointBiserial: true,
    });

    // Return the variant analysis results
    return NextResponse.json(variantResults);
  } catch (error) {
    console.error("Error performing variant analysis:", error);
    return NextResponse.json(
      { error: `Failed to perform variant analysis: ${error}` },
      { status: 500 }
    );
  }
}








/**
 * Get fresh variant data directly from database for analysis
 */
async function getVariantDataForAnalysis(examId: string, generationId: string) {
  // Get all exam questions with their variants
  const examQuestions = await prisma.examQuestion.findMany({
    where: { examId },
    include: {
      question: true,
    },
    orderBy: { order: 'asc' },
  });

  // Get all variants for this generation
  const variants = await prisma.examVariant.findMany({
    where: { generationId },
    orderBy: { variantNumber: 'asc' },
  });

  // Get all student responses for this generation by filtering by variant codes
  const variantCodes = variants.map(v => v.variantCode);


  const rawStudentResponses = await prisma.examResult.findMany({
    where: {
      examId,
      variantCode: { in: variantCodes }
    },
    include: {
      student: true,
      studentAnswers: {
        include: {
          question: true,
        },
      },
    },
  });


  // Transform student responses to match expected format
  const studentResponses = rawStudentResponses.map(response => {
    // Find the variant for this response
    const variant = variants.find(v => v.variantCode === response.variantCode);
    const answerKey = variant ? JSON.parse(variant.answerKey || '[]') : [];

    // Parse the answer order permutations for this variant
    let answerOrderPermutations: any = {};
    try {
      if (variant?.answerOrder) {
        answerOrderPermutations = JSON.parse(variant.answerOrder);
      }
    } catch (error) {
      console.warn(`Failed to parse answerOrder for variant ${response.variantCode}:`, error);
    }

    // Create a map of questionId to correct answer for this variant
    const correctAnswerMap = new Map();
    answerKey.forEach((entry: any) => {
      // Find the question to get its original options
      const examQuestion = examQuestions.find(eq => eq.questionId === entry.questionId);
      let originalOptions: string[] = [];


      try {
        if (examQuestion?.question.options) {
          originalOptions = JSON.parse(examQuestion.question.options);
        }
      } catch (error) {
        console.warn(`Failed to parse options for question ${entry.questionId}:`, error);
        originalOptions = ['A', 'B', 'C', 'D'];
      }

      // Apply the permutation to get the variant-specific options
      let options = originalOptions;
      const permutation = answerOrderPermutations[entry.questionId];
      if (permutation && Array.isArray(permutation)) {
        options = permutation.map((index: number) => originalOptions[index] || `Option ${index}`);
      }

      // Get the correct answer - use originalAnswer if available, otherwise use letter-based mapping
      let correctAnswerText = entry.originalAnswer || entry.correctAnswer;

      // If we don't have originalAnswer, use letter-based mapping
      if (!entry.originalAnswer && entry.correctAnswer && entry.correctAnswer.length === 1) {
        const letterIndex = entry.correctAnswer.charCodeAt(0) - 65; // Convert A=0, B=1, C=2, D=3
        correctAnswerText = (letterIndex >= 0 && letterIndex < options.length) ? options[letterIndex] : entry.correctAnswer;
      }

      correctAnswerMap.set(entry.questionId, correctAnswerText);


    });

    return {
      studentId: response.studentId,
      displayStudentId: response.student.studentId || response.studentId,
      name: response.student.name,
      variantCode: response.variantCode || "1",
      questionResponses: response.studentAnswers.map(resp => {
        const correctAnswer = correctAnswerMap.get(resp.questionId);

        // Convert student's letter answer to the actual option text
        let studentAnswerText = resp.studentAnswer;
        const examQuestion = examQuestions.find(eq => eq.questionId === resp.questionId);

        if (resp.studentAnswer && resp.studentAnswer.length === 1) {
          if (examQuestion?.question.options) {
            try {
              const originalOptions = JSON.parse(examQuestion.question.options);
              const permutation = answerOrderPermutations[resp.questionId];

              if (permutation && Array.isArray(permutation)) {
                // Apply the same permutation to get variant-specific options
                const options = permutation.map((index: number) => originalOptions[index] || `Option ${index}`);

                // Convert letter to index (A=0, B=1, C=2, D=3)
                const letterIndex = resp.studentAnswer.charCodeAt(0) - 65;
                if (letterIndex >= 0 && letterIndex < options.length) {
                  studentAnswerText = options[letterIndex];
                }
              }
            } catch (error) {
              console.warn(`Failed to convert student answer for question ${resp.questionId}:`, error);
            }
          } else {
            // Handle True/False questions
            const letterIndex = resp.studentAnswer.charCodeAt(0) - 65;
            if (letterIndex === 0) {
              studentAnswerText = 'True';
            } else if (letterIndex === 1) {
              studentAnswerText = 'False';
            }
          }
        }

        const isCorrect = correctAnswer ? studentAnswerText === correctAnswer : false;



        return {
          questionId: resp.questionId,
          studentAnswer: studentAnswerText, // Use the converted answer text
          isCorrect: isCorrect,
          points: isCorrect ? (resp.question.points || 1) : 0,
          maxPoints: resp.question.points || 1,
        };
      }),
      totalScore: response.score || 0,
      maxPossibleScore: response.totalPoints || 0,
      startedAt: response.createdAt,
      completedAt: response.updatedAt,
    };
  });

  // Transform data for analysis without any mapping
  const examVariants: ExamVariantForAnalysis[] = variants.map(variant => {
    // Parse the answer key JSON string
    const answerKey = JSON.parse(variant.answerKey || '[]');

    // Parse the answer order permutations
    let answerOrderPermutations: any = {};
    try {
      if (variant.answerOrder) {
        answerOrderPermutations = JSON.parse(variant.answerOrder);
      }
    } catch (error) {
      console.warn(`Failed to parse answerOrder for variant ${variant.variantCode}:`, error);
    }

    return {
      id: variant.id,
      examId: examId,
      variantCode: variant.variantCode,
      questions: answerKey.map((answerKeyEntry: any) => {
        // Find the question text from examQuestions
        const examQuestion = examQuestions.find(eq => eq.questionId === answerKeyEntry.questionId);
        const questionText = examQuestion?.question.text || `Question ${answerKeyEntry.questionId}`;
        const points = examQuestion?.points || answerKeyEntry.points || 1;

        // Parse the original options from the question
        let originalOptions: string[] = [];
        let options: string[] = [];

        try {
          if (examQuestion?.question.options) {
            originalOptions = JSON.parse(examQuestion.question.options);

            // Apply the permutation to get the variant-specific options
            const permutation = answerOrderPermutations[answerKeyEntry.questionId];
            if (permutation && Array.isArray(permutation)) {
              options = permutation.map((index: number) => originalOptions[index] || `Option ${index}`);
            } else {
              options = originalOptions;
            }
          } else {
            // Handle True/False questions or questions without options
            options = ['True', 'False'];
          }
        } catch (error) {
          console.warn(`Failed to parse options for question ${answerKeyEntry.questionId}:`, error);
          options = ['True', 'False']; // Fallback for True/False questions
        }

        // Get the correct answer - use originalAnswer if available, otherwise use letter-based mapping
        let correctAnswerText = answerKeyEntry.originalAnswer || answerKeyEntry.correctAnswer;

        // If we don't have originalAnswer, use letter-based mapping
        if (!answerKeyEntry.originalAnswer && answerKeyEntry.correctAnswer && answerKeyEntry.correctAnswer.length === 1) {
          const letterIndex = answerKeyEntry.correctAnswer.charCodeAt(0) - 65; // Convert A=0, B=1, C=2, D=3
          correctAnswerText = (letterIndex >= 0 && letterIndex < options.length) ? options[letterIndex] : answerKeyEntry.correctAnswer;
        }

        return {
          id: answerKeyEntry.questionId,
          questionText: questionText,
          questionType: QuestionType.MULTIPLE_CHOICE,
          correctAnswer: correctAnswerText,
          options: options,
          points: points,
        };
      }),
    };
  });

  return {
    studentResponses,
    examVariants,
  };
}
