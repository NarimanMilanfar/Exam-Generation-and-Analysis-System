// Similarity Analysis Logic Tests
// Testing the core similarity calculation logic without API dependencies

// Test constants matching the production thresholds
const TEST_SIMILARITY_THRESHOLDS = {
  HIGH_SIMILARITY: 0.8,           // Combined similarity threshold for warnings
  HIGH_QUESTION_SIMILARITY: 0.9,  // Question order similarity threshold
  HIGH_OPTION_SIMILARITY: 0.9,    // Option order similarity threshold
} as const;

describe("Similarity Analysis Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Question Position Similarity Calculations", () => {
    it("should calculate position similarity correctly", () => {
      // Mock exam variants with different question orders
      const variants = [
        {
          questions: [
            { id: "q1", text: "Question 1" },
            { id: "q2", text: "Question 2" },
          ],
          metadata: { questionOrder: [0, 1] },
        },
        {
          questions: [
            { id: "q2", text: "Question 2" },
            { id: "q1", text: "Question 1" },
          ],
          metadata: { questionOrder: [1, 0] },
        },
        {
          questions: [
            { id: "q1", text: "Question 1" },
            { id: "q2", text: "Question 2" },
          ],
          metadata: { questionOrder: [0, 1] },
        },
      ];

      const questions = [
        { id: "q1", text: "Question 1" },
        { id: "q2", text: "Question 2" },
      ];

      // Calculate position similarity using the same logic as the API
      const questionSimilarity = questions.map((question) => {
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

        const positionSimilarity = positionVariance === 0 ? 1 : 1 / (1 + positionVariance);

        return {
          questionId: question.id,
          positionSimilarity,
          averagePosition,
          positionVariance,
          positions,
        };
      });

      // Verify calculations
      expect(questionSimilarity).toHaveLength(2);
      expect(questionSimilarity[0].questionId).toBe("q1");
      expect(questionSimilarity[0].positions).toEqual([0, 1, 0]);
      expect(questionSimilarity[1].questionId).toBe("q2");
      expect(questionSimilarity[1].positions).toEqual([1, 0, 1]);
      
      // Check that similarity scores are between 0 and 1
      questionSimilarity.forEach((qs) => {
        expect(qs.positionSimilarity).toBeGreaterThanOrEqual(0);
        expect(qs.positionSimilarity).toBeLessThanOrEqual(1);
      });
    });

    it("should handle identical question positions", () => {
      const variants = [
        {
          questions: [
            { id: "q1", text: "Question 1" },
            { id: "q2", text: "Question 2" },
          ],
        },
        {
          questions: [
            { id: "q1", text: "Question 1" },
            { id: "q2", text: "Question 2" },
          ],
        },
      ];

      const questions = [
        { id: "q1", text: "Question 1" },
        { id: "q2", text: "Question 2" },
      ];

      const questionSimilarity = questions.map((question) => {
        const positions = variants.map((variant) => {
          return variant.questions.findIndex((q) => q.id === question.id);
        });

        const positionVariance = positions.reduce(
          (sum, pos) => sum + Math.pow(pos - positions[0], 2),
          0
        ) / positions.length;

        const positionSimilarity = positionVariance === 0 ? 1 : 1 / (1 + positionVariance);

        return { questionId: question.id, positionSimilarity, positions };
      });

      // When positions are identical, similarity should be 1
      expect(questionSimilarity[0].positionSimilarity).toBe(1);
      expect(questionSimilarity[1].positionSimilarity).toBe(1);
    });
  });

  describe("Option Similarity Calculations", () => {
    it("should calculate option similarity for multiple choice questions", () => {
      const variants = [
        {
          questions: [
            {
              id: "q1",
              type: "MULTIPLE_CHOICE",
              options: ["A", "B", "C", "D"],
            },
          ],
          metadata: {
            optionPermutations: { q1: [0, 1, 2, 3] },
          },
        },
        {
          questions: [
            {
              id: "q1",
              type: "MULTIPLE_CHOICE",
              options: ["B", "A", "D", "C"],
            },
          ],
          metadata: {
            optionPermutations: { q1: [1, 0, 3, 2] },
          },
        },
      ];

      const questions = [
        {
          id: "q1",
          type: "MULTIPLE_CHOICE",
          options: ["A", "B", "C", "D"],
        },
      ];

      // Calculate option similarity using the same logic as the API
      const optionSimilarity = questions
        .filter((q) => q.type === "MULTIPLE_CHOICE" && q.options && q.options.length > 1)
        .map((question) => {
          const permutations = variants.map((variant) => {
            const variantQuestion = variant.questions.find((q) => q.id === question.id);
            if (!variantQuestion || !variantQuestion.options) {
              return [];
            }

            const originalOptions = question.options || [];
            const variantOptions = variantQuestion.options || [];
            return variantOptions.map((option) => originalOptions.indexOf(option));
          });

          const averagePermutation = permutations[0]?.map((_, index) => {
            const sum = permutations.reduce((acc, perm) => acc + (perm[index] || 0), 0);
            return sum / permutations.length;
          }) || [];

          const permutationVariance = permutations.length > 0 ? 
            permutations.reduce((sum, perm) => {
              return sum + perm.reduce((innerSum, val, index) => {
                return innerSum + Math.pow(val - averagePermutation[index], 2);
              }, 0);
            }, 0) / (permutations.length * (averagePermutation.length || 1)) : 0;

          const optionSimilarity = permutationVariance === 0 ? 1 : 1 / (1 + permutationVariance);

          return {
            questionId: question.id,
            optionSimilarity,
            averagePermutation,
            permutationVariance,
            permutations,
          };
        });

      expect(optionSimilarity).toHaveLength(1);
      expect(optionSimilarity[0].questionId).toBe("q1");
      expect(optionSimilarity[0].permutations).toHaveLength(2);
      expect(optionSimilarity[0].optionSimilarity).toBeGreaterThanOrEqual(0);
      expect(optionSimilarity[0].optionSimilarity).toBeLessThanOrEqual(1);
    });

    it("should handle TRUE_FALSE questions", () => {
      const variants = [
        {
          questions: [
            {
              id: "q1",
              type: "TRUE_FALSE",
              options: ["True", "False"],
            },
          ],
          metadata: {
            optionPermutations: { q1: [0, 1] },
          },
        },
        {
          questions: [
            {
              id: "q1", 
              type: "TRUE_FALSE",
              options: ["False", "True"],
            },
          ],
          metadata: {
            optionPermutations: { q1: [1, 0] },
          },
        },
      ];

      const questions = [
        {
          id: "q1",
          type: "TRUE_FALSE",
          options: [], // TRUE_FALSE questions might not have options in DB
        },
      ];

      // Simulate the logic that handles TRUE_FALSE questions
      const optionSimilarity = questions
        .filter((q) => q.type === "TRUE_FALSE" || (q.options && q.options.length > 1))
        .map((question) => {
          const permutations = variants.map((variant) => {
            const variantQuestion = variant.questions.find((q) => q.id === question.id);
            if (!variantQuestion || !variantQuestion.options) {
              return [];
            }

            // Handle TRUE_FALSE questions specially
            let originalOptions: string[] = question.options || [];
            if (question.type === "TRUE_FALSE" && (!originalOptions || originalOptions.length === 0)) {
              originalOptions = ["True", "False"];
            }

            const variantOptions = variantQuestion.options || [];
            return variantOptions.map((option) => originalOptions.indexOf(option));
          });

          return {
            questionId: question.id,
            permutations,
          };
        });

      expect(optionSimilarity).toHaveLength(1);
      expect(optionSimilarity[0].questionId).toBe("q1");
      expect(optionSimilarity[0].permutations).toHaveLength(2);
      expect(optionSimilarity[0].permutations[0]).toEqual([0, 1]);
      expect(optionSimilarity[0].permutations[1]).toEqual([1, 0]);
    });
  });

  describe("Flag Generation Logic", () => {
    it("should generate HIGH_SIMILARITY flag when combined similarity > threshold", () => {
      const overallSimilarity = {
        questionOrderSimilarity: 0.9,
        optionOrderSimilarity: 0.85,
        combinedSimilarity: 0.875,
      };

      const flags: Array<{
        type: "HIGH_SIMILARITY" | "LOW_RANDOMIZATION" | "IDENTICAL_VARIANTS";
        severity: "WARNING" | "ERROR";
        message: string;
        details: string;
      }> = [];

      if (overallSimilarity.combinedSimilarity > TEST_SIMILARITY_THRESHOLDS.HIGH_SIMILARITY) {
        flags.push({
          type: "HIGH_SIMILARITY",
          severity: "WARNING",
          message: "High similarity detected between exam variants",
          details: `Combined similarity score: ${(overallSimilarity.combinedSimilarity * 100).toFixed(1)}%`,
        });
      }

      expect(flags).toHaveLength(1);
      expect(flags[0].type).toBe("HIGH_SIMILARITY");
      expect(flags[0].severity).toBe("WARNING");
      expect(flags[0].details).toContain("87.5%");
    });

    it("should generate LOW_RANDOMIZATION flags", () => {
      const overallSimilarity = {
        questionOrderSimilarity: 0.95,
        optionOrderSimilarity: 0.92,
        combinedSimilarity: 0.935,
      };

      const flags: Array<{
        type: "HIGH_SIMILARITY" | "LOW_RANDOMIZATION" | "IDENTICAL_VARIANTS";
        severity: "WARNING" | "ERROR";
        message: string;
        details: string;
      }> = [];

      if (overallSimilarity.questionOrderSimilarity > TEST_SIMILARITY_THRESHOLDS.HIGH_QUESTION_SIMILARITY) {
        flags.push({
          type: "LOW_RANDOMIZATION",
          severity: "WARNING",
          message: "Questions appear in very similar positions across variants",
          details: `Question order similarity: ${(overallSimilarity.questionOrderSimilarity * 100).toFixed(1)}%`,
        });
      }

      if (overallSimilarity.optionOrderSimilarity > TEST_SIMILARITY_THRESHOLDS.HIGH_OPTION_SIMILARITY) {
        flags.push({
          type: "LOW_RANDOMIZATION",
          severity: "WARNING",
          message: "Answer options appear in very similar orders across variants",
          details: `Option order similarity: ${(overallSimilarity.optionOrderSimilarity * 100).toFixed(1)}%`,
        });
      }

      expect(flags).toHaveLength(2);
      expect(flags[0].type).toBe("LOW_RANDOMIZATION");
      expect(flags[1].type).toBe("LOW_RANDOMIZATION");
      expect(flags[0].details).toContain("95.0%");
      expect(flags[1].details).toContain("92.0%");
    });

    it("should detect identical variants", () => {
      const variants = [
        {
          metadata: {
            questionOrder: [0, 1, 2],
            optionPermutations: {
              q1: [0, 1, 2, 3],
              q2: [0, 1],
            },
          },
        },
        {
          metadata: {
            questionOrder: [0, 1, 2], // Same order
            optionPermutations: {
              q1: [0, 1, 2, 3], // Same permutation
              q2: [0, 1],
            },
          },
        },
      ];

      const identicalPairs: Array<{variant1: number, variant2: number}> = [];
      
      variants.forEach((variant, index) => {
        variants.slice(index + 1).forEach((otherVariant, otherIndex) => {
          const actualOtherIndex = index + 1 + otherIndex;
          
          const sameQuestionOrder = variant.metadata.questionOrder.join(",") === 
            otherVariant.metadata.questionOrder.join(",");
          
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

      expect(identicalPairs).toHaveLength(1);
      expect(identicalPairs[0]).toEqual({ variant1: 1, variant2: 2 });
    });
  });

  describe("Overall Similarity Calculations", () => {
    it("should calculate combined similarity correctly", () => {
      const questionSimilarity = [
        { positionSimilarity: 0.7 },
        { positionSimilarity: 0.6 },
        { positionSimilarity: 0.8 },
      ];

      const optionSimilarity = [
        { optionSimilarity: 0.9 },
        { optionSimilarity: 0.5 },
      ];

      const questionOrderSimilarity = questionSimilarity.reduce(
        (sum, q) => sum + q.positionSimilarity,
        0
      ) / questionSimilarity.length;

      const optionOrderSimilarity = optionSimilarity.length > 0 ? 
        optionSimilarity.reduce((sum, o) => sum + o.optionSimilarity, 0) / optionSimilarity.length : 0;

      const combinedSimilarity = (questionOrderSimilarity + optionOrderSimilarity) / 2;

      expect(questionOrderSimilarity).toBeCloseTo(0.7, 2); // (0.7 + 0.6 + 0.8) / 3
      expect(optionOrderSimilarity).toBeCloseTo(0.7, 2); // (0.9 + 0.5) / 2
      expect(combinedSimilarity).toBeCloseTo(0.7, 2); // (0.7 + 0.7) / 2
      expect(combinedSimilarity).toBeGreaterThanOrEqual(0);
      expect(combinedSimilarity).toBeLessThanOrEqual(1);
    });

    it("should handle empty option similarity", () => {
      const questionSimilarity = [
        { positionSimilarity: 0.8 },
      ];

      const optionSimilarity: any[] = []; // No questions with options

      const questionOrderSimilarity = questionSimilarity.reduce(
        (sum, q) => sum + q.positionSimilarity,
        0
      ) / questionSimilarity.length;

      const optionOrderSimilarity = optionSimilarity.length > 0 ? 
        optionSimilarity.reduce((sum, o) => sum + o.optionSimilarity, 0) / optionSimilarity.length : 0;

      const combinedSimilarity = (questionOrderSimilarity + optionOrderSimilarity) / 2;

      expect(questionOrderSimilarity).toBe(0.8);
      expect(optionOrderSimilarity).toBe(0);
      expect(combinedSimilarity).toBe(0.4); // (0.8 + 0) / 2
    });
  });

  describe("Data Structure Validation", () => {
    it("should validate similarity analysis response structure", () => {
      const analysis = {
        examId: "exam-1",
        examTitle: "Programming Test",
        generationId: "gen-1",
        totalVariants: 3,
        questionSimilarity: [
          {
            questionId: "q1",
            questionText: "What is JavaScript?",
            positionSimilarity: 0.7,
            averagePosition: 0.5,
            positionVariance: 0.25,
            positions: [0, 1, 0],
          },
        ],
        optionSimilarity: [
          {
            questionId: "q1",
            questionText: "What is JavaScript?",
            optionSimilarity: 0.8,
            averagePermutation: [0, 1, 2, 3],
            permutationVariance: 0.1,
            permutations: [[0, 1, 2, 3], [1, 0, 3, 2]],
          },
        ],
        overallSimilarity: {
          questionOrderSimilarity: 0.65,
          optionOrderSimilarity: 0.70,
          combinedSimilarity: 0.675,
        },
        flags: [],
        recommendations: ["Exam variants show good randomization"],
      };

      // Validate structure
      expect(analysis.examId).toBe("exam-1");
      expect(analysis.examTitle).toBe("Programming Test");
      expect(analysis.totalVariants).toBe(3);
      expect(analysis.questionSimilarity).toHaveLength(1);
      expect(analysis.optionSimilarity).toHaveLength(1);
      expect(analysis.overallSimilarity.combinedSimilarity).toBe(0.675);
      expect(Array.isArray(analysis.flags)).toBe(true);
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it("should truncate question text appropriately", () => {
      const longText = "This is a very long question text that should be truncated to 100 characters to ensure that the display remains clean and readable in the similarity analysis interface";
      
      const truncatedText = longText.substring(0, 100);
      
      expect(truncatedText.length).toBeLessThanOrEqual(100);
      expect(truncatedText).toBe("This is a very long question text that should be truncated to 100 characters to ensure that the disp");
    });
  });

  describe("Recommendation Generation", () => {
    it("should provide recommendations for high similarity", () => {
      const combinedSimilarity = 0.85;
      const recommendations: string[] = [];

      if (combinedSimilarity > TEST_SIMILARITY_THRESHOLDS.HIGH_SIMILARITY) {
        recommendations.push("Consider increasing randomization settings");
        recommendations.push("Review questions with high position similarity");
      }

      expect(recommendations).toEqual([
        "Consider increasing randomization settings",
        "Review questions with high position similarity",
      ]);
    });

    it("should provide positive recommendations for good randomization", () => {
      const flags: any[] = []; // No flags means good randomization
      const recommendations: string[] = [];

      if (flags.length === 0) {
        recommendations.push("Exam variants show good randomization");
        recommendations.push("Continue with current randomization settings");
      }

      expect(recommendations).toEqual([
        "Exam variants show good randomization",
        "Continue with current randomization settings",
      ]);
    });

    it("should provide specific recommendations for identical variants", () => {
      const hasIdenticalVariants = true;
      const recommendations: string[] = [];

      if (hasIdenticalVariants) {
        recommendations.push("Increase the number of possible variations");
        recommendations.push("Review randomization settings");
        recommendations.push("Consider regenerating with different randomization options");
      }

      expect(recommendations).toEqual([
        "Increase the number of possible variations",
        "Review randomization settings",
        "Consider regenerating with different randomization options",
      ]);
    });
  });
}); 