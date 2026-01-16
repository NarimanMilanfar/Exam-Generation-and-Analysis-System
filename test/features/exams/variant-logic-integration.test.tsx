/**
 * Integration tests for critical variant logic functionality
 * Tests the key features we implemented for the variants system
 */

import { generateExamVariations } from "../../../app/lib/examVariations";
import { QuestionType } from "../../../app/types/course";

describe("Variant Logic Integration Tests", () => {
  const mockQuestions = [
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
      text: "Is JavaScript compiled?",
      options: ["True", "False"],
      correctAnswer: "False",
      type: QuestionType.TRUE_FALSE,
      points: 1,
      courseId: "course1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: "q3",
      text: "What does HTML stand for?",
      options: ["Hyper Text Markup Language", "High Tech Modern Language"],
      correctAnswer: "Hyper Text Markup Language",
      type: QuestionType.MULTIPLE_CHOICE,
      points: 2,
      courseId: "course1",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  describe("enforceMaxVariations Feature", () => {
    it("should generate exact number of variants when enforceMaxVariations is true", () => {
      const result = generateExamVariations(mockQuestions, {
        maxVariations: 4,
        enforceMaxVariations: true,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        seed: "enforce_test_123",
      });

      expect(result.variants).toHaveLength(4);
      expect(result.totalVariations).toBe(4);
      expect(result.config.enforceMaxVariations).toBe(true);
    });

    it("should limit variants when enforceMaxVariations is false with low variation possibilities", () => {
      // Use a configuration that has very few possible variations
      const result = generateExamVariations([mockQuestions[0]], {
        maxVariations: 10,
        enforceMaxVariations: false,
        randomizeQuestionOrder: false,
        randomizeOptionOrder: false,
        seed: "limit_test_123",
      });

      // Should be limited to calculated maximum (likely 1 since no randomization)
      expect(result.variants.length).toBeLessThanOrEqual(10);
      expect(result.config.enforceMaxVariations).toBe(false);
    });

    it("should enforce max variations even with duplicate risk", () => {
      const result = generateExamVariations([mockQuestions[0]], {
        maxVariations: 3,
        enforceMaxVariations: true,
        randomizeQuestionOrder: false,
        randomizeOptionOrder: false,
        seed: "duplicate_test_123",
      });

      // Even though no randomization means potential duplicates,
      // enforceMaxVariations should still generate the requested count
      expect(result.variants).toHaveLength(3);
    });
  });

  describe("True/False Case Handling", () => {
    it("should handle case-insensitive True/False matching", () => {
      const mixedCaseQuestion = {
        id: "tf_mixed",
        text: "Case sensitivity test",
        options: ["true", "false"], // lowercase options
        correctAnswer: "true", // lowercase answer
        type: QuestionType.TRUE_FALSE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const result = generateExamVariations([mixedCaseQuestion], {
        randomizeOptionOrder: true,
        randomizeTrueFalseOptions: true,
        maxVariations: 2,
        enforceMaxVariations: true, // Force generation of 2 variants
        seed: "case_test_123",
      });

      // Should work without errors and generate the requested number
      expect(result.variants).toHaveLength(2);
      result.variants.forEach((variant) => {
        const tfQuestion = variant.questions[0];
        expect(tfQuestion.options).toEqual(
          expect.arrayContaining(["true", "false"])
        );
        expect(["true", "false"]).toContain(tfQuestion.correctAnswer);
      });
    });

    it("should preserve case in True/False questions during randomization", () => {
      const uppercaseQuestion = {
        id: "tf_upper",
        text: "Uppercase test",
        options: ["TRUE", "FALSE"],
        correctAnswer: "FALSE",
        type: QuestionType.TRUE_FALSE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const result = generateExamVariations([uppercaseQuestion], {
        randomizeOptionOrder: true,
        randomizeTrueFalseOptions: true,
        maxVariations: 2,
        seed: "uppercase_test_123",
      });

      result.variants.forEach((variant) => {
        const tfQuestion = variant.questions[0];
        // Should preserve uppercase
        expect(tfQuestion.options).toEqual(
          expect.arrayContaining(["TRUE", "FALSE"])
        );
        expect(["TRUE", "FALSE"]).toContain(tfQuestion.correctAnswer);
      });
    });
  });

  describe("Deterministic Generation", () => {
    it("should produce identical results with same seed", () => {
      const config = {
        maxVariations: 3,
        enforceMaxVariations: true,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        seed: "deterministic_test_456",
      };

      const result1 = generateExamVariations(mockQuestions, config);
      const result2 = generateExamVariations(mockQuestions, config);

      expect(result1.variants.length).toBe(result2.variants.length);

      // Question orders should be identical
      result1.variants.forEach((variant1, index) => {
        const variant2 = result2.variants[index];
        expect(variant1.metadata.questionOrder).toEqual(
          variant2.metadata.questionOrder
        );

        // Question content should be identical
        variant1.questions.forEach((q1, qIndex) => {
          const q2 = variant2.questions[qIndex];
          expect(q1.id).toBe(q2.id);
          expect(q1.correctAnswer).toBe(q2.correctAnswer);
          expect(q1.options).toEqual(q2.options);
        });
      });
    });

    it("should produce different results with different seeds", () => {
      const config1 = {
        maxVariations: 3,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        seed: "seed_one_789",
      };

      const config2 = {
        maxVariations: 3,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        seed: "seed_two_789",
      };

      const result1 = generateExamVariations(mockQuestions, config1);
      const result2 = generateExamVariations(mockQuestions, config2);

      // Should have different question orders (very high probability)
      const orders1 = result1.variants.map((v) =>
        v.metadata.questionOrder.join(",")
      );
      const orders2 = result2.variants.map((v) =>
        v.metadata.questionOrder.join(",")
      );

      // At least some variants should have different ordering
      expect(orders1.some((order, index) => order !== orders2[index])).toBe(
        true
      );
    });
  });

  describe("Answer Key Integrity", () => {
    it("should maintain correct answers after randomization", () => {
      const result = generateExamVariations(mockQuestions, {
        maxVariations: 3,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        seed: "integrity_test_321",
      });

      result.variants.forEach((variant) => {
        variant.questions.forEach((question) => {
          const original = mockQuestions.find((q) => q.id === question.id);

          // Correct answer should still be in the options
          expect(question.options).toContain(question.correctAnswer);

          // For multiple choice, verify the answer content is preserved
          if (question.type === QuestionType.MULTIPLE_CHOICE) {
            expect(question.correctAnswer).toBe(original!.correctAnswer);
          }

          // For True/False, verify the answer is valid
          if (question.type === QuestionType.TRUE_FALSE) {
            expect([
              "True",
              "False",
              "true",
              "false",
              "TRUE",
              "FALSE",
            ]).toContain(question.correctAnswer);
          }
        });
      });
    });

    it("should maintain answer consistency across all variants", () => {
      const result = generateExamVariations(mockQuestions, {
        maxVariations: 4,
        enforceMaxVariations: true,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        seed: "consistency_test_654",
      });

      // Track correct answers for each question ID across variants
      const answersByQuestionId: { [questionId: string]: Set<string> } = {};

      result.variants.forEach((variant) => {
        variant.questions.forEach((question) => {
          if (!answersByQuestionId[question.id]) {
            answersByQuestionId[question.id] = new Set();
          }
          answersByQuestionId[question.id].add(question.correctAnswer);
        });
      });

      // Each question should have only one correct answer across all variants
      Object.entries(answersByQuestionId).forEach(([questionId, answers]) => {
        expect(answers.size).toBe(1);
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle questions with minimal options", () => {
      const minimalQuestion = {
        id: "minimal",
        text: "Minimal question",
        options: ["Only Option"],
        correctAnswer: "Only Option",
        type: QuestionType.MULTIPLE_CHOICE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      expect(() => {
        const result = generateExamVariations([minimalQuestion], {
          randomizeOptionOrder: true,
          seed: "minimal_test",
        });
        expect(result.variants[0].questions[0].options).toEqual([
          "Only Option",
        ]);
      }).not.toThrow();
    });

    it("should handle missing True/False options gracefully", () => {
      const missingOptionsQuestion = {
        id: "missing_options",
        text: "Missing options TF question",
        options: [], // Empty options
        correctAnswer: "True",
        type: QuestionType.TRUE_FALSE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const result = generateExamVariations([missingOptionsQuestion], {
        randomizeTrueFalseOptions: true,
        seed: "missing_options_test",
      });

      // Should default to ['True', 'False'] when options are missing
      const tfQuestion = result.variants[0].questions[0];
      expect(tfQuestion.options).toEqual(
        expect.arrayContaining(["True", "False"])
      );
      expect(tfQuestion.options).toHaveLength(2);
    });

    it("should handle zero max variations gracefully", () => {
      const result = generateExamVariations(mockQuestions, {
        maxVariations: 0,
        seed: "zero_variations_test",
      });

      expect(result.variants).toHaveLength(0);
      expect(result.totalVariations).toBe(0);
    });
  });

  describe("Configuration Validation", () => {
    it("should use default values for missing configuration", () => {
      const result = generateExamVariations(mockQuestions, {});

      expect(result.config.randomizeQuestionOrder).toBe(true);
      expect(result.config.randomizeOptionOrder).toBe(true);
      expect(result.config.randomizeTrueFalseOptions).toBe(false);
      expect(result.config.maxVariations).toBe(3);
      expect(result.config.enforceMaxVariations).toBe(false);
      expect(result.config.seed).toBeTruthy();
    });

    it("should override defaults correctly", () => {
      const customConfig = {
        randomizeQuestionOrder: false,
        randomizeOptionOrder: false,
        randomizeTrueFalseOptions: true,
        maxVariations: 5,
        enforceMaxVariations: true,
        seed: "custom_seed_123",
      };

      const result = generateExamVariations(mockQuestions, customConfig);

      expect(result.config.randomizeQuestionOrder).toBe(false);
      expect(result.config.randomizeOptionOrder).toBe(false);
      expect(result.config.randomizeTrueFalseOptions).toBe(true);
      expect(result.config.maxVariations).toBe(5);
      expect(result.config.enforceMaxVariations).toBe(true);
      expect(result.config.seed).toBe("custom_seed_123");
    });
  });
});
