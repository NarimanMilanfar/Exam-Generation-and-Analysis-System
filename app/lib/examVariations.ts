/*
takes in a list of questions and randomizes based on particular features (the question order, option order)
in such a way that no exam variant is the same. 
*/

import { error } from "console";
import { Question, QuestionType } from "../types/course";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Paragraph } from "docx";

/**
 * Interface for exam variation configuration
 */
export interface ExamVariationConfig {
  randomizeQuestionOrder?: boolean;
  randomizeOptionOrder?: boolean;
  randomizeTrueFalseOptions?: boolean;
  randomizeQuestionSubset?: boolean;
  questionCount?: number; // For subset randomization
  seed?: string; // For reproducible randomization
  maxVariations?: number; // Maximum number of unique variations to generate
  enforceMaxVariations?: boolean; // If true, always generate maxVariations even if duplicates. If false, enforce uniqueness (default)
}

/**
 * Interface for a single exam variant
 */
export interface ExamVariant {
  id: string;
  questions: Question[];
  metadata: {
    originalQuestionCount: number;
    variantNumber: number;
    seed: string;
    timestamp: Date;
    questionOrder: number[]; // Original indices for tracking
    optionPermutations: { [questionId: string]: number[] }; // Track option reordering
  };
}

/**
 * Interface for exam variation result
 */
export interface ExamVariationResult {
  variants: ExamVariant[];
  totalVariations: number;
  config: ExamVariationConfig;
  statistics: {
    uniqueQuestionOrders: number;
    uniqueOptionCombinations: number;
    estimatedTotalPossibleVariations: number;
  };
}

/**
 * Default configuration for exam variations
 */
const DEFAULT_CONFIG: Required<ExamVariationConfig> = {
  randomizeQuestionOrder: true,
  randomizeOptionOrder: true,
  randomizeTrueFalseOptions: false,
  randomizeQuestionSubset: false,
  questionCount: 0,
  seed: "",
  maxVariations: 3,
  enforceMaxVariations: false,
};

/**
 * Seeded random number generator for reproducible results
 * @class SeededRandom
 * @description Provides deterministic pseudo-random number generation using a string seed
 */
class SeededRandomizer {
  private seed: number;

  /**
   * Creates a new SeededRandom instance
   * @param {string} seed - The string seed used to initialize the random number generator
   */
  constructor(seed: string) {
    this.seed = this.hashCode(seed);
  }

