/*
Bi-Point Analysis System for Exam Item Analysis
Takes saved exam variants and marked student data aka examResults to perform item analysis
Uses adapter pattern to handle different data sources for marked exam variants
*/

import { QuestionType } from "../types/course";
// Import simple-statistics with any type since no TypeScript types are available
const ss: any = require("simple-statistics");
import {
  AnalysisQuestion,
  ExamVariantForAnalysis,
  AnalysisConfig,
  StudentResponse,
  QuestionResponse,
  QuestionAnalysisResult,
  DistractorAnalysis,
  DistractorOption,
  StatisticalSignificance,
  ReliabilityMetrics,
  BiPointAnalysisResult,
  AnalysisSummary,
  ScoreDistribution,
  VariantMetadata,
  VariantAnalysisResult,
} from "../types/analysis";





/**
 * Unmaps variant student responses back to the original exam question order.
 *
 * @param studentResponses - Array of student responses in variant format.
 * @param examVariants - Array of exam variants with metadata.
 * @param originalQuestions - Array of original questions in their original order.
 * @returns Array of student responses mapped to the original exam format.
 */
function unmapVariantResponses(
  studentResponses: StudentResponse[],
  examVariants: ExamVariantForAnalysis[],
  originalQuestions: AnalysisQuestion[]
): StudentResponse[] {
  // Create a map of variant codes to their metadata
  const variantMetadataMap = new Map<string, VariantMetadata>();

  for (const variant of examVariants) {
    if (variant.variantCode) {
      let answerKey: Array<{
        questionId: string;
        questionNumber: number;
        correctAnswer: string;
        originalAnswer: string;
      }> = [];

      // Parse answer key if it exists (from database)
      if (variant.metadata && "answerKey" in variant.metadata) {
        try {
          answerKey = JSON.parse(variant.metadata.answerKey as string);
        } catch (error) {
          console.error(
            `Error parsing answer key for variant ${variant.variantCode}:`,
            error
          );
        }
      }

      variantMetadataMap.set(variant.variantCode, {
        questionOrder: variant.metadata?.questionOrder || [],
        optionPermutations: variant.metadata?.optionPermutations || {},
        answerKey: JSON.stringify(answerKey),
      });
    }
  }

  // Create a map of original question IDs to their options
  const originalQuestionMap = new Map<string, AnalysisQuestion>();
  originalQuestions.forEach((question) => {
    originalQuestionMap.set(question.id, question);
  });

  // Unmap each student response
  const unmappedResponses: StudentResponse[] = [];

  for (const studentResponse of studentResponses) {
    const variantMetadata = variantMetadataMap.get(studentResponse.variantCode);

    if (!variantMetadata) {
      // If no variant metadata found, use response as-is
      unmappedResponses.push(studentResponse);
      continue;
    }

    // Unmap question responses
    const unmappedQuestionResponses: QuestionResponse[] = [];

    for (const questionResponse of studentResponse.questionResponses) {
      const originalQuestion = originalQuestionMap.get(
        questionResponse.questionId
      );

      if (!originalQuestion) {
        // If original question not found, use response as-is
        unmappedQuestionResponses.push(questionResponse);
        continue;
      }

      // Find the answer key entry for this question
      let answerKey: Array<{
        questionId: string;
        questionNumber: number;
        correctAnswer: string;
        originalAnswer: string;
      }> = [];
      try {
        answerKey = JSON.parse(variantMetadata.answerKey || "[]");
      } catch (error) {
        console.error("Error parsing answer key:", error);
      }

      const answerKeyEntry = answerKey.find(
        (entry) => entry.questionId === questionResponse.questionId
      );

      let unmappedStudentAnswer = questionResponse.studentAnswer;
      let unmappedIsCorrect = questionResponse.isCorrect;

      if (answerKeyEntry && originalQuestion.options) {
        // Map the variant letter answer back to original option text
        const variantAnswerLetter = questionResponse.studentAnswer;

        // Get the option permutation for this question
        const optionPermutation =
          variantMetadata.optionPermutations?.[questionResponse.questionId] ||
          [];

        if (optionPermutation.length > 0 && variantAnswerLetter.length === 1) {
          // Convert letter to index (A=0, B=1, C=2, D=3 ... ect)
          const variantAnswerIndex =
            variantAnswerLetter.charCodeAt(0) - "A".charCodeAt(0);

          if (
            variantAnswerIndex >= 0 &&
            variantAnswerIndex < optionPermutation.length
          ) {
            // Create reverse mapping: variant position -> original index
            const reverseMapping = new Array(optionPermutation.length);
            for (
              let originalIndex = 0;
              originalIndex < optionPermutation.length;
              originalIndex++
            ) {
              const variantPosition = optionPermutation[originalIndex];
              reverseMapping[variantPosition] = originalIndex;
            }

            // Get the original option index that corresponds to this variant position
            const originalOptionIndex = reverseMapping[variantAnswerIndex];

            if (
              originalOptionIndex !== undefined &&
              originalOptionIndex >= 0 &&
              originalOptionIndex < originalQuestion.options.length
            ) {
              // Get the original option text
              unmappedStudentAnswer =
                originalQuestion.options[originalOptionIndex];

              // Recalculate isCorrect based on original question's correct answer
              unmappedIsCorrect =
                unmappedStudentAnswer === originalQuestion.correctAnswer;
            }
          }
        } else {
          // If no option permutation or answer is not a single letter, use text mapping
          // This handles cases where student answer is already in full text format
          if (
            originalQuestion.options.includes(questionResponse.studentAnswer)
          ) {
            unmappedStudentAnswer = questionResponse.studentAnswer;
            unmappedIsCorrect =
              questionResponse.studentAnswer === originalQuestion.correctAnswer;
          }
        }
      }

      unmappedQuestionResponses.push({
        questionId: questionResponse.questionId,
        studentAnswer: unmappedStudentAnswer,
        isCorrect: unmappedIsCorrect,
        points: unmappedIsCorrect ? questionResponse.maxPoints : 0,
        maxPoints: questionResponse.maxPoints,
        responseTime: questionResponse.responseTime,
      });
    }

    // Recalculate total score based on unmapped responses
    const unmappedTotalScore = unmappedQuestionResponses.reduce(
      (sum, qr) => sum + qr.points,
      0
    );

    unmappedResponses.push({
      studentId: studentResponse.studentId,
      variantCode: "ORIGINAL", // Mark as unmapped to original
      questionResponses: unmappedQuestionResponses,
      totalScore: unmappedTotalScore,
      maxPossibleScore: studentResponse.maxPossibleScore,
      completionTime: studentResponse.completionTime,
      startedAt: studentResponse.startedAt,
      completedAt: studentResponse.completedAt,
    });
  }

  return unmappedResponses;
}




