import { Question as CourseQuestion, QuestionType } from "../types/course";
import { Question as MCQListQuestion } from "../types/mcqlist";

/**
 * Interface for question transformation context
 */
export interface QuestionTransformContext {
  source: "mcqlist" | "course" | "database";
  target: "preview" | "course" | "database";
  preserveIds?: boolean;
  validateOptions?: boolean;
}

/**
 * Base transformer interface
 */
export interface QuestionTransformer<TInput, TOutput> {
  transform(input: TInput, context?: QuestionTransformContext): TOutput;
  canTransform(input: any): boolean;
}

/**
 * Transformer for converting MCQList questions to Course questions
 */
export class MCQListToCourseTransformer
  implements QuestionTransformer<MCQListQuestion, CourseQuestion>
{
  canTransform(input: any): input is MCQListQuestion {
    return (
      input != null &&
      typeof input.id === "string" &&
      typeof input.text === "string" &&
      typeof input.type === "string" &&
      typeof input.points === "number"
    );
  }

  transform(
    input: MCQListQuestion,
    context?: QuestionTransformContext
  ): CourseQuestion {
    // Ensure options are in array format
    let processedOptions = input.options;
    if (typeof input.options === "string") {
      try {
        processedOptions = JSON.parse(input.options);
      } catch (e) {
        console.error("Failed to parse options for question:", input.id, e);
        processedOptions = [];
      }
    }

    // Handle null/undefined options
    if (processedOptions == null) {
      processedOptions = [];
    }

    // Map question types
    const questionType = this.mapQuestionType(input.type);

    // Process correct answer for True/False questions
    let processedCorrectAnswer = input.correctAnswer;
    if (questionType === QuestionType.TRUE_FALSE) {
      // Normalize the correct answer to match default options format
      const normalizedAnswer = input.correctAnswer?.toLowerCase().trim();
      if (normalizedAnswer === "true") {
        processedCorrectAnswer = "True";
      } else if (normalizedAnswer === "false") {
        processedCorrectAnswer = "False";
      }
    }

    // Automatically add default options for True/False questions if missing
    if (questionType === QuestionType.TRUE_FALSE) {
      if (!Array.isArray(processedOptions) || processedOptions.length === 0) {
        processedOptions = ["True", "False"];
      } else if (processedOptions.length !== 2) {
        // If options exist but not exactly 2, replace with defaults
        processedOptions = ["True", "False"];
      }
    }
    return {
      id: input.id,
      text: input.text,
      options: processedOptions,
      correctAnswer: processedCorrectAnswer,
      type: questionType,
      points: input.points,
      courseId: (input as any).courseId || null,
      createdAt: input.createdAt || new Date().toISOString(),
      updatedAt: input.updatedAt || new Date().toISOString(),
    };
  }

  private mapQuestionType(type: string): QuestionType {
    switch (type.toUpperCase()) {
      case "MULTIPLE_CHOICE":
        return QuestionType.MULTIPLE_CHOICE;
      case "TRUE_FALSE":
        return QuestionType.TRUE_FALSE;
      // case "SHORT_ANSWER": //Deprecated - removed from QuestionType enum
      default:
        console.warn(
          `Unknown question type: ${type}, defaulting to MULTIPLE_CHOICE`
        );
        return QuestionType.MULTIPLE_CHOICE;
    }
  }
}

/**
 * Transformer for converting Course questions to MCQList questions
 */
export class CourseToMCQListTransformer
  implements QuestionTransformer<CourseQuestion, MCQListQuestion>
{
  canTransform(input: any): input is CourseQuestion {
    return (
      input != null &&
      typeof input.id === "string" &&
      typeof input.text === "string" &&
      typeof input.type === "string" &&
      Object.values(QuestionType).includes(input.type) &&
      typeof input.points === "number"
    );
  }

  transform(
    input: CourseQuestion,
    context?: QuestionTransformContext
  ): MCQListQuestion {
    return {
      id: input.id,
      text: input.text,
      options: input.options,
      correctAnswer: input.correctAnswer,
      type: input.type,
      points: input.points,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    } as any;
  }
}

/**
 * Generic question singleton Adapter pattern which can handle multiple input/output types
 *
 * To extend this transformer for new formats:
 * 1. Create a new transformer class implementing QuestionTransformer<TInput, TOutput>
 * 2. Add the transformer to the registerTransformers() method
 * 3. Add convenience methods if needed
 *
 * Example:
 * ```ts
 * class DatabaseToPreviewTransformer implements QuestionTransformer<DatabaseQuestion, CourseQuestion> {
 *   transform(input: DatabaseQuestion): CourseQuestion { ... }
 *   canTransform(input: any): input is DatabaseQuestion { ... }
 * }
 * ```
 */
export class GenericQuestionTransformer {
  private transformers: Map<string, QuestionTransformer<any, any>> = new Map();

  constructor() {
    this.registerTransformers();
  }

  private registerTransformers() {
    this.transformers.set(
      "mcqlist-to-course",
      new MCQListToCourseTransformer()
    );
    this.transformers.set(
      "course-to-mcqlist",
      new CourseToMCQListTransformer()
    );

    // Future transformers can be added here:
    // this.transformers.set('database-to-course', new DatabaseToCourseTransformer());
    // this.transformers.set('api-to-course', new APIToCourseTransformer());
  }

  /**
   * Transform questions from one format to another
   */
  transform<TInput, TOutput>(
    input: TInput | TInput[],
    fromType: string,
    toType: string,
    context?: QuestionTransformContext
  ): TOutput | TOutput[] {
    const transformerKey = `${fromType}-to-${toType}`;
    const transformer = this.transformers.get(transformerKey);

    if (!transformer) {
      throw new Error(`No transformer found for ${transformerKey}`);
    }

    if (Array.isArray(input)) {
      return input.map((item) => transformer.transform(item, context));
    } else {
      return transformer.transform(input, context);
    }
  }

  /**
   * Transform MCQList questions to Course questions
   */
  transformMCQListToCourse(
    questions: MCQListQuestion | MCQListQuestion[]
  ): CourseQuestion | CourseQuestion[] {
    return this.transform(questions, "mcqlist", "course");
  }

  /**
   * Transform Course questions to MCQList questions
   */
  transformCourseToMCQList(
    questions: CourseQuestion | CourseQuestion[]
  ): MCQListQuestion | MCQListQuestion[] {
    return this.transform(questions, "course", "mcqlist");
  }
}

// Export singleton instance
export const questionTransformer = new GenericQuestionTransformer();