  /**
   * Converts a string to a numeric hash code
   * @private
   * @param {string} str - The string to hash
   * @returns {number} A positive integer hash of the input string
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generates the next random number in the sequence
   * @returns {number} A random number between 0 and 1 (exclusive)
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Shuffles an array using the Fisher-Yates algorithm with seeded randomization
   * @template T
   * @param {T[]} array - The array to shuffle
   * @returns {T[]} A new shuffled array (original array is not modified)
   */
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Randomly selects a specified number of elements from an array
   * @template T
   * @param {T[]} array - The array to sample from
   * @param {number} count - The number of elements to select
   * @returns {T[]} A new array containing the randomly selected elements
   */
  sample<T>(array: T[], count: number): T[] {
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
}

/**
 * Creates a deep copy of a question with randomized options
 * @param {Question} question - The question to randomize options for
 * @param {SeededRandomizer} rng - The seeded random number generator to use
 * @param {boolean} randomizeTrueFalse - Whether to randomize True/False question options
 * @param {boolean} randomizeOptions - Whether to randomize multiple choice question options
 * @returns {{question: Question, permutation: number[]}} An object containing the question with shuffled options and the permutation indices
 * @description Randomizes multiple choice questions and optionally True/False questions; other question types are returned unchanged
 */
function randomizeQuestionOptions(
  question: Question,
  rng: SeededRandomizer,
  randomizeTrueFalse: boolean = false,
  randomizeOptions: boolean = true
): {
  question: Question;
  permutation: number[];
} {
  // Handle True/False questions - ALWAYS set options, randomize if enabled
  if (question.type === QuestionType.TRUE_FALSE) {
    // Ensure True/False questions have options, even if not stored in database
    let originalOptions =
      question.options && question.options.length === 2
        ? [...question.options]
        : ["True", "False"];

    if (randomizeTrueFalse) {
      const indices = [0, 1];
      const shuffledIndices = rng.shuffle(indices);
      const newOptions = shuffledIndices.map((i) => originalOptions[i]);

      // Find the new position of the correct answer with case-insensitive comparison
      const correctIndex = originalOptions.findIndex(
        (opt) => opt.toLowerCase() === question.correctAnswer.toLowerCase()
      );
      const newCorrectIndex = shuffledIndices.indexOf(correctIndex);
      const newCorrectAnswer = newOptions[newCorrectIndex];

      return {
        question: {
          ...question,
          options: newOptions,
          correctAnswer: newCorrectAnswer,
        },
        permutation: shuffledIndices,
      };
    } else {
      // Not randomizing but ensure options are set and correctAnswer matches format
      const normalizedCorrectAnswer =
        originalOptions.find(
          (opt) => opt.toLowerCase() === question.correctAnswer.toLowerCase()
        ) || question.correctAnswer;

      return {
        question: {
          ...question,
          options: originalOptions,
          correctAnswer: normalizedCorrectAnswer,
        },
        permutation: [],
      };
    }
  }

  // Handle multiple choice questions only if option randomization is enabled
  if (
    question.type === QuestionType.MULTIPLE_CHOICE &&
    randomizeOptions &&
    question.options &&
    question.options.length > 0
  ) {
    const originalOptions = [...question.options];
    const indices = Array.from({ length: originalOptions.length }, (_, i) => i);
    const shuffledIndices = rng.shuffle(indices);

    const newOptions = shuffledIndices.map((i) => originalOptions[i]);

    // Find the new position of the correct answer with case-insensitive comparison
    const correctIndex = originalOptions.findIndex(
      (opt) => opt.toLowerCase() === question.correctAnswer.toLowerCase()
    );
    const newCorrectIndex = shuffledIndices.indexOf(correctIndex);
    const newCorrectAnswer = newOptions[newCorrectIndex];

    return {
      question: {
        ...question,
        options: newOptions,
        correctAnswer: newCorrectAnswer,
      },
      permutation: shuffledIndices,
    };
  }

  // Return unchanged question for all other cases
  return {
    question: { ...question },
    permutation: [],
  };
}

/**
 * Generates a unique seed for each variation
 * @param {string} baseSeed - The base seed string to build upon
 * @param {number} variationNumber - The variation number (0-based index)
 * @returns {string} A unique seed string for the specific variation
 * @description Combines base seed and variation number to ensure uniqueness while maintaining determinism
 */
function generateVariationSeed(
  baseSeed: string,
  variationNumber: number
): string {
  return `${baseSeed}_v${variationNumber}`;
}

/**
 * Calculates the theoretical maximum number of unique variations
 * @param {Question[]} questions - The array of questions to analyze
 * @param {ExamVariationConfig} config - The configuration settings for variation generation
 * @returns {number} The estimated maximum number of unique variations possible (capped at 1,000,000)
 * @description Considers question order permutations and option order permutations to calculate theoretical maximum
 */
function calculateMaxPossibleVariations(
  questions: Question[],
  config: ExamVariationConfig
): number {
  const questionCount =
    config.randomizeQuestionSubset && config.questionCount
      ? Math.min(config.questionCount, questions.length)
      : questions.length;

  let variations = 1;

  // Question order variations
  if (config.randomizeQuestionOrder) {
    if (config.randomizeQuestionSubset && config.questionCount) {
      // Permutations of selecting and arranging subset
      variations *=
        factorial(questions.length) /
        factorial(questions.length - questionCount);
    } else {
      // All possible arrangements
      variations *= factorial(questionCount);
    }
  }

  // Option order variations
  if (config.randomizeOptionOrder) {
    const multipleChoiceQuestions = questions.filter(
      (q) =>
        q.type === QuestionType.MULTIPLE_CHOICE &&
        q.options &&
        q.options.length > 0
    );

    for (const question of multipleChoiceQuestions) {
      if (question.options) {
        variations *= factorial(question.options.length);
      }
    }
  }

  // True/False option variations
  if (config.randomizeTrueFalseOptions) {
    const trueFalseQuestions = questions.filter(
      (q) =>
        q.type === QuestionType.TRUE_FALSE &&
        q.options &&
        q.options.length === 2
    );

    for (const question of trueFalseQuestions) {
      variations *= 2; // True/False can be arranged in 2 ways
    }
  }

  return Math.min(variations, 100); // Cap at 100 for sanity
}

/**
 * Helper function to calculate factorial
 * @param {number} n - The number to calculate factorial for
 * @returns {number} The factorial of n (n!)
 * @description Returns 1 for n <= 1, otherwise calculates n * (n-1) * ... * 1
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Checks if two variants are identical (for uniqueness validation)
 * @param {ExamVariant} variant1 - The first variant to compare
 * @param {ExamVariant} variant2 - The second variant to compare
 * @returns {boolean} True if the variants are identical, false otherwise
 * @description Compares question order and option permutations to determine if variants are identical
 */
function areVariantsIdentical(
  variant1: ExamVariant,
  variant2: ExamVariant
): boolean {
  // Compare question order
  const order1 = variant1.metadata.questionOrder.join(",");
  const order2 = variant2.metadata.questionOrder.join(",");

  if (order1 !== order2) return false;

  // Compare option permutations for each question
  for (const questionId of Object.keys(variant1.metadata.optionPermutations)) {
    const perm1 =
      variant1.metadata.optionPermutations[questionId]?.join(",") || "";
    const perm2 =
      variant2.metadata.optionPermutations[questionId]?.join(",") || "";

    if (perm1 !== perm2) return false;
  }

  return true;
}

/**
 * Main function to generate exam variations
 * @param {Question[]} questions - Array of questions to create variations from
 * @param {Partial<ExamVariationConfig>} config - Configuration options for variation generation
 * @returns {ExamVariationResult} Object containing generated variants and statistics
 * @throws {Error} When questions array is empty or question count exceeds available questions
 * @description Creates multiple unique exam variants by randomizing question order, option order, and/or question subsets
 * @example
 * const result = generateExamVariations(questions, {
 *   randomizeQuestionOrder: true,
 *   randomizeOptionOrder: true,
 *   maxVariations: 5,
 *   seed: 'my-seed'
 * });
 */
export function generateExamVariations(
  questions: Question[],
  config: Partial<ExamVariationConfig> = {}
): ExamVariationResult {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate input
  if (!questions || questions.length === 0) {
    throw new Error("Questions array cannot be empty");
  }

  if (
    finalConfig.randomizeQuestionSubset &&
    finalConfig.questionCount! > questions.length
  ) {
    throw new Error("Question count cannot exceed total available questions");
  }

  for (const question of questions) {
    //check to see if answer exists in options if not throw an error
    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      if (!question.options || question.options.length === 0) {
        throw new Error(
          `Multiple choice question "${question.text}" must have options`
        );
      }
      if (!question.correctAnswer) {
        throw new Error(
          `Multiple choice question "${question.text}" must have a correct answer`
        );
      }
      if (!question.options.includes(question.correctAnswer)) {
        throw new Error(
          `Correct answer "${question.correctAnswer}" not found in options for question "${question.text}"`
        );
      }
    }
  }