/**
 * Performs bi-point statistical analysis on exam variants and student responses.
 * Returns metrics and insights for exam evaluation.
 *
 * @param examVariants - Array of exam variants to analyze.
 * @param studentResponses - Array of student responses for the exam.
 * @param config - Optional analysis configuration and exam title.
 * @returns BiPointAnalysisResult containing analysis metrics and insights.
 */
export async function analyzeExam(
  examVariants: ExamVariantForAnalysis[],
  studentResponses: StudentResponse[],
  config: Partial<AnalysisConfig> & { examTitle?: string } = {}
): Promise<BiPointAnalysisResult> {
  // Apply configuration defaults
  const finalConfig: AnalysisConfig = {
    minSampleSize: 10,
    includeDiscriminationIndex: true,
    includeDifficultyIndex: true,
    includePointBiserial: true,
    includeDistractorAnalysis: true,
    confidenceLevel: 0.95,
    excludeIncompleteData: false,
    groupByQuestionType: false,
    ...config,
  };

  // Check for empty arrays first
  if (studentResponses.length === 0) {
    throw new Error(`No student responses found for analysis.`);
  }

  // Check for insufficient sample size
  if ((config.minSampleSize || 0) > studentResponses.length) {
    throw new Error(`Insufficient sample size`);
  }

  // Filter responses based on configuration
  let filteredResponses = studentResponses;
  if (finalConfig.excludeIncompleteData) {
    filteredResponses = studentResponses.filter(
      (response) =>
        response.completedAt && response.questionResponses.length > 0
    );
  }

  if (filteredResponses.length < 1) {
    throw new Error(`No student responses found for analysis.`);
  }

  // Unmap variant responses to original format
  const originalQuestions = examVariants.flatMap(
    (variant) => variant.questions
  );
  const unmappedResponses = unmapVariantResponses(
    filteredResponses,
    examVariants,
    originalQuestions
  );

  // Perform analysis
  const questionResults = analyzeQuestions(
    unmappedResponses,
    examVariants,
    finalConfig
  );
  const summary = calculateSummary(
    questionResults,
    unmappedResponses,
    finalConfig
  );

  // Base result object
  const result: BiPointAnalysisResult = {
    examId: examVariants[0]?.examId || "unknown",
    examTitle: config.examTitle || examVariants[0]?.examTitle || "Unknown Exam",
    analysisConfig: finalConfig,
    questionResults,
    summary,
    metadata: {
      totalStudents: studentResponses.length,
      totalVariants: new Set(studentResponses.map((r) => r.variantCode)).size,
      analysisDate: new Date(),
      sampleSize: filteredResponses.length,
      excludedStudents: studentResponses.length - filteredResponses.length,
      studentResponses: filteredResponses,
    },
  };

  return result;
}




/**
 * Analyzes exam variants and student responses by variant.
 * Returns an array of BiPointAnalysisResult objects, one for each variant.
 *
 * @param examVariants - Array of exam variants to analyze.
 * @param studentResponses - Array of student responses for the exam.
 * @param config - Optional analysis configuration and exam title.
 * @returns Array of BiPointAnalysisResult objects, one for each variant.
 */
export function AnalyzeByVariant(
  examVariants: ExamVariantForAnalysis[],
  studentResponses: StudentResponse[],
  config: Partial<AnalysisConfig> & { examTitle?: string } = {}
): BiPointAnalysisResult[] {
  const finalConfig: AnalysisConfig = {
    minSampleSize: 10,
    includeDiscriminationIndex: true,
    includeDifficultyIndex: true,
    includePointBiserial: true,
    includeDistractorAnalysis: true,
    confidenceLevel: 0.95,
    excludeIncompleteData: false,
    groupByQuestionType: false,
    ...config,
  };

  const variantGroups = splitByVariant(studentResponses, examVariants);

  const results: BiPointAnalysisResult[] = [];
  for (const [variantCode, responses] of Object.entries(variantGroups)) {
    const variant = examVariants.find(v => v.variantCode === variantCode);
    if (!variant) continue;

    // Analyze questions and summary for this variant
    const questionResults = analyzeQuestions(
      responses,
      [variant],
      finalConfig
    );
    const summary = calculateSummary(
      questionResults,
      responses,
      finalConfig
    );

    results.push({
      examId: variant.examId || "unknown",
      examTitle: `${config.examTitle || variant.examTitle || "Unknown Exam"} - Variant ${variantCode}`,
      analysisConfig: finalConfig,
      questionResults,
      summary,
      metadata: {
        totalStudents: responses.length,
        totalVariants: 1,
        analysisDate: new Date(),
        sampleSize: responses.length,
        excludedStudents: 0,
        studentResponses: responses,
      },
    });
  }
  return results;
}




/**
 * Calculates similarity matrix between students based on their option choices across varaints
 * @param studentResponses - Array of student responses
 * @returns Similarity matrix where each cell [student1][student2] contains similarity score (0-1)
 */
export function calculateStudentSimilarityMatrix(studentResponses: StudentResponse[]): Record<string, Record<string, number>> {
  // Create student-option matrix: studentId -> questionId -> option
  const studentOptions: Record<string, Record<string, string>> = {};

  // Extract all student IDs and their option choices
  for (const response of studentResponses) {
    if (!studentOptions[response.studentId]) {
      studentOptions[response.studentId] = {};
    }

    for (const questionResponse of response.questionResponses) {
      studentOptions[response.studentId][questionResponse.questionId] = questionResponse.studentAnswer;
    }
  }

  const studentIds = Object.keys(studentOptions);
  const similarityMatrix: Record<string, Record<string, number>> = {};

  // Initialize matrix
  for (const student1 of studentIds) {
    similarityMatrix[student1] = {};
    for (const student2 of studentIds) {
      similarityMatrix[student1][student2] = 0;
    }
  }
  //super slow  O(x^4) will return for optimization is time permits
  // Calculate similarities
  for (const student1 of studentIds) {
    for (const student2 of studentIds) {
      if (student1 === student2) {
        similarityMatrix[student1][student2] = 1; // Diagonal is always 1
        continue;
      }

      const options1 = studentOptions[student1];
      const options2 = studentOptions[student2];

      let matchingOptions = 0;
      let totalComparisons = 0;

      // Compare option choices for each question
      for (const questionId of Object.keys(options1)) {
        if (options2[questionId] !== undefined) {
          totalComparisons++;
          if (options1[questionId] === options2[questionId]) {
            matchingOptions++;
          }
        }
      }

      // Calculate similarity as proportion of matching options
      const similarity = totalComparisons > 0 ? matchingOptions / totalComparisons : 0;
      similarityMatrix[student1][student2] = similarity;
    }
  }

  return similarityMatrix;
}




