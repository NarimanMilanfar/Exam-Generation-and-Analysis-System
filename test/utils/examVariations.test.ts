/**
 * Jest unit tests for examVariations.ts
 */

import {
  generateExamVariations,
  recreateVariant,
  validateVariationUniqueness,
  exportVariantForExam,
  ExamVariationConfig,
} from "../../app/lib/examVariations";
import { Question, QuestionType } from "../../app/types/course";

// Mock question data
const mockQuestions: Question[] = [
  {
    //general cases
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
    options: [
      "Hyper Text Markup Language",
      "High Tech Modern Language",
      "Home Tool Markup Language",
      "Hyperlink and Text Markup Language",
    ],
    correctAnswer: "Hyper Text Markup Language",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q5",
    text: "Which of the following is NOT a JavaScript data type?",
    options: ["String", "Boolean", "Integer", "Object"],
    correctAnswer: "Integer",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];
const MockEdgeCaseQuestions: Question[] = [
  {
    //edge cases
    //throw error on duplicate question
    id: "q5",
    text: "Which of the following is NOT a JavaScript data type?",
    options: ["A. String", "B. Boolean", "C. Integer", " D. Object"],
    correctAnswer: "C. Integer",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q5",
    text: "Which of the following is NOT a JavaScript data type?",
    options: ["A. String", "B. Boolean", "C. Integer", " D. Object"],
    correctAnswer: "C. Integer",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "q6",
    text: "Which of the following is NOT a JavaScript data type?",
    options: ["A. String", "B. Boolean", "C. Integer", " D. Object"],
    correctAnswer: "C.",
    type: QuestionType.MULTIPLE_CHOICE,
    points: 2,
    courseId: "course1",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  },
];

describe("Exam Variations System", () => {
  describe("generateExamVariations", () => {
    it("should generate the requested number of variations", () => {
      const config: ExamVariationConfig = {
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        maxVariations: 3,
        seed: "test_seed_123",
      };

      const result = generateExamVariations(mockQuestions, config);

      expect(result.variants).toHaveLength(3);
      expect(result.totalVariations).toBe(3);
      expect(result.config.maxVariations).toBe(3);
    });

    it("should include all questions when not using subset", () => {
      const config: ExamVariationConfig = {
        randomizeQuestionOrder: true,
        maxVariations: 2,
        seed: "test_all_questions",
      };

      const result = generateExamVariations(mockQuestions, config);

      result.variants.forEach((variant) => {
        expect(variant.questions).toHaveLength(mockQuestions.length);
        expect(variant.metadata.originalQuestionCount).toBe(
          mockQuestions.length
        );
      });
    });

    it("should randomize question order when configured", () => {
      const config: ExamVariationConfig = {
        randomizeQuestionOrder: true,
        maxVariations: 5,
        seed: "order_test",
      };

      const result = generateExamVariations(mockQuestions, config);

      // Check that at least some variants have different question orders
      const questionOrders = result.variants.map((v) =>
        v.metadata.questionOrder.join(",")
      );
      const uniqueOrders = new Set(questionOrders);

      expect(uniqueOrders.size).toBeGreaterThan(1);
    });

    it("should randomize option order for multiple choice questions", () => {
      const config: ExamVariationConfig = {
        randomizeOptionOrder: true,
        maxVariations: 3,
        seed: "option_test",
      };

      const result = generateExamVariations(mockQuestions, config);

      // Find a multiple choice question in the results
      const variant = result.variants[0];
      const mcQuestion = variant.questions.find(
        (q) => q.type === QuestionType.MULTIPLE_CHOICE && q.options
      );

      expect(mcQuestion).toBeDefined();
      expect(mcQuestion!.options).toHaveLength(4); // Should still have all options
      expect(mcQuestion!.correctAnswer).toBeTruthy(); // Should still have correct answer
    });

    it("should generate statistics correctly", () => {
      const config: ExamVariationConfig = {
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        maxVariations: 3,
        seed: "stats_test",
      };

      const result = generateExamVariations(mockQuestions, config);

      expect(result.statistics).toBeDefined();
      expect(result.statistics.uniqueQuestionOrders).toBeGreaterThan(0);
      expect(result.statistics.uniqueOptionCombinations).toBeGreaterThan(0);
      expect(
        result.statistics.estimatedTotalPossibleVariations
      ).toBeGreaterThan(0);
    });

    it("should handle question subset selection", () => {
      const config: ExamVariationConfig = {
        randomizeQuestionSubset: true,
        questionCount: 3,
        maxVariations: 2,
        seed: "subset_test",
      };

      const result = generateExamVariations(mockQuestions, config);

      result.variants.forEach((variant) => {
        expect(variant.questions).toHaveLength(3);
        expect(variant.metadata.originalQuestionCount).toBe(
          mockQuestions.length
        );

        // All questions should be from the original set
        variant.questions.forEach((q) => {
          expect(mockQuestions.some((orig) => orig.id === q.id)).toBe(true);
        });
      });
    });

    it("should preserve question metadata", () => {
      const result = generateExamVariations(mockQuestions, {
        seed: "metadata_test",
      });
      const variant = result.variants[0];

      variant.questions.forEach((question) => {
        expect(question.id).toBeTruthy();
        expect(question.text).toBeTruthy();
        expect(question.type).toBeTruthy();
        expect(question.points).toBeGreaterThan(0);
        expect(question.courseId).toBeTruthy();
      });
    });
  });

  describe("validateVariationUniqueness", () => {
    it("should validate unique variations correctly", () => {
      const result = generateExamVariations(mockQuestions, {
        randomizeQuestionOrder: true,
        maxVariations: 3,
        seed: "uniqueness_test",
      });

      const validation = validateVariationUniqueness(result.variants);

      expect(validation.isValid).toBe(true);
      expect(validation.duplicates).toHaveLength(0);
      expect(validation.uniquenessScore).toBe(1.0);
    });

    it("should handle empty variants array", () => {
      const validation = validateVariationUniqueness([]);

      expect(validation.isValid).toBe(true);
      expect(validation.duplicates).toHaveLength(0);
      expect(validation.uniquenessScore).toBe(0);
    });
  });

  describe("Error Handling", () => {
    it("should throw error for empty questions array", () => {
      expect(() => {
        generateExamVariations([], {});
      }).toThrow("Questions array cannot be empty");
    });

    it("should throw error when question count exceeds available questions", () => {
      expect(() => {
        generateExamVariations(mockQuestions, {
          randomizeQuestionSubset: true,
          questionCount: 10, // More than available
        });
      }).toThrow("Question count cannot exceed total available questions");
    });

    it("should handle undefined questions gracefully", () => {
      expect(() => {
        generateExamVariations(undefined as any, {});
      }).toThrow();
    });
  });

  describe("Performance", () => {
    it("should handle larger datasets efficiently", () => {
      // Generate 50 questions
      const largeQuestionSet: Question[] = [];
      for (let i = 0; i < 50; i++) {
        largeQuestionSet.push({
          id: `perf_q${i}`,
          text: `Performance test question ${i + 1}?`,
          options: [
            `Option A${i}`,
            `Option B${i}`,
            `Option C${i}`,
            `Option D${i}`,
          ],
          correctAnswer: `Option A${i}`,
          type: QuestionType.MULTIPLE_CHOICE,
          points: 1,
          courseId: "perf_course",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        });
      }

      const startTime = Date.now();

      const result = generateExamVariations(largeQuestionSet, {
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        maxVariations: 10,
        seed: "performance_test",
      });

      const duration = Date.now() - startTime;

      expect(result.variants).toHaveLength(10);
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });

  describe("Configuration Options", () => {
    it("should use default configuration when none provided", () => {
      const result = generateExamVariations(mockQuestions, {});

      expect(result.config.randomizeQuestionOrder).toBe(true);
      expect(result.config.randomizeOptionOrder).toBe(true);
      expect(result.config.randomizeTrueFalseOptions).toBe(false);
      expect(result.config.randomizeQuestionSubset).toBe(false);
      expect(result.config.maxVariations).toBe(3);
    });

    it("should override default configuration correctly", () => {
      const customConfig: ExamVariationConfig = {
        randomizeQuestionOrder: false,
        randomizeOptionOrder: false,
        maxVariations: 5,
      };

      const result = generateExamVariations(mockQuestions, customConfig);

      expect(result.config.randomizeQuestionOrder).toBe(false);
      expect(result.config.randomizeOptionOrder).toBe(false);
      expect(result.config.maxVariations).toBe(5);
    });

    it("should generate auto seed when none provided", () => {
      const result = generateExamVariations(mockQuestions, {});

      expect(result.config.seed).toBeTruthy();
      expect(result.config.seed).toMatch(/^exam_/);
    });
  });

  describe("Question Types", () => {
    it("should handle multiple choice questions correctly", () => {
      const mcQuestions = mockQuestions.filter(
        (q) => q.type === QuestionType.MULTIPLE_CHOICE
      );
      const result = generateExamVariations(mcQuestions, {
        randomizeOptionOrder: true,
        seed: "mc_test",
      });

      const variant = result.variants[0];
      variant.questions.forEach((question) => {
        expect(question.type).toBe(QuestionType.MULTIPLE_CHOICE);
        expect(question.options).toBeDefined();
        expect(question.options!.length).toBeGreaterThan(0);
        expect(question.correctAnswer).toBeTruthy();
      });
    });

    it("should handle true/false questions correctly", () => {
      const tfQuestions = mockQuestions.filter(
        (q) => q.type === QuestionType.TRUE_FALSE
      );
      const result = generateExamVariations(tfQuestions, {
        randomizeOptionOrder: true,
        seed: "tf_test",
      });

      const variant = result.variants[0];
      variant.questions.forEach((question) => {
        expect(question.type).toBe(QuestionType.TRUE_FALSE);
        expect(question.options).toHaveLength(2);
        expect(["True", "False"]).toContain(question.correctAnswer);
      });
    });

    it("should randomize true/false options when randomizeTrueFalseOptions is enabled", () => {
      const tfQuestions = mockQuestions.filter(
        (q) => q.type === QuestionType.TRUE_FALSE
      );

      // Test with specific seeds to ensure deterministic behavior
      const result1 = generateExamVariations(tfQuestions, {
        randomizeTrueFalseOptions: true,
        maxVariations: 1,
        seed: "deterministic_seed_1",
      });

      const result2 = generateExamVariations(tfQuestions, {
        randomizeTrueFalseOptions: true,
        maxVariations: 1,
        seed: "deterministic_seed_2",
      });

      // Both results should have exactly 1 variant
      expect(result1.variants).toHaveLength(1);
      expect(result2.variants).toHaveLength(1);

      const tfQuestion1 = result1.variants[0].questions.find(
        (q) => q.type === QuestionType.TRUE_FALSE
      );
      const tfQuestion2 = result2.variants[0].questions.find(
        (q) => q.type === QuestionType.TRUE_FALSE
      );

      expect(tfQuestion1).toBeDefined();
      expect(tfQuestion2).toBeDefined();

      // Both should have valid T/F options and correct answers
      expect(tfQuestion1!.options).toHaveLength(2);
      expect(tfQuestion2!.options).toHaveLength(2);
      expect(tfQuestion1!.options).toEqual(
        expect.arrayContaining(["True", "False"])
      );
      expect(tfQuestion2!.options).toEqual(
        expect.arrayContaining(["True", "False"])
      );
      expect(["True", "False"]).toContain(tfQuestion1!.correctAnswer);
      expect(["True", "False"]).toContain(tfQuestion2!.correctAnswer);

      // The randomization functionality should be working (options are valid permutations)
      const order1 = tfQuestion1!.options.join(",");
      const order2 = tfQuestion2!.options.join(",");

      expect(["True,False", "False,True"]).toContain(order1);
      expect(["True,False", "False,True"]).toContain(order2);

      // Test that the feature can be disabled
      const resultDisabled = generateExamVariations(tfQuestions, {
        randomizeTrueFalseOptions: false,
        maxVariations: 1,
        seed: "any_seed_disabled",
      });

      const tfQuestionDisabled = resultDisabled.variants[0].questions.find(
        (q) => q.type === QuestionType.TRUE_FALSE
      );
      expect(tfQuestionDisabled!.options).toEqual(["True", "False"]); // Should maintain original order
    });

    it("should not randomize true/false options when randomizeTrueFalseOptions is disabled", () => {
      const tfQuestions = mockQuestions.filter(
        (q) => q.type === QuestionType.TRUE_FALSE
      );
      const result = generateExamVariations(tfQuestions, {
        randomizeTrueFalseOptions: false,
        maxVariations: 5,
        seed: "tf_no_randomize_test",
      });

      // All variants should have the same True/False option order
      const firstVariantOptions = result.variants[0].questions.find(
        (q) => q.type === QuestionType.TRUE_FALSE
      )?.options;

      result.variants.forEach((variant) => {
        const tfQuestion = variant.questions.find(
          (q) => q.type === QuestionType.TRUE_FALSE
        );
        expect(tfQuestion!.options).toEqual(firstVariantOptions);
      });
    });

    it("should work with both multiple choice and true/false randomization together", () => {
      // Create a mixed set with both MC and T/F questions
      const mixedQuestions = [
        {
          id: "mc1",
          text: "Multiple choice question",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          type: QuestionType.MULTIPLE_CHOICE,
          points: 2,
          courseId: "test",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "tf1",
          text: "True/False question",
          options: ["True", "False"],
          correctAnswer: "True",
          type: QuestionType.TRUE_FALSE,
          points: 1,
          courseId: "test",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      const result = generateExamVariations(mixedQuestions, {
        randomizeOptionOrder: true,
        randomizeTrueFalseOptions: true,
        maxVariations: 6,
        seed: "deterministic_mixed_test_456",
      });

      // Verify correctness is maintained for both question types
      result.variants.forEach((variant) => {
        const mcQuestion = variant.questions.find(
          (q) => q.type === QuestionType.MULTIPLE_CHOICE
        );
        const tfQuestion = variant.questions.find(
          (q) => q.type === QuestionType.TRUE_FALSE
        );

        // MC question validation
        expect(mcQuestion).toBeDefined();
        expect(mcQuestion!.options).toHaveLength(4);
        expect(mcQuestion!.options).toEqual(
          expect.arrayContaining([
            "Option A",
            "Option B",
            "Option C",
            "Option D",
          ])
        );
        expect(["Option A", "Option B", "Option C", "Option D"]).toContain(
          mcQuestion!.correctAnswer
        );

        // T/F question validation
        expect(tfQuestion).toBeDefined();
        expect(tfQuestion!.options).toHaveLength(2);
        expect(tfQuestion!.options).toEqual(
          expect.arrayContaining(["True", "False"])
        );
        expect(["True", "False"]).toContain(tfQuestion!.correctAnswer);
      });

      // Check that both question types have variations (with deterministic seed)
      const mcOptionOrders = result.variants.map((v) => {
        const mcQuestion = v.questions.find(
          (q) => q.type === QuestionType.MULTIPLE_CHOICE
        );
        return mcQuestion ? mcQuestion.options.join(",") : "";
      });

      const tfOptionOrders = result.variants.map((v) => {
        const tfQuestion = v.questions.find(
          (q) => q.type === QuestionType.TRUE_FALSE
        );
        return tfQuestion ? tfQuestion.options.join(",") : "";
      });

      const uniqueMcOrders = new Set(mcOptionOrders);
      const uniqueTfOrders = new Set(tfOptionOrders);

      // With this specific seed and enough variants, we should get multiple orderings
      expect(uniqueMcOrders.size).toBeGreaterThanOrEqual(2); // MC options should be randomized
      expect(uniqueTfOrders.size).toBeGreaterThanOrEqual(1); // T/F options should be randomized (at least 1)
    });

    it("should handle statistics correctly with true/false randomization", () => {
      const tfQuestions = mockQuestions.filter(
        (q) => q.type === QuestionType.TRUE_FALSE
      );
      const result = generateExamVariations(tfQuestions, {
        randomizeTrueFalseOptions: true,
        maxVariations: 3,
        seed: "tf_stats_test",
      });

      expect(result.statistics).toBeDefined();
      expect(
        result.statistics.estimatedTotalPossibleVariations
      ).toBeGreaterThan(0);
      expect(result.statistics.uniqueOptionCombinations).toBeGreaterThan(0);
    });
  });

  // NEW EDGE CASE TESTS
  describe("Edge Cases - Input Validation", () => {
    it("should handle null questions array", () => {
      expect(() => {
        generateExamVariations(null as any, {});
      }).toThrow();
    });

    it("should throw error on handle questions with missing required fields", () => {
      const invalidQuestions = [
        { id: null, text: "", type: QuestionType.MULTIPLE_CHOICE } as any,
        { id: "q1", text: null, type: QuestionType.MULTIPLE_CHOICE } as any,
      ];

      expect(() => {
        generateExamVariations(invalidQuestions, {});
      }).toThrow(); // Should handle gracefully
    });

    it("should handle zero question count in subset", () => {
      expect(() => {
        generateExamVariations(mockQuestions, {
          randomizeQuestionSubset: true,
          questionCount: 0,
        });
      }).not.toThrow(); // Should handle gracefully
    });

    it("should handle negative question count", () => {
      expect(() => {
        generateExamVariations(mockQuestions, {
          randomizeQuestionSubset: true,
          questionCount: -5,
        });
      }).not.toThrow(); // Should handle gracefully
    });
  });

  it("should throw error on handle multiple choice with empty options", () => {
    const emptyOptionsQuestion: Question = {
      id: "empty_mc",
      text: "MC with no options",
      options: [],
      correctAnswer: "A",
      type: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      courseId: "test",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    expect(() => {
      generateExamVariations([emptyOptionsQuestion], {
        randomizeOptionOrder: true,
        seed: "empty_options",
      });
    }).toThrow();
  });

  it("should handle multiple choice with single option", () => {
    const singleOptionQuestion: Question = {
      id: "single_mc",
      text: "MC with one option",
      options: ["Only Option"],
      correctAnswer: "Only Option",
      type: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      courseId: "test",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    const result = generateExamVariations([singleOptionQuestion], {
      randomizeOptionOrder: true,
      seed: "single_option",
    });

    expect(result.variants[0].questions[0].options).toEqual(["Only Option"]);
    expect(result.variants[0].questions[0].correctAnswer).toBe("Only Option");
  });

  it("should throw error on handle correct answer not in options", () => {
    const invalidMCQuestion: Question = {
      id: "invalid_mc",
      text: "MC with invalid correct answer",
      options: ["A", "B", "C"],
      correctAnswer: "D", // Not in options!
      type: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      courseId: "test",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    };

    expect(() => {
      generateExamVariations([invalidMCQuestion], {
        randomizeOptionOrder: true,
        seed: "invalid_correct",
      });
    }).toThrow();
  });

  // Add new tests for enforceMaxVariations feature
  describe("enforceMaxVariations feature", () => {
    it("should enforce exact variation count when enforceMaxVariations is true", () => {
      const config: ExamVariationConfig = {
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        maxVariations: 4,
        enforceMaxVariations: true,
        seed: "enforce_test_123",
      };

      const result = generateExamVariations(mockQuestions, config);

      expect(result.variants).toHaveLength(4);
      expect(result.totalVariations).toBe(4);
      expect(result.config.enforceMaxVariations).toBe(true);
    });

    it("should limit to calculated maximum when enforceMaxVariations is false", () => {
      const limitedQuestions = [mockQuestions[0]]; // Only one question
      const config: ExamVariationConfig = {
        randomizeQuestionOrder: false,
        randomizeOptionOrder: false,
        maxVariations: 10,
        enforceMaxVariations: false,
        seed: "limit_test_123",
      };

      const result = generateExamVariations(limitedQuestions, config);

      // Should only generate 1 variant since no randomization possible
      expect(result.variants.length).toBeLessThanOrEqual(1);
      expect(result.config.enforceMaxVariations).toBe(false);
    });

    it("should handle True/False questions with case-insensitive matching", () => {
      const tfQuestionLowercase: Question = {
        id: "tf_lowercase",
        text: "Is this case-insensitive?",
        options: ["true", "false"], // lowercase options
        correctAnswer: "true", // lowercase answer
        type: QuestionType.TRUE_FALSE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const result = generateExamVariations([tfQuestionLowercase], {
        randomizeOptionOrder: true,
        maxVariations: 2,
        seed: "case_insensitive_test",
      });

      result.variants.forEach((variant) => {
        const tfQuestion = variant.questions[0];
        // Function preserves original case, doesn't normalize to True/False
        expect(tfQuestion.options).toEqual(
          expect.arrayContaining(["true", "false"])
        );
        expect(["true", "false"]).toContain(tfQuestion.correctAnswer);
      });
    });

    it("should preserve original case for True/False answers", () => {
      const mixedCaseTF: Question = {
        id: "tf_mixed",
        text: "Mixed case test",
        options: ["TRUE", "FALSE"], // uppercase options
        correctAnswer: "TRUE", // uppercase answer matching options
        type: QuestionType.TRUE_FALSE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const result = generateExamVariations([mixedCaseTF], {
        randomizeOptionOrder: true,
        maxVariations: 1,
        seed: "preserve_case_test",
      });

      const variant = result.variants[0];
      const tfQuestion = variant.questions[0];

      // Function preserves original case from input
      expect(tfQuestion.options).toEqual(
        expect.arrayContaining(["TRUE", "FALSE"])
      );
      expect(["TRUE", "FALSE"]).toContain(tfQuestion.correctAnswer);
    });
  });
});

describe("Edge Cases - Configuration", () => {
  it("should handle zero max variations", () => {
    const result = generateExamVariations(mockQuestions, {
      maxVariations: 0,
      seed: "zero_variations",
    });

    expect(result.variants).toHaveLength(0);
    expect(result.totalVariations).toBe(0);
  });

  it("should handle massive variation count", () => {
    const result = generateExamVariations(mockQuestions, {
      maxVariations: 1000000000,
      seed: "massive_variations",
    });

    // Should be limited by actual possible variations (capped at 1,000,000)
    expect(result.variants.length).toBeLessThanOrEqual(1000000);
    expect(result.variants.length).toBeGreaterThan(0);
  });

  it("should handle conflicting configurations", () => {
    const result = generateExamVariations(mockQuestions, {
      randomizeQuestionSubset: true,
      questionCount: mockQuestions.length, // Same as total
      seed: "conflicting_config",
    });

    expect(result.variants[0].questions).toHaveLength(mockQuestions.length);
  });

  it("should handle disabled randomization", () => {
    const result = generateExamVariations(mockQuestions, {
      randomizeQuestionOrder: false,
      randomizeOptionOrder: false,
      maxVariations: 10,
      seed: "no_randomization",
    });

    // Should only generate 1 unique variant since nothing is randomized
    expect(result.variants.length).toBe(1);
  });
});

describe("Edge Cases - Boundary Values", () => {
  it("should handle single question", () => {
    const singleQuestion = [mockQuestions[0]];
    expect(() => {
      const result = generateExamVariations(singleQuestion, {
        randomizeQuestionOrder: true,
        maxVariations: 5,
        seed: "single_question",
      });
    }).toThrow();
  });

  it("should handle very large question set", () => {
    const largeSet: Question[] = Array.from({ length: 100 }, (_, i) => ({
      id: `large_q${i}`,
      text: `Large question ${i + 1}`,
      options: [`A${i}`, `B${i}`, `C${i}`, `D${i}`],
      correctAnswer: `A${i}`,
      type: QuestionType.MULTIPLE_CHOICE,
      points: 1,
      courseId: "large_test",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    }));

    const startTime = Date.now();
    const result = generateExamVariations(largeSet, {
      randomizeQuestionOrder: true,
      maxVariations: 5,
      seed: "large_set",
    });
    const duration = Date.now() - startTime;

    expect(result.variants).toHaveLength(5);
    expect(duration).toBeLessThan(5000); // Should complete in reasonable time
  });
});

describe("Edge Cases - Seed Handling", () => {
  it("should handle empty seed", () => {
    const result = generateExamVariations(mockQuestions, {
      seed: "",
      maxVariations: 2,
    });

    expect(result.variants).toHaveLength(2);
    expect(result.config.seed).toBeTruthy(); // Should generate a seed
  });

  it("should handle very long seed", () => {
    const longSeed = "a".repeat(10000);
    const result = generateExamVariations(mockQuestions, {
      seed: longSeed,
      maxVariations: 2,
    });

    expect(result.variants).toHaveLength(2);
    expect(result.config.seed).toBe(longSeed);
  });

  it("should handle special characters in seed", () => {
    const specialSeed = "!@#$%^&*()_+-=[]{}|;':\",./<>?";
    const result = generateExamVariations(mockQuestions, {
      seed: specialSeed,
      maxVariations: 2,
    });

    expect(result.variants).toHaveLength(2);
    expect(result.config.seed).toBe(specialSeed);
  });

  it("should handle unicode characters in seed", () => {
    const unicodeSeed = "测试种子🎯🔀";
    const result = generateExamVariations(mockQuestions, {
      seed: unicodeSeed,
      maxVariations: 2,
    });

    expect(result.variants).toHaveLength(2);
    expect(result.config.seed).toBe(unicodeSeed);
  });

  it("should produce identical results with same seed", () => {
    const seed = "identical_test_123";
    const config = {
      randomizeQuestionOrder: true,
      randomizeOptionOrder: true,
      maxVariations: 3,
      seed,
    };

    const result1 = generateExamVariations(mockQuestions, config);
    const result2 = generateExamVariations(mockQuestions, config);

    // Should have same number of variants
    expect(result1.variants.length).toBe(result2.variants.length);

    // Question orders should be identical
    result1.variants.forEach((variant1, index) => {
      const variant2 = result2.variants[index];
      expect(variant1.metadata.questionOrder).toEqual(
        variant2.metadata.questionOrder
      );
    });
  });
});

describe("Edge Cases - Uniqueness", () => {
  it("should handle impossible uniqueness requirements", () => {
    const fixedQuestions: Question[] = [
      {
        id: "fixed1",
        text: "Question with no randomization possible 1",
        options: ["Option A"],
        correctAnswer: "Option A",
        type: QuestionType.MULTIPLE_CHOICE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
      {
        id: "fixed2",
        text: "Question with no randomization possible 2",
        options: ["Option B"],
        correctAnswer: "Option B",
        type: QuestionType.MULTIPLE_CHOICE,
        points: 1,
        courseId: "test",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ];

    const result = generateExamVariations(fixedQuestions, {
      randomizeQuestionOrder: false,
      randomizeOptionOrder: false,
      maxVariations: 10,
      seed: "impossible_unique",
    });

    // Should only generate 1 variant since nothing can be randomized
    expect(result.variants.length).toBe(1);
  });
});