  //if randomized question order is on and only one question return just that question
  if (questions.length == 1 && config.randomizeQuestionOrder) {
    throw new Error("Cannot randomize questions with only one question.");
  }

  // Generate base seed if not provided
  if (!finalConfig.seed) {
    // Create a deterministic seed based on the questions content
    const questionsHash = questions
      .map((q) => `${q.id}_${q.text}_${q.correctAnswer}`)
      .join("|");
    const hash = questionsHash.split("").reduce((a, b) => {
      a = (a << 5) - a + b.charCodeAt(0);
      return a & a;
    }, 0);
    finalConfig.seed = `exam_${Math.abs(hash)}`;
  }

  const variants: ExamVariant[] = [];
  const maxPossibleVariations = calculateMaxPossibleVariations(
    questions,
    finalConfig
  );

  // Determine target variations based on configuration
  let targetVariations: number;
  if (finalConfig.enforceMaxVariations) {
    // Always use the requested maxVariations, but cap it at a reasonable limit to prevent memory issues
    targetVariations = Math.min(finalConfig.maxVariations!, 100);
  } else {
    // Enforce uniqueness - use the minimum of requested and possible variations
    targetVariations = Math.min(
      finalConfig.maxVariations!,
      maxPossibleVariations
    );
  }

  // Generate variants
  for (let i = 0; i < targetVariations; i++) {
    const variantSeed = generateVariationSeed(finalConfig.seed!, i);
    const rng = new SeededRandomizer(variantSeed);

    let variantQuestions = [...questions];
    let questionOrder = Array.from({ length: questions.length }, (_, i) => i);

    // Randomize question subset if configured
    if (finalConfig.randomizeQuestionSubset && finalConfig.questionCount) {
      const selectedQuestions = rng.sample(
        questions,
        finalConfig.questionCount
      );
      variantQuestions = selectedQuestions;
      questionOrder = selectedQuestions.map((q) =>
        questions.findIndex((orig) => orig.id === q.id)
      );
    }

    // Randomize question order using fisher-yates
    if (finalConfig.randomizeQuestionOrder) {
      const shuffledIndices = Array.from(
        { length: variantQuestions.length },
        (_, i) => i
      );
      const shuffled = rng.shuffle(shuffledIndices);
      variantQuestions = shuffled.map((i) => variantQuestions[i]);
      questionOrder = shuffled;
    }

    // Randomize option order for each question
    const optionPermutations: { [questionId: string]: number[] } = {};
    const finalQuestions: Question[] = [];

    for (const question of variantQuestions) {
      const { question: randomizedQuestion, permutation } =
        randomizeQuestionOptions(
          question,
          rng,
          finalConfig.randomizeTrueFalseOptions,
          finalConfig.randomizeOptionOrder
        );
      finalQuestions.push(randomizedQuestion);

      if (permutation.length > 0) {
        optionPermutations[question.id] = permutation;
      }
    }

    // Create variant
    const variant: ExamVariant = {
      id: `variant_${i + 1}_${variantSeed.slice(-8)}`,
      questions: finalQuestions,
      metadata: {
        originalQuestionCount: questions.length,
        variantNumber: i + 1,
        seed: variantSeed,
        timestamp: new Date(),
        questionOrder,
        optionPermutations,
      },
    };

    // Check for uniqueness based on configuration
    if (!finalConfig.enforceMaxVariations && targetVariations < 100) {
      // Enforce uniqueness for smaller sets when not forcing max variations
      const isUnique = !variants.some((existing) =>
        areVariantsIdentical(variant, existing)
      );
      if (isUnique) {
        variants.push(variant);
      }
    } else {
      // Always add the variant - either enforcing max variations or large sets
      variants.push(variant);
    }
  }

