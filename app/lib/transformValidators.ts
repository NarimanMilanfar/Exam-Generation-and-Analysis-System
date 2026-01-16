import { Question as CourseQuestion, QuestionType } from "../types/course";

/**
 * Validate questions format
 */
export function validateQuestions(questions: CourseQuestion[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  questions.forEach((question, index) => {
    if (!question.text || question.text.trim() === '') {
      errors.push(`Question ${index + 1}: Missing text`);
    }

    if (question.type === QuestionType.MULTIPLE_CHOICE) {
      if (!Array.isArray(question.options) || question.options.length === 0) {
        errors.push(`Question ${index + 1}: Multiple choice question must have options`);
      }
      if (!question.correctAnswer) {
        errors.push(`Question ${index + 1}: Missing correct answer`);
      }
      // Use case-insensitive comparison for multiple choice questions
      const answerInOptions = question.options.some(option =>
        option.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()
      );
      if (!answerInOptions) {
        errors.push(`Question ${index + 1}: Correct answer "${question.correctAnswer}" not found in options [${question.options.join(', ')}]`);
      }
    }

    if (question.type === QuestionType.TRUE_FALSE) {
      // For True/False questions, we'll be more lenient since the transformer adds default options
      if (!question.correctAnswer) {
        errors.push(`Question ${index + 1}: Missing correct answer`);
      } else {
        // Check if the correct answer is either "True" or "False" (case insensitive)
        const normalizedAnswer = question.correctAnswer.toLowerCase().trim();
        if (normalizedAnswer !== 'true' && normalizedAnswer !== 'false') {
          errors.push(`Question ${index + 1}: True/False question must have "True" or "False" as the correct answer`);
        }
      }

      // Only validate options if they exist (transformer will add them if missing)
      if (Array.isArray(question.options) && question.options.length > 0) {
        if (question.options.length !== 2) {
          errors.push(`Question ${index + 1}: True/False question must have exactly 2 options`);
        }
        // Use case-insensitive comparison for True/False questions
        const answerInOptions = question.options.some(option =>
          option.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim()
        );
        if (!answerInOptions) {
          errors.push(`Question ${index + 1}: Correct answer "${question.correctAnswer}" not found in options [${question.options.join(', ')}]`);
        }
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
} 