/**
 * Analyzes the integrity of the exam by calculating student and variant similarity matrices
 * @param examVariants - Array of exam variants
 * @param studentResponses - Array of student responses
 * @returns Object containing student and variant similarity matrices
 */
export function analyzeIntegrity(examVariants: ExamVariantForAnalysis[], studentResponses: StudentResponse[]) {
  return {
    studentSimilarity: calculateStudentSimilarityMatrix(studentResponses),
    variantSimilarity: calculateVariantSimilarityMatrix(examVariants)
  };
}





/**
 * Calculates similarity matrix between variants based on question order and option permutations
 * @param examVariants - Array of exam variants with metadata
 * @returns Similarity matrix where each cell [variant1][variant2] contains similarity score (0-1)
 */
export function calculateVariantSimilarityMatrix(examVariants: ExamVariantForAnalysis[]): Record<string, Record<string, number>> {
  const variantCodes = examVariants.map(v => v.variantCode).filter(Boolean) as string[];
  const similarityMatrix: Record<string, Record<string, number>> = {};

  // Initialize matrix
  for (const variant1 of variantCodes) {
    similarityMatrix[variant1] = {};
    for (const variant2 of variantCodes) {
      similarityMatrix[variant1][variant2] = 0;
    }
  }

  // Calculate similarities between each pair of variants
  for (const variant1 of examVariants) {
    for (const variant2 of examVariants) {
      if (!variant1.variantCode || !variant2.variantCode) continue;

      if (variant1.variantCode === variant2.variantCode) {
        similarityMatrix[variant1.variantCode][variant2.variantCode] = 1; // Diagonal is always 1
        continue;
      }

      // Calculate question order similarity
      const questionOrderSimilarity = calculateQuestionOrderSimilarity(variant1, variant2);

      // Calculate option permutation similarity
      const optionSimilarity = calculateOptionPermutationSimilarity(variant1, variant2);

      // Combined similarity (average of both)
      const combinedSimilarity = (questionOrderSimilarity + optionSimilarity) / 2;

      similarityMatrix[variant1.variantCode][variant2.variantCode] = combinedSimilarity;
    }
  }

  return similarityMatrix;
}





/**
 * Calculates similarity between two variants based on question order
 * @param variant1 - First variant
 * @param variant2 - Second variant
 * @returns Similarity score (0-1) where 1 means identical question order
 */
function calculateQuestionOrderSimilarity(variant1: ExamVariantForAnalysis, variant2: ExamVariantForAnalysis): number {
  const order1 = variant1.metadata?.questionOrder || [];
  const order2 = variant2.metadata?.questionOrder || [];

  if (order1.length === 0 || order2.length === 0) {
    return 0; // No order data available
  }

  if (order1.length !== order2.length) {
    return 0; // Different number of questions
  }

  // Count matching positions
  let matchingPositions = 0;
  for (let i = 0; i < order1.length; i++) {
    if (order1[i] === order2[i]) {
      matchingPositions++;
    }
  }

  return matchingPositions / order1.length;
}





/**
 * Calculates similarity between two variants based on option permutations
 * @param variant1 - First variant
 * @param variant2 - Second variant
 * @returns Similarity score (0-1) where 1 means identical option orders
 */
function calculateOptionPermutationSimilarity(variant1: ExamVariantForAnalysis, variant2: ExamVariantForAnalysis): number {
  const permutations1 = variant1.metadata?.optionPermutations || {};
  const permutations2 = variant2.metadata?.optionPermutations || {};

  const questionIds1 = Object.keys(permutations1);
  const questionIds2 = Object.keys(permutations2);

  if (questionIds1.length === 0 || questionIds2.length === 0) {
    return 0; // No permutation data available
  }

  // Get all unique question IDs
  const allQuestionIds = Array.from(new Set([...questionIds1, ...questionIds2]));
  let totalComparisons = 0;
  let matchingPermutations = 0;

  for (const questionId of allQuestionIds) {
    const perm1 = permutations1[questionId];
    const perm2 = permutations2[questionId];

    // If both variants have permutations for this question
    if (perm1 && perm2) {
      totalComparisons++;

      // Check if permutations are identical
      if (perm1.length === perm2.length) {
        const isIdentical = perm1.every((val, index) => val === perm2[index]);
        if (isIdentical) {
          matchingPermutations++;
        }
      }
    }
  }

  return totalComparisons > 0 ? matchingPermutations / totalComparisons : 0;
}





/**
 * Splits student responses by variant
 * @param studentResponses - Array of student responses
 * @param examVariants - Array of exam variants
 * @returns Record of variant codes to student responses
 */
function splitByVariant(studentResponses: StudentResponse[],
  examVariants: ExamVariantForAnalysis[]
): Record<string, StudentResponse[]> {

  return studentResponses.reduce((acc: Record<string, StudentResponse[]>, response) => {
    const variant = examVariants.find(v => v.variantCode === response.variantCode);
    if (!variant || !variant.variantCode) return acc;
    if (!acc[variant.variantCode]) acc[variant.variantCode] = [];
    acc[variant.variantCode].push(response);
    return acc;
  }, {});
}





/**
 * Analyzes individual exam questions for difficulty and discrimination metrics.
 *
 * @param responses - Array of student responses.
 * @param examVariants - Array of exam variants with question metadata.
 * @param config - Analysis configuration options.
 * @returns Array of question analysis results with calculated metrics.
 */