  // Calculate statistics
  const uniqueQuestionOrders = new Set(
    variants.map((v) => v.metadata.questionOrder.join(","))
  ).size;

  const uniqueOptionCombinations = new Set(
    variants.map((v) =>
      Object.values(v.metadata.optionPermutations)
        .map((perm) => perm.join(","))
        .join("|")
    )
  ).size;

  return {
    variants,
    totalVariations: variants.length,
    config: finalConfig,
    statistics: {
      uniqueQuestionOrders,
      uniqueOptionCombinations,
      estimatedTotalPossibleVariations: maxPossibleVariations,
    },
  };
}

/**
 * Recreates a specific variant using its seed (for consistency)
 * @param {Question[]} questions - Array of questions to recreate the variant from
 * @param {string} seed - The exact seed string used to recreate the variant deterministically
 * @param {Partial<ExamVariationConfig>} config - Configuration options that were used in the original variant
 * @returns {ExamVariant} The recreated exam variant matching the original
 * @throws {Error} When questions array is empty or question count exceeds available questions
 * @description Uses the provided seed directly to reproduce the exact same variant that was previously generated
 * @example
 * const recreated = recreateVariant(questions, 'original_seed_123', {
 *   randomizeQuestionOrder: true,
 *   randomizeOptionOrder: true
 * });
 */
