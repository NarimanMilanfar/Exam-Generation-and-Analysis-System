/**
 * Jest unit tests for questionTransformer.ts
 */

import {
  MCQListToCourseTransformer,
  CourseToMCQListTransformer,
  GenericQuestionTransformer,
  questionTransformer,
  QuestionTransformContext,
} from "../../app/lib/questionTransformer";
import {
  Question as CourseQuestion,
  QuestionType,
} from "../../app/types/course";
import { Question as MCQListQuestion } from "../../app/types/mcqlist";

// Mock question data for testing
const mockMCQListQuestions: MCQListQuestion[] = [
  {
    id: "q1",
    text: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
    type: "MULTIPLE_CHOICE",
    points: 2,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q2",
    text: "Is JavaScript a compiled language?",
    options: ["True", "False"],
    correctAnswer: "True",
    type: "TRUE_FALSE",
    points: 1,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q3",
    text: "What does HTML stand for?",
    options: JSON.stringify([
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
    ]) as any,
    correctAnswer: "Hyper Text Markup Language",
    type: "MULTIPLE_CHOICE",
    points: 2,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q4",
    text: "Explain the difference between let and var in JavaScript.",
    options: [],
    correctAnswer: "let has block scope while var has function scope",
    type: "MULTIPLE_CHOICE",
    points: 3,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

const mockCourseQuestions: CourseQuestion[] = [
  {
    id: "q1",
    text: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: "Paris",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q2",
    text: "Is JavaScript a compiled language?",
    options: ["True", "False"],
    correctAnswer: "True",
    type: QuestionType.TRUE_FALSE,
    points: 1,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q3",
    text: "What does HTML stand for?",
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
    ],
    correctAnswer: "Hyper Text Markup Language",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q4",
    text: "Explain the difference between let and var in JavaScript.",
    options: [],
    correctAnswer: "let has block scope while var has function scope",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 3,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

describe("Question Transformer System", () => {
  describe("MCQListToCourseTransformer", () => {
    const transformer = new MCQListToCourseTransformer();

    describe("transform", () => {
      it("should transform MCQList question to Course question", () => {
        const mcqQuestion = mockMCQListQuestions[0];
        const result = transformer.transform(mcqQuestion);

        expect(result).toEqual({
          id: mcqQuestion.id,
          text: mcqQuestion.text,
          options: mcqQuestion.options,
          correctAnswer: mcqQuestion.correctAnswer,
          type: QuestionType.MULTIPLE_CHOICE,
          points: mcqQuestion.points,
          courseId: null,
          createdAt: mcqQuestion.createdAt,
          updatedAt: mcqQuestion.updatedAt,
        });
      });

      it("should handle string options by parsing JSON", () => {
        const mcqQuestion = mockMCQListQuestions[2]; // Has stringified options
        const result = transformer.transform(mcqQuestion);

        expect(Array.isArray(result.options)).toBe(true);
        expect(result.options).toEqual([
          "Hyper Text Markup Language",
          "High Tech Modern Language",
          "Home Tool Markup Language",
        ]);
      });

      it("should handle invalid JSON options gracefully", () => {
        const invalidQuestion = {
          ...mockMCQListQuestions[0],
          options: "invalid json string",
        } as any;

        const result = transformer.transform(invalidQuestion);
        expect(result.options).toEqual([]);
      });

      it("should map TRUE_FALSE type correctly", () => {
        const trueFalseQuestion = mockMCQListQuestions[1];
        const result = transformer.transform(trueFalseQuestion);

        expect(result.type).toBe(QuestionType.TRUE_FALSE);
      });

      it("should normalize True/False correct answers", () => {
        const trueFalseQuestion = {
          ...mockMCQListQuestions[1],
          correctAnswer: "true",
        };
        const result = transformer.transform(trueFalseQuestion);

        expect(result.correctAnswer).toBe("True");
      });

      it("should normalize False correct answers", () => {
        const trueFalseQuestion = {
          ...mockMCQListQuestions[1],
          correctAnswer: "false",
        };
        const result = transformer.transform(trueFalseQuestion);

        expect(result.correctAnswer).toBe("False");
      });

      it("should add default options for True/False questions with missing options", () => {
        const trueFalseQuestion = {
          ...mockMCQListQuestions[1],
          options: [],
        };
        const result = transformer.transform(trueFalseQuestion);

        expect(result.options).toEqual(["True", "False"]);
      });

      it("should replace invalid True/False options with defaults", () => {
        const trueFalseQuestion = {
          ...mockMCQListQuestions[1],
          options: ["Yes", "No", "Maybe"],
        };
        const result = transformer.transform(trueFalseQuestion);

        expect(result.options).toEqual(["True", "False"]);
      });

      it("should map unknown question types to MULTIPLE_CHOICE", () => {
        const unknownTypeQuestion = {
          ...mockMCQListQuestions[0],
          type: "UNKNOWN_TYPE",
        };
        const result = transformer.transform(unknownTypeQuestion);

        expect(result.type).toBe(QuestionType.MULTIPLE_CHOICE);
      });

      it("should handle missing timestamps", () => {
        const questionWithoutTimestamps = {
          ...mockMCQListQuestions[0],
          createdAt: undefined,
          updatedAt: undefined,
        } as any;
        const result = transformer.transform(questionWithoutTimestamps);

        expect(result.createdAt).toBeDefined();
        expect(result.updatedAt).toBeDefined();
        expect(typeof result.createdAt).toBe("string");
        expect(typeof result.updatedAt).toBe("string");
      });
    });
  });

  describe("CourseToMCQListTransformer", () => {
    const transformer = new CourseToMCQListTransformer();

    describe("canTransform", () => {
      it("should return true for valid Course questions", () => {
        const validQuestion = mockCourseQuestions[0];
        expect(transformer.canTransform(validQuestion)).toBe(true);
      });
    });

    describe("transform", () => {
      it("should transform Course question to MCQList question", () => {
        const courseQuestion = mockCourseQuestions[0];
        const result = transformer.transform(courseQuestion);

        expect(result).toEqual({
          id: courseQuestion.id,
          text: courseQuestion.text,
          options: courseQuestion.options,
          correctAnswer: courseQuestion.correctAnswer,
          type: courseQuestion.type,
          points: courseQuestion.points,
          createdAt: courseQuestion.createdAt,
          updatedAt: courseQuestion.updatedAt,
        });
      });

      it("should preserve all properties during transformation", () => {
        const courseQuestion = mockCourseQuestions[1]; // True/False question
        const result = transformer.transform(courseQuestion);

        expect(result.id).toBe(courseQuestion.id);
        expect(result.text).toBe(courseQuestion.text);
        expect(result.options).toEqual(courseQuestion.options);
        expect(result.correctAnswer).toBe(courseQuestion.correctAnswer);
        expect(result.type).toBe(courseQuestion.type);
        expect(result.points).toBe(courseQuestion.points);

        expect(result.createdAt).toBe(courseQuestion.createdAt);
        expect(result.updatedAt).toBe(courseQuestion.updatedAt);
      });
    });
  });

  describe("GenericQuestionTransformer", () => {
    const transformer = new GenericQuestionTransformer();

    describe("transform", () => {
      it("should transform single MCQList question to Course question", () => {
        const mcqQuestion = mockMCQListQuestions[0];
        const result = transformer.transform(mcqQuestion, "mcqlist", "course");

        expect(result).toBeDefined();
        expect((result as CourseQuestion).type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });

      it("should transform array of MCQList questions to Course questions", () => {
        const result = transformer.transform(
          mockMCQListQuestions,
          "mcqlist",
          "course"
        );

        expect(Array.isArray(result)).toBe(true);
        expect((result as CourseQuestion[]).length).toBe(
          mockMCQListQuestions.length
        );
        expect((result as CourseQuestion[])[0].type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });

      it("should transform single Course question to MCQList question", () => {
        const courseQuestion = mockCourseQuestions[0];
        const result = transformer.transform(
          courseQuestion,
          "course",
          "mcqlist"
        );

        expect(result).toBeDefined();
        expect((result as MCQListQuestion).type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });

      it("should transform array of Course questions to MCQList questions", () => {
        const result = transformer.transform(
          mockCourseQuestions,
          "course",
          "mcqlist"
        );

        expect(Array.isArray(result)).toBe(true);
        expect((result as MCQListQuestion[]).length).toBe(
          mockCourseQuestions.length
        );
        expect((result as MCQListQuestion[])[0].type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });

      it("should throw error for unsupported transformation", () => {
        expect(() => {
          transformer.transform(
            mockMCQListQuestions[0],
            "unsupported",
            "course"
          );
        }).toThrow("No transformer found for unsupported-to-course");
      });

      it("should handle context parameter", () => {
        const context: QuestionTransformContext = {
          source: "mcqlist",
          target: "course",
          preserveIds: true,
        };

        const result = transformer.transform(
          mockMCQListQuestions[0],
          "mcqlist",
          "course",
          context
        );
        expect(result).toBeDefined();
      });
    });

    describe("transformMCQListToCourse", () => {
      it("should transform single MCQList question to Course question", () => {
        const mcqQuestion = mockMCQListQuestions[0];
        const result = transformer.transformMCQListToCourse(mcqQuestion);

        expect(result).toBeDefined();
        expect((result as CourseQuestion).type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });

      it("should transform array of MCQList questions to Course questions", () => {
        const result =
          transformer.transformMCQListToCourse(mockMCQListQuestions);

        expect(Array.isArray(result)).toBe(true);
        expect((result as CourseQuestion[]).length).toBe(
          mockMCQListQuestions.length
        );
        expect((result as CourseQuestion[])[0].type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });
    });

    describe("transformCourseToMCQList", () => {
      it("should transform single Course question to MCQList question", () => {
        const courseQuestion = mockCourseQuestions[0];
        const result = transformer.transformCourseToMCQList(courseQuestion);

        expect(result).toBeDefined();
        expect((result as MCQListQuestion).type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });

      it("should transform array of Course questions to MCQList questions", () => {
        const result =
          transformer.transformCourseToMCQList(mockCourseQuestions);

        expect(Array.isArray(result)).toBe(true);
        expect((result as MCQListQuestion[]).length).toBe(
          mockCourseQuestions.length
        );
        expect((result as MCQListQuestion[])[0].type).toBe(
          QuestionType.MULTIPLE_CHOICE
        );
      });
    });
  });

  describe("questionTransformer singleton", () => {
    it("should be an instance of GenericQuestionTransformer", () => {
      expect(questionTransformer).toBeInstanceOf(GenericQuestionTransformer);
    });

    it("should transform MCQList to Course questions", () => {
      const result = questionTransformer.transformMCQListToCourse(
        mockMCQListQuestions[0]
      );
      expect(result).toBeDefined();
      expect((result as CourseQuestion).type).toBe(
        QuestionType.MULTIPLE_CHOICE
      );
    });

    it("should transform Course to MCQList questions", () => {
      const result = questionTransformer.transformCourseToMCQList(
        mockCourseQuestions[0]
      );
      expect(result).toBeDefined();
      expect((result as MCQListQuestion).type).toBe(
        QuestionType.MULTIPLE_CHOICE
      );
    });

    it("should handle True/False questions correctly", () => {
      const trueFalseQuestion = mockMCQListQuestions[1];
      const result =
        questionTransformer.transformMCQListToCourse(trueFalseQuestion);

      expect((result as CourseQuestion).type).toBe(QuestionType.TRUE_FALSE);
      expect((result as CourseQuestion).options).toEqual(["True", "False"]);
    });

    it("should handle stringified options correctly", () => {
      const questionWithStringOptions = mockMCQListQuestions[2];
      const result = questionTransformer.transformMCQListToCourse(
        questionWithStringOptions
      );

      expect(Array.isArray((result as CourseQuestion).options)).toBe(true);
      expect((result as CourseQuestion).options.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle empty options array", () => {
      const questionWithEmptyOptions = {
        ...mockMCQListQuestions[0],
        options: [],
      };
      const result = questionTransformer.transformMCQListToCourse(
        questionWithEmptyOptions
      );

      expect((result as CourseQuestion).options).toEqual([]);
    });

    it("should handle null options", () => {
      const questionWithNullOptions = {
        ...mockMCQListQuestions[0],
        options: null,
      } as any;
      const result = questionTransformer.transformMCQListToCourse(
        questionWithNullOptions
      );

      expect((result as CourseQuestion).options).toEqual([]);
    });

    it("should handle undefined options", () => {
      const questionWithUndefinedOptions = {
        ...mockMCQListQuestions[0],
        options: undefined,
      } as any;
      const result = questionTransformer.transformMCQListToCourse(
        questionWithUndefinedOptions
      );

      expect((result as CourseQuestion).options).toEqual([]);
    });

    it("should handle missing correctAnswer", () => {
      const questionWithoutCorrectAnswer = {
        ...mockMCQListQuestions[0],
        correctAnswer: undefined,
      } as any;
      const result = questionTransformer.transformMCQListToCourse(
        questionWithoutCorrectAnswer
      );

      expect((result as CourseQuestion).correctAnswer).toBeUndefined();
    });

    it("should handle case-insensitive question type mapping", () => {
      const questionWithLowerCaseType = {
        ...mockMCQListQuestions[0],
        type: "multiple_choice",
      };
      const result = questionTransformer.transformMCQListToCourse(
        questionWithLowerCaseType
      );

      expect((result as CourseQuestion).type).toBe(
        QuestionType.MULTIPLE_CHOICE
      );
    });

    it("should handle mixed case question type mapping", () => {
      const questionWithMixedCaseType = {
        ...mockMCQListQuestions[0],
        type: "True_False",
      };
      const result = questionTransformer.transformMCQListToCourse(
        questionWithMixedCaseType
      );

      expect((result as CourseQuestion).type).toBe(QuestionType.TRUE_FALSE);
    });
  });
});