function analyzeQuestions(
  responses: StudentResponse[],
  examVariants: ExamVariantForAnalysis[],
  config: AnalysisConfig
): QuestionAnalysisResult[] {
  // Create a map of question data from exam variants
  const questionDataMap = new Map<
    string,
    {
      text: string;
      type: QuestionType;
      options: string[];
      correctAnswer: string;
    }
  >();

  for (const variant of examVariants) {
    if (variant.questions) {
      for (const question of variant.questions) {
        questionDataMap.set(question.id, {
          text: question.questionText || `Question ${question.id}`,
          type: question.questionType || QuestionType.MULTIPLE_CHOICE,
          options: question.options || [],
          correctAnswer: question.correctAnswer,
        });
      }
    }
  }

  // Group responses by question
  const questionGroups = new Map<string, QuestionResponse[]>();

  for (const response of responses) {
    for (const questionResponse of response.questionResponses) {
      if (!questionGroups.has(questionResponse.questionId)) {
        questionGroups.set(questionResponse.questionId, []);
      }
      questionGroups.get(questionResponse.questionId)!.push(questionResponse);
    }
  }

  const results: QuestionAnalysisResult[] = [];

  for (const [questionId, questionResponses] of Array.from(
    questionGroups.entries()
  )) {
    const totalResponses = questionResponses.length;
    const correctResponses = questionResponses.filter(
      (qr) => qr.isCorrect
    ).length;

    // Calculate difficulty index (p-value)
    // Formula: p = R / N
    // Where: R = number of correct responses, N = total number of responses
    const difficultyIndex =
      totalResponses > 0 ? correctResponses / totalResponses : 0;

    // Calculate discrimination index
    const discriminationIndex = calculateDiscriminationIndex(
      responses,
      questionId
    );

    // Calculate point-biserial correlation
    const pointBiserialCorrelation =
      calculatePointBiserialCorrelationForQuestion(responses, questionId);

    // Get question data for complete option analysis
    const questionOptions = questionDataMap.get(questionId);

    // Analyze distractors
    const distractorAnalysis = analyzeDistractors(
      questionResponses,
      responses,
      questionId,
      questionOptions
    );

    // Determine number of options from unique answers (correct + incorrect)
    const uniqueAnswers = new Set(
      questionResponses
        .map((qr) => qr.studentAnswer)
        .filter((answer) => answer !== "" && answer !== null)
    );
    const numberOfOptions = Math.max(2, uniqueAnswers.size); // Default to at least 2 options (T/F minimum)

    // Calculate statistical significance
    const statisticalSignificance = calculateStatisticalSignificance(
      questionResponses,
      numberOfOptions,
      config.confidenceLevel || 0.95
    );

    // Calculate reliability metrics
    const reliabilityMetrics = calculateReliabilityMetrics(
      responses,
      questionId
    );

    // Get question data from the map
    const questionData = questionDataMap.get(questionId);
    const questionText = questionData?.text || `Question ${questionId}`;
    const questionType = questionData?.type || QuestionType.MULTIPLE_CHOICE;

    results.push({
      questionId,
      questionText,
      questionType,
      totalResponses,
      correctResponses,
      difficultyIndex,
      discriminationIndex,
      pointBiserialCorrelation,
      distractorAnalysis,
      statisticalSignificance,
      reliabilityMetrics,
    });
  }

  return results;
}





/**
 * Calculate discrimination index using high-low group method
 *
 * This is the "top/bottom coefficient" mentioned in psychometric literature.
 * The sample is split into high-performing and low-performing groups based on total score,
 * then the proportion correct (P value) is calculated for each group and subtracted.
 *
 * Formula: D = (H - L) / n
 *
 * Where:
 * - H = number of high-scoring students who answered correctly
 * - L = number of low-scoring students who answered correctly
 * - n = size of high or low group
 *
 *
 * @param responses - Array of student responses
 * @param questionId - ID of the question to analyze
 * @param highGroupPercent - Percentage for high group (default 0.27)
 * @param lowGroupPercent - Percentage for low group (default 0.27)
 * @returns Discrimination index (higher values indicate better discrimination)
 */
function calculateDiscriminationIndex(
  responses: StudentResponse[],
  questionId: string,
  highGroupPercent: number = 0.27,
  lowGroupPercent: number = 0.27
): number {
  // Sort students by total score
  const sortedResponses = responses.sort((a, b) => b.totalScore - a.totalScore);
  const n = sortedResponses.length;

  // Ensure minimum group sizes for meaningful discrimination at low sample sizes
  const minGroupSize = Math.max(2, Math.floor(n * 0.1)); // At least 2 students or 10%
  const highGroupSize = Math.max(
    minGroupSize,
    Math.floor(n * highGroupPercent)
  );
  const lowGroupSize = Math.max(minGroupSize, Math.floor(n * lowGroupPercent));

  const highGroup = sortedResponses.slice(0, highGroupSize);
  const lowGroup = sortedResponses.slice(n - lowGroupSize);

  // Calculate correct responses in each group
  const highCorrect = highGroup.filter(
    (r) =>
      r.questionResponses.find((qr) => qr.questionId === questionId)?.isCorrect
  ).length;
  const lowCorrect = lowGroup.filter(
    (r) =>
      r.questionResponses.find((qr) => qr.questionId === questionId)?.isCorrect
  ).length;

  // Calculate proportions instead of raw counts for better discrimination
  const highProportion = highGroupSize > 0 ? highCorrect / highGroupSize : 0;
  const lowProportion = lowGroupSize > 0 ? lowCorrect / lowGroupSize : 0;

  // Discrimination index = difference in proportions
  return highProportion - lowProportion;
}






/**
 * Calculate point-biserial correlation using simple-statistics
 *
 * The point-biserial coefficient is a Pearson correlation between scores on the item
 * (0=wrong, 1=correct) and the total score on the test.
 *
 * Formula: r_pb = [(X̄₁ - X̄₂) / sₓ] × √[(n₁×n₂) / n²]
 *
 * Where:
 * - X̄₁ = mean score of students who answered correctly
 * - X̄₂ = mean score of students who answered incorrectly
 * - sₓ = standard deviation of total scores
 * - n₁ = number of students who answered correctly
 * - n₂ = number of students who answered incorrectly
 * - n = total number of students
 *
 * Interpretation Guidelines:
 * - Near-zero or negative values = major red flag (item may be miskeyed or poor quality)
 * - 0.10+ = minimal quality item
 * - 0.20+ = good quality item
 * - 0.30+ = strong quality item
 * - Values can vary with sample size and construct difficulty
 *
 * @param responses - Array of student responses
 * @param questionId - ID of the question to analyze
 * @returns Point-biserial correlation coefficient (-1 to 1)
 */