export function recreateVariant(
  questions: Question[],
  seed: string,
  config: Partial<ExamVariationConfig> = {}
): ExamVariant {
  // Use the exact seed directly instead of going through generateExamVariations
  // which would modify the seed with generateVariationSeed
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Validate input
  if (!questions || questions.length === 0) {
    throw new Error("Questions array cannot be empty");
  }

  if (
    finalConfig.randomizeQuestionSubset &&
    finalConfig.questionCount! > questions.length
  ) {
    throw new Error("Question count cannot exceed total available questions");
  }

  // Use the provided seed directly
  const rng = new SeededRandomizer(seed);

  let variantQuestions = [...questions];
  let questionOrder = Array.from({ length: questions.length }, (_, i) => i);

  // Randomize question subset if configured
  if (finalConfig.randomizeQuestionSubset && finalConfig.questionCount) {
    const selectedQuestions = rng.sample(questions, finalConfig.questionCount);
    variantQuestions = selectedQuestions;
    questionOrder = selectedQuestions.map((q) =>
      questions.findIndex((orig) => orig.id === q.id)
    );
  }

  // Randomize question order
  if (finalConfig.randomizeQuestionOrder) {
    const shuffledIndices = Array.from(
      { length: variantQuestions.length },
      (_, i) => i
    );
    const shuffled = rng.shuffle(shuffledIndices);
    variantQuestions = shuffled.map((i) => variantQuestions[i]);
    questionOrder = shuffled;
  }

  // Randomize option order for each question
  const optionPermutations: { [questionId: string]: number[] } = {};
  const finalQuestions: Question[] = [];

  for (const question of variantQuestions) {
    const { question: randomizedQuestion, permutation } =
      randomizeQuestionOptions(
        question,
        rng,
        finalConfig.randomizeTrueFalseOptions,
        finalConfig.randomizeOptionOrder
      );
    finalQuestions.push(randomizedQuestion);

    if (permutation.length > 0) {
      optionPermutations[question.id] = permutation;
    }
  }

  // Create variant
  const variant: ExamVariant = {
    id: `recreated_${seed.slice(-8)}`,
    questions: finalQuestions,
    metadata: {
      originalQuestionCount: questions.length,
      variantNumber: 1,
      seed: seed,
      timestamp: new Date(),
      questionOrder,
      optionPermutations,
    },
  };

  return variant;
}

/**
 * Validates that exam variations are truly unique
 * @param {ExamVariant[]} variants - Array of exam variants to validate for uniqueness
 * @returns {{isValid: boolean, duplicates: Array<{variant1: number, variant2: number}>, uniquenessScore: number}} Validation results
 * @description Compares all variants to detect duplicates and calculates a uniqueness score (0-1, where 1 is completely unique)
 * @example
 * const validation = validateVariationUniqueness(variants);
 * if (!validation.isValid) {
 *   console.log(`Found ${validation.duplicates.length} duplicate pairs`);
 * }
 */