function calculatePointBiserialCorrelationForQuestion(
  responses: StudentResponse[],
  questionId: string
): number {
  const n = responses.length;
  if (n < 2) return 0;

  // Get question responses and total scores
  const questionData = responses.map((r) => ({
    isCorrect:
      r.questionResponses.find((qr) => qr.questionId === questionId)
        ?.isCorrect || false,
    totalScore: r.totalScore,
  }));

  const correctResponses = questionData.filter((d) => d.isCorrect);
  const incorrectResponses = questionData.filter((d) => !d.isCorrect);

  const n1 = correctResponses.length; // number who got it right
  const n2 = incorrectResponses.length; // number who got it wrong

  // Return 0 if all students got it right or all got it wrong (no variance to correlate)
  if (n1 === 0 || n2 === 0) return 0;

  const correctScores = correctResponses.map((d) => d.totalScore);
  const incorrectScores = incorrectResponses.map((d) => d.totalScore);
  const allScores = questionData.map((d) => d.totalScore);

  const meanCorrect = ss.mean(correctScores); // X̄₁
  const meanIncorrect = ss.mean(incorrectScores); // X̄₂
  const standardDeviation = ss.standardDeviation(allScores); // sₓ

  if (standardDeviation === 0) return 0;

  // Formula: r_pb = (X̄₁ - X̄₂) / sₓ × √(n₁×n₂) / n²
  const pointBiserial =
    ((meanCorrect - meanIncorrect) / standardDeviation) *
    Math.sqrt((n1 * n2) / (n * n));
  return Math.max(-1, Math.min(1, pointBiserial)); // Clamp between -1 and 1
}






/**
 * Calculate point-biserial correlation for a specific option
 *
 * This compares students who chose this option vs those who didn't,
 * and correlates with their total exam score.
 *
 * Formula: r_pb = (X̄₁ - X̄₂) / sₓ × √(n₁×n₂) / n²
 *
 * @param responses - Array of all student responses
 * @param questionId - ID of the question
 * @param option - The specific option to analyze
 * @returns Point-biserial correlation coefficient
 */
function calculateQuestionOptionPointBiserial(
  responses: StudentResponse[],
  questionId: string,
  option: string,
  questionData?: {
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer?: string;
  }
): number {
  const n = responses.length;
  if (n < 2) return 0;

  // Get data for students who chose this option vs those who didn't
  const optionData = responses.map((r) => {
    const questionResponse = r.questionResponses.find(
      (qr) => qr.questionId === questionId
    );
    if (!questionResponse) {
      return { choseOption: false, totalScore: r.totalScore };
    }

    // Convert letter answers (A, B, C, D) to option text if needed
    let mappedAnswer = questionResponse.studentAnswer;

    // Check if student answer is a single letter and we have options
    if (
      questionData?.options &&
      questionData.options.length > 0 &&
      questionResponse.studentAnswer.length === 1 &&
      questionResponse.studentAnswer.match(/^[A-Z]$/)
    ) {
      // Convert letter to index (A=0, B=1, C=2, D=3)
      const letterIndex =
        questionResponse.studentAnswer.charCodeAt(0) - "A".charCodeAt(0);

      // Map to option text if valid index
      if (letterIndex >= 0 && letterIndex < questionData.options.length) {
        mappedAnswer = questionData.options[letterIndex];
      }
    }

    const choseOption = mappedAnswer === option;

    return { choseOption, totalScore: r.totalScore };
  });

  const choseOptionResponses = optionData.filter((d) => d.choseOption);
  const didNotChooseOptionResponses = optionData.filter((d) => !d.choseOption);

  if (
    choseOptionResponses.length === 0 ||
    didNotChooseOptionResponses.length === 0
  )
    return 0;

  const n1 = choseOptionResponses.length; // number who chose this option
  const n2 = didNotChooseOptionResponses.length; // number who didn't choose this option

  const choseOptionScores = choseOptionResponses.map((d) => d.totalScore);
  const didNotChooseOptionScores = didNotChooseOptionResponses.map(
    (d) => d.totalScore
  );
  const allScores = optionData.map((d) => d.totalScore);

  const meanChoseOption = ss.mean(choseOptionScores);
  const meanDidNotChooseOption = ss.mean(didNotChooseOptionScores);
  const standardDeviation = ss.standardDeviation(allScores);

  if (standardDeviation === 0) return 0;

  // Formula: r_pb = (X̄₁ - X̄₂) / sₓ × √(n₁×n₂) / n²
  const pointBiserial =
    ((meanChoseOption - meanDidNotChooseOption) / standardDeviation) *
    Math.sqrt((n1 * n2) / (n * n));
  return Math.max(-1, Math.min(1, pointBiserial)); // Clamp between -1 and 1
}






/**
 * Analyze distractors (incorrect answer choices) for multiple choice questions
 *
 * Distractor analysis examines how students responded using incorrect answer choices
 * in multiple choice questions. This helps identify:
 * - Which distractors are attracting students (and how many)
 * - Whether distractors are functioning as intended
 * - If any distractors are too obvious or confusing
 * - Pattern of omitted responses (students who didn't answer)
 *
 * @param questionResponses - Array of student responses for a single question
 * @param allResponses - Array of all student responses (needed for point-biserial calculation)
 * @param questionId - ID of the question being analyzed
 * @returns DistractorAnalysis object containing:
 *   - distractors: Array of incorrect options with frequency, percentage, discrimination, and point-biserial
 *   - correctOption: The correct option with its statistics
 *   - omittedResponses: Count of students who didn't answer
 *   - omittedPercentage: Percentage of students who didn't answer
 */