export function validateVariationUniqueness(variants: ExamVariant[]): {
  isValid: boolean;
  duplicates: Array<{ variant1: number; variant2: number }>;
  uniquenessScore: number; // 0-1, where 1 is completely unique
} {
  const duplicates: Array<{ variant1: number; variant2: number }> = [];

  for (let i = 0; i < variants.length; i++) {
    for (let j = i + 1; j < variants.length; j++) {
      if (areVariantsIdentical(variants[i], variants[j])) {
        duplicates.push({ variant1: i, variant2: j });
      }
    }
  }

  const uniquenessScore =
    variants.length > 0
      ? (variants.length - duplicates.length) / variants.length
      : 0;

  return {
    isValid: duplicates.length === 0,
    duplicates,
    uniquenessScore,
  };
}

/**
 * Exports a variant to a format suitable for exam delivery
 * @param {ExamVariant} variant - The exam variant to export
 * @returns {{examId: string, questions: Array<Object>, metadata: Object}} Formatted exam data ready for delivery
 * @description Converts an ExamVariant to a clean format suitable for presenting to students, with sequential question numbers and calculated totals
 * @example
 * const examData = exportVariantForExam(variant);
 * console.log(`Exam ${examData.examId} has ${examData.metadata.questionCount} questions worth ${examData.metadata.totalPoints} points`);
 */
export function exportVariantForExam(variant: ExamVariant): {
  examId: string;
  questions: Array<{
    id: string;
    text: string;
    type: string;
    options?: string[];
    points: number;
    questionNumber: number;
  }>;
  metadata: {
    variantId: string;
    questionCount: number;
    totalPoints: number;
    generatedAt: Date;
  };
} {
  const totalPoints = variant.questions.reduce((sum, q) => sum + q.points, 0);

  return {
    examId: variant.id,
    questions: variant.questions.map((question, index) => ({
      id: question.id,
      text: question.text,
      type: question.type,
      options: question.options || undefined,
      points: question.points,
      questionNumber: index + 1,
    })),
    metadata: {
      variantId: variant.id,
      questionCount: variant.questions.length,
      totalPoints,
      generatedAt: variant.metadata.timestamp,
    },
  };
}

// Utility function to generate question DOCX content following the template format
export function generateQuestionDOCXContent(questions: any[], includeAnswers: boolean = true) {
  const children: any[] = [];

  questions.forEach((question, qIndex) => {
    // Question text with number
    children.push(
      new Paragraph({
        text: `${qIndex + 1}. ${question.text}`,
      })
    );

    // Options for multiple choice questions
    if (question.type === "MULTIPLE_CHOICE") {
      let options = question.options || [];
      
      options.forEach((option: string, optIndex: number) => {
        const label = String.fromCharCode(65 + optIndex); // A, B, C, D
        children.push(
          new Paragraph({
            text: `${label}. ${option}`,
          })
        );
      });

      // Find the correct answer letter
      const correctIndex = options.findIndex((opt: string) => opt === question.correctAnswer);
      const answerLetter = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";
      
      children.push(
        new Paragraph({
          text: includeAnswers ? `Answer: ${answerLetter}` : "Answer: _____",
        })
      );
    } else if (question.type === "TRUE_FALSE") {
      // For True/False questions, show the answer directly
      children.push(
        new Paragraph({
          text: includeAnswers ? `Answer: ${question.correctAnswer}` : "Answer: _____",
        })
      );
    }

    // Points line
    children.push(
      new Paragraph({
        text: `Point: ${question.points || 1}`,
      })
    );

    // Empty line after each question
    children.push(new Paragraph({ text: "" }));
  });

  return children;
}

// Utility function to generate student CSV content following the template format
export function generateStudentCSVContent(students: any[]) {
  // Follow the exact template format: id,name
  const headers = ["id", "name"];
  const rows = students.map((student) => [
    student.studentId || student.id,
    student.name,
  ]);

  // Create CSV with exact formatting from template
  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(","))
  ].join("\n");

  return csvContent;
}