function analyzeDistractors(
  questionResponses: QuestionResponse[],
  allResponses: StudentResponse[],
  questionId: string,
  questionData?: {
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer?: string;
  }
): DistractorAnalysis {
  const optionCounts = new Map<string, number>();
  let omittedCount = 0;
  //prepare the data for the analysis
  // Determine the correct option from the question definition, not from student responses
  let correctOption: string | null = null;
  if (questionData?.correctAnswer) {
    // The correct answer might be the full text or just a letter - handle both
    correctOption = questionData.correctAnswer;

    // If the correct answer is in the options, use it directly
    if (
      questionData.options &&
      questionData.options.includes(questionData.correctAnswer)
    ) {
      correctOption = questionData.correctAnswer;
    }
  }

  // Count all responses (correct and incorrect)
  for (const response of questionResponses) {
    if (response.studentAnswer === "" || response.studentAnswer === null) {
      omittedCount++;
    } else {
      // Convert letter answers (A, B, C, D) to option text if needed
      let mappedAnswer = response.studentAnswer;

      // Check if student answer is a single letter and we have options
      if (
        questionData?.options &&
        questionData.options.length > 0 &&
        response.studentAnswer.length === 1 &&
        response.studentAnswer.match(/^[A-Z]$/)
      ) {
        // Convert letter to index (A=0, B=1, C=2, D=3)
        const letterIndex =
          response.studentAnswer.charCodeAt(0) - "A".charCodeAt(0);

        // Map to option text if valid index
        if (letterIndex >= 0 && letterIndex < questionData.options.length) {
          mappedAnswer = questionData.options[letterIndex];
        }
      }

      const current = optionCounts.get(mappedAnswer) || 0;
      optionCounts.set(mappedAnswer, current + 1);
    }
  }

  const total = questionResponses.length;

  // Get all possible options (only include actual question options, not whatever students wrote)
  let allPossibleOptions: string[] = [];
  if (questionData?.options && questionData.options.length > 0) {
    allPossibleOptions = questionData.options;
  } else {
    // Fallback: use only the options that students actually selected
    allPossibleOptions = Array.from(optionCounts.keys());
  }

  // Ensure all possible options are included, even with 0 frequency
  // But ONLY for actual question options, not random student responses
  if (questionData?.options && questionData.options.length > 0) {
    for (const option of allPossibleOptions) {
      if (!optionCounts.has(option)) {
        optionCounts.set(option, 0);
      }
    }
  }

  // Analyze all options (both correct and incorrect, including 0-frequency)
  const allOptions = allPossibleOptions.map((option) => ({
    option,
    frequency: optionCounts.get(option) || 0,
    percentage: ((optionCounts.get(option) || 0) / total) * 100,
    discriminationIndex: calculateDistractorDiscrimination(
      questionResponses,
      option,
      questionData
    ),
    pointBiserialCorrelation: calculateQuestionOptionPointBiserial(
      allResponses,
      questionId,
      option,
      questionData
    ),
  }));

  // Separate correct option from distractors
  const correctOptionData = correctOption
    ? allOptions.find((opt) => opt.option === correctOption)
    : undefined;
  const distractors = allOptions.filter((opt) => opt.option !== correctOption);

  return {
    distractors,
    correctOption: correctOptionData,
    omittedResponses: omittedCount,
    omittedPercentage: (omittedCount / total) * 100,
  };
}






/**
 * Calculate discrimination index for individual distractors
 *
 * Measures how well a specific distractor (incorrect option) differentiates between students.
 * Currently uses a simplified approach based on frequency of selection.
 *
 * Formula: D_distractor = frequency / total_responses
 *
 * A proper discrimination index would compare how high-performing vs low-performing
 * students choose this distractor, but this requires access to total scores which
 * isn't available in this context.
 *
 * Interpretation:
 * - Higher values = more students chose this distractor
 * - Lower values = fewer students chose this distractor
 * - Very high values might indicate an ambiguous question or attractive wrong answer
 * - Very low values might indicate an obviously wrong distractor
 *
 * @param questionResponses - Array of all student responses for this question
 * @param distractorOption - The specific distractor option to analyze (e.g., "A", "B", "C")
 * @returns Discrimination value between 0 and 1 (proportion who chose this distractor)
 */
function calculateDistractorDiscrimination(
  questionResponses: QuestionResponse[],
  distractorOption: string,
  questionData?: {
    text: string;
    type: QuestionType;
    options: string[];
    correctAnswer?: string;
  }
): number {
  // This would need access to total scores to calculate proper discrimination
  // For now, return a simplified measure based on frequency
  const totalResponses = questionResponses.length;
  const distractorResponses = questionResponses.filter((qr) => {
    // Convert letter answers (A, B, C, D) to option text if needed
    let mappedAnswer = qr.studentAnswer;

    // Check if student answer is a single letter and we have options
    if (
      questionData?.options &&
      questionData.options.length > 0 &&
      qr.studentAnswer.length === 1 &&
      qr.studentAnswer.match(/^[A-Z]$/)
    ) {
      // Convert letter to index (A=0, B=1, C=2, D=3)
      const letterIndex = qr.studentAnswer.charCodeAt(0) - "A".charCodeAt(0);

      // Map to option text if valid index
      if (letterIndex >= 0 && letterIndex < questionData.options.length) {
        mappedAnswer = questionData.options[letterIndex];
      }
    }

    return mappedAnswer === distractorOption;
  }).length;
  return distractorResponses / totalResponses;
}






/**
 * Calculate statistical significance using chi-square test for goodness of fit
 *
 * Tests whether the observed performance on a question significantly differs from
 * what would be expected by random chance (guessing).
 *
 * Purpose:
 * - Determines if students performed significantly better than random guessing
 * - Helps identify questions that may be too easy or have obvious correct answers
 * - Validates that the question is measuring actual knowledge vs. luck
 *
 * Formula: χ² = Σ[(Observed - Expected)² / Expected]
 *
 * Test Logic:
 * - For questions with n options, random chance = 1/n probability of being correct
 * - Compares observed correct responses vs. expected correct responses by chance
 * - Higher χ² values indicate greater deviation from random chance
 *
 * Question Types:
 * - True/False (2 options): 50% chance = 0.5 expected probability
 * - Multiple Choice (3 options): 33.3% chance = 0.333 expected probability
 * - Multiple Choice (4 options): 25% chance = 0.25 expected probability
 * - Multiple Choice (5 options): 20% chance = 0.2 expected probability
 * - Up to 12 options: 8.3% chance = 0.083 expected probability
 *
 * @param questionResponses - Array of student responses for a single question
 * @param numberOfOptions - Total number of answer choices (2 for T/F, 3-12 for MC)
 * @param confidenceLevel - Confidence level for statistical tests (default 0.95)
 * @returns StatisticalSignificance object with test results and interpretation
 */
function calculateStatisticalSignificance(
  questionResponses: QuestionResponse[],
  numberOfOptions: number = 4,
  confidenceLevel: number = 0.95,
  zScore: number = 1.96
): StatisticalSignificance {
  const n = questionResponses.length;
  const correctCount = questionResponses.filter((qr) => qr.isCorrect).length;
  const incorrectCount = n - correctCount;

  // Initialize warnings array
  const warnings: string[] = [];

  // Check for sample size issues
  if (n < 30) {
    warnings.push(
      `Sample size (${n}) < 30: Using binomial approximation instead of chi-square test`
    );
  }

  // Chi-square test for goodness of fit
  // Calculate expected probability based on number of options
  const expectedProbability = 1 / numberOfOptions; // Random chance of being correct
  const expectedCorrect = n * expectedProbability;
  const expectedIncorrect = n * (1 - expectedProbability);

  // Check for expected frequency violations
  if (expectedCorrect < 5) {
    warnings.push(
      `Expected correct responses (${expectedCorrect.toFixed(
        1
      )}) < 5: Using binomial test`
    );
  }

  if (expectedIncorrect < 5) {
    warnings.push(
      `Expected incorrect responses (${expectedIncorrect.toFixed(
        1
      )}) < 5: Using binomial test`
    );
  }

  // For small samples, use binomial test instead of chi-square
  if (expectedCorrect < 5 || expectedIncorrect < 5) {
    // Remove duplicate warnings since we already added them above
    // warnings.push(`📊 Using binomial test approximation due to small expected frequencies`);

    // Calculate binomial test statistic (z-score for proportion)
    const proportion = correctCount / n;
    const standardError = Math.sqrt(
      (expectedProbability * (1 - expectedProbability)) / n
    );

    // Calculate z-score for the observed proportion vs expected
    const zStatistic = (proportion - expectedProbability) / standardError;

    // Convert z-score to approximate chi-square (z² for 1 df)
    const approximateChiSquare = Math.pow(zStatistic, 2);

    // Calculate two-tailed p-value from z-score
    const pValue =
      2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(zStatistic)));

    // Get proper critical value based on confidence level
    const alpha = 1 - confidenceLevel;
    const criticalValue = getCriticalValue(1, alpha);

    // Calculate confidence interval for proportion
    const marginOfError =
      zScore * Math.sqrt((proportion * (1 - proportion)) / n);

    return {
      isSignificant: approximateChiSquare > criticalValue,
      pValue: Math.max(0.001, Math.min(0.999, pValue)),
      criticalValue,
      degreesOfFreedom: 1,
      testStatistic: approximateChiSquare,
      confidenceInterval: {
        lower: Math.max(0, proportion - marginOfError),
        upper: Math.min(1, proportion + marginOfError),
      },
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  // Standard chi-square calculation
  const chiSquare =
    Math.pow(correctCount - expectedCorrect, 2) / expectedCorrect +
    Math.pow(incorrectCount - expectedIncorrect, 2) / expectedIncorrect;

  const degreesOfFreedom = 1;

  // Get critical value and p-value from chi-square distribution table
  const alpha = 1 - confidenceLevel;
  const criticalValue = getCriticalValue(degreesOfFreedom, alpha);
  const pValue = calculatePValue(chiSquare, degreesOfFreedom);

  // Calculate confidence interval for proportion
  const proportion = correctCount / n;
  const standardError = Math.sqrt((proportion * (1 - proportion)) / n);
  // For 95% confidence level
  const marginOfError = zScore * standardError;

  return {
    isSignificant: chiSquare > criticalValue,
    pValue,
    criticalValue,
    degreesOfFreedom,
    testStatistic: chiSquare,
    confidenceInterval: {
      lower: Math.max(0, proportion - marginOfError),
      upper: Math.min(1, proportion + marginOfError),
    },
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}






/**
 * Get critical value from chi-square distribution table
 *
 * @param degreesOfFreedom - Degrees of freedom for chi-square test
 * @param alpha - Significance level (e.g., 0.05 for 95% confidence)
 * @returns Critical value for the chi-square distribution
 */
function getCriticalValue(degreesOfFreedom: number, alpha: number): number {
  const table = ss.chiSquaredDistributionTable;

  // Clamp degrees of freedom to available range
  const df = Math.min(Math.max(1, Math.round(degreesOfFreedom)), 100);

  // Convert alpha to string and find closest available significance level
  const availableAlphas = [
    "0.005",
    "0.01",
    "0.025",
    "0.05",
    "0.1",
    "0.5",
    "0.9",
    "0.95",
    "0.975",
    "0.99",
    "0.995",
  ];
  const alphaStr = findClosestAlpha(alpha, availableAlphas);

  // Get critical value from table
  const dfTable = table[df.toString()];
  if (dfTable && dfTable[alphaStr]) {
    return dfTable[alphaStr];
  }

  // Default fallback for df=1, α=0.05
  return 3.841;
}





/**
 * Find the closest alpha value in the available table
 *
 * @param targetAlpha - Target significance level
 * @param availableAlphas - Available alpha values in the table
 * @returns Closest available alpha value as string
 */
function findClosestAlpha(
  targetAlpha: number,
  availableAlphas: string[]
): string {
  const target = targetAlpha;
  let closest = availableAlphas[0];
  let minDiff = Math.abs(target - parseFloat(closest));

  for (const alpha of availableAlphas) {
    const diff = Math.abs(target - parseFloat(alpha));
    if (diff < minDiff) {
      minDiff = diff;
      closest = alpha;
    }
  }

  return closest;
}







/**
 * Calculate approximate p-value for chi-square test statistic
 *
 * @param chiSquare - Chi-square test statistic
 * @param degreesOfFreedom - Degrees of freedom
 * @returns Approximate p-value
 */
function calculatePValue(chiSquare: number, degreesOfFreedom: number): number {
  const table = ss.chiSquaredDistributionTable;
  const df = Math.min(Math.max(1, Math.round(degreesOfFreedom)), 100);
  const dfTable = table[df.toString()];

  if (!dfTable) {
    return 0.5; // Default if no table entry
  }

  // Find where our chi-square value falls in the table
  const pValues = [
    0.995, 0.99, 0.975, 0.95, 0.9, 0.5, 0.1, 0.05, 0.025, 0.01, 0.005,
  ];
  const criticalValues = pValues
    .map((p) => dfTable[p.toString()])
    .filter((v) => v !== undefined);

  // Find the range our chi-square value falls into
  for (let i = 0; i < criticalValues.length - 1; i++) {
    if (chiSquare >= criticalValues[i] && chiSquare < criticalValues[i + 1]) {
      // Linear interpolation between the two p-values
      const p1 = pValues[i];
      const p2 = pValues[i + 1];
      const v1 = criticalValues[i];
      const v2 = criticalValues[i + 1];

      const ratio = (chiSquare - v1) / (v2 - v1);
      return p1 + ratio * (p2 - p1);
    }
  }

  // If chi-square is very small, p-value is high
  if (chiSquare < criticalValues[0]) {
    return 0.99;
  }

  // If chi-square is very large, p-value is low
  if (chiSquare > criticalValues[criticalValues.length - 1]) {
    return 0.001;
  }

  return 0.5; // Default fallback
}






/**
 * Calculate reliability metrics for a question
 */
function calculateReliabilityMetrics(
  responses: StudentResponse[],
  questionId: string
): ReliabilityMetrics | undefined {
  if (responses.length < 3) return undefined;

  try {
    // Calculate Cronbach's alpha for the question
    const questionScores = responses.map((r) => {
      const qr = r.questionResponses.find((q) => q.questionId === questionId);
      return qr ? (qr.isCorrect ? 1 : 0) : 0;
    });

    const totalScores = responses.map((r) => r.totalScore);

    // Calculate item-total correlation
    const itemTotalCorrelation = ss.sampleCorrelation(
      questionScores,
      totalScores
    );

    // Simplified reliability calculation
    const variance = ss.variance(questionScores);
    const totalVariance = ss.variance(totalScores);

    if (totalVariance === 0) return undefined;

    const reliability = (variance / totalVariance) * itemTotalCorrelation;

    // Calculate standard error of measurement
    const standardError = Math.sqrt(variance * (1 - reliability));

    return {
      cronbachsAlpha: reliability,
      standardError,
      confidenceInterval: {
        lower: Math.max(0, reliability - 1.96 * standardError),
        upper: Math.min(1, reliability + 1.96 * standardError),
      },
    };
  } catch (error) {
    return undefined;
  }
}





/**
 * Calculate overall summary statistics using simple-statistics
 */
function calculateSummary(
  questionResults: QuestionAnalysisResult[],
  responses: StudentResponse[],
  config: AnalysisConfig
): AnalysisSummary {
  const averageDifficulty = ss.mean(
    questionResults.map((qr) => qr.difficultyIndex)
  );
  const averageDiscrimination = ss.mean(
    questionResults.map((qr) => qr.discriminationIndex)
  );
  const averagePointBiserial = ss.mean(
    questionResults.map((qr) => qr.pointBiserialCorrelation)
  );

  // Calculate score distribution statistics
  const totalScores = responses.map((r) => r.totalScore);

  // Helper function to safely calculate statistical measures with error handling abd defautl values
  const safeCalculate = (calculation: () => number, defaultValue: number | null, measureName: string): number | null => {
    try {
      return calculation();
    } catch (error) {
      return defaultValue;
    }
  };

  const scoreDistribution: ScoreDistribution = {
    mean: ss.mean(totalScores),
    median: ss.median(totalScores),
    standardDeviation: ss.standardDeviation(totalScores),
    skewness: safeCalculate(() => ss.sampleSkewness(totalScores), null, 'Skewness'),
    kurtosis: safeCalculate(() => ss.sampleKurtosis(totalScores), null, 'Kurtosis'),
    min: ss.min(totalScores),
    max: ss.max(totalScores),
    quartiles: ss.quantile(totalScores, [0.25, 0.5, 0.75]) as [
      number,
      number,
      number
    ],
  };

  // Calculate overall reliability
  const reliabilityMetrics = calculateOverallReliability(responses);

  return {
    averageDifficulty,
    averageDiscrimination,
    averagePointBiserial,
    reliabilityMetrics,
    scoreDistribution,
  };
}





// Calculate Cronbach's alpha, standard error and confidence interval
/*
 Cronbach's alpha is a measure of internal consistency, specifically how closely related a set of items
 (like questions on a survey) are as a group. It's a reliability coefficient, meaning it indicates how 
 consistently a measurement tool measures a concept. A higher Cronbach's alpha (generally closer to 1) 
 suggests greater internal consistency and that the items are measuring the same underlying construct.
 
 Cronbach's alpha Formula: α = (k/(k-1)) × (1 - Σσᵢ²/σₜ²)
 
 Where:
 - k = number of items (questions)
 - σᵢ² = variance of item i
 - σₜ² = variance of total score
*/
function calculateOverallReliability(
  responses: StudentResponse[]
): ReliabilityMetrics | undefined {
  if (responses.length < 3) return undefined;

  try {
    // Create a matrix of question scores
    const questionIds = new Set<string>();
    responses.forEach((r) => {
      r.questionResponses.forEach((qr) => questionIds.add(qr.questionId));
    });

    const questionMatrix = Array.from(questionIds).map((questionId) =>
      responses.map((r) => {
        const qr = r.questionResponses.find((q) => q.questionId === questionId);
        return qr ? (qr.isCorrect ? 1 : 0) : 0;
      })
    );

    const n = questionMatrix.length;
    if (n < 2) return undefined;

    const itemVariances = questionMatrix.map((scores) => ss.variance(scores));
    const totalVariance = ss.variance(responses.map((r) => r.totalScore));

    const sumItemVariances = ss.sum(itemVariances);
    const cronbachsAlpha =
      (n / (n - 1)) * (1 - sumItemVariances / totalVariance);

    const standardError = Math.sqrt(totalVariance * (1 - cronbachsAlpha));

    return {
      cronbachsAlpha,
      standardError,
      confidenceInterval: {
        lower: Math.max(0, cronbachsAlpha - 1.96 * standardError),
        upper: Math.min(1, cronbachsAlpha + 1.96 * standardError),
      },
    };
  } catch (error) {
    return undefined;
  }
}
