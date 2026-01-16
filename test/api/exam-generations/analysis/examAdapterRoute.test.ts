/**
 * Tests for exam-generations/[id]/analysis route
 * Tests the main function and internal logic for collecting and transforming exam data
 */

// Mock next-auth before importing the route
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { getDataForBiPointAnalysis } from "../../../../app/lib/examAnalysisAdapter";
import { QuestionType } from "../../../../app/types/course";
import prisma from "../../../../lib/prisma";

// Mock Prisma
jest.mock("../../../../lib/prisma", () => ({
  __esModule: true,
  default: {
    examResult: {
      findMany: jest.fn(),
    },
    examVariant: {
      findMany: jest.fn(),
    },
    examQuestion: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = jest.mocked(prisma);

describe("exam-generations/[id]/analysis route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDataForBiPointAnalysis", () => {
    const mockExamId = "exam-123";

    const mockExamResults = [
      {
        id: "result-1",
        studentId: "student-1",
        examId: "exam-123",
        termId: "term-1",
        variantCode: "A",
        score: 8,
        totalPoints: 10,
        percentage: 80,
        createdAt: new Date("2024-01-01T09:00:00Z"),
        updatedAt: new Date("2024-01-01T10:00:00Z"),
        student: {
          id: "student-1",
          name: "John Doe",
          studentId: "S001",
        },
        studentAnswers: [
          {
            questionId: "q1",
            studentAnswer: "A",
            isCorrect: true,
            points: 1,
          },
          {
            questionId: "q2",
            studentAnswer: "B",
            isCorrect: false,
            points: 0,
          },
        ],
      },
      {
        id: "result-2",
        studentId: "student-2",
        examId: "exam-123",
        termId: "term-1",
        variantCode: "B",
        score: 6,
        totalPoints: 10,
        percentage: 60,
        createdAt: new Date("2024-01-01T09:00:00Z"),
        updatedAt: new Date("2024-01-01T10:30:00Z"),
        student: {
          id: "student-2",
          name: "Jane Smith",
          studentId: "S002",
        },
        studentAnswers: [
          {
            questionId: "q1",
            studentAnswer: "B",
            isCorrect: false,
            points: 0,
          },
          {
            questionId: "q2",
            studentAnswer: "B",
            isCorrect: true,
            points: 1,
          },
        ],
      },
    ];

    const mockExamVariants = [
      {
        id: "variant-1",
        examId: "exam-123",
        variantCode: "A",
        questionOrder: "[0, 1]", // Normal order: q1, q2
        answerOrder: '{"q1": [0, 1, 2, 3], "q2": [0, 1]}', // Normal option order
        answerKey:
          '[{"questionId": "q1", "questionNumber": 1, "correctAnswer": "A", "originalAnswer": "A"}, {"questionId": "q2", "questionNumber": 2, "correctAnswer": "True", "originalAnswer": "True"}]',
        createdAt: new Date(),
        updatedAt: new Date(),
        generationId: "gen-1",
        variantNumber: 1,
      },
      {
        id: "variant-2",
        examId: "exam-123",
        variantCode: "B",
        questionOrder: "[1, 0]", // Reversed order: q2, q1
        answerOrder: '{"q1": [1, 0, 3, 2], "q2": [1, 0]}', // Shuffled option order
        answerKey:
          '[{"questionId": "q2", "questionNumber": 1, "correctAnswer": "True", "originalAnswer": "True"}, {"questionId": "q1", "questionNumber": 2, "correctAnswer": "B", "originalAnswer": "A"}]',
        createdAt: new Date(),
        updatedAt: new Date(),
        generationId: "gen-1",
        variantNumber: 2,
      },
    ];

    const mockExamQuestions = [
      {
        id: "eq1",
        examId: "exam-123",
        questionId: "q1",
        questionBankId: "qb-1",
        order: 1,
        points: 2,
        negativePoints: null,
        createdAt: new Date(),
        question: {
          id: "q1",
          text: "What is 2+2?",
          type: "MULTIPLE_CHOICE" as QuestionType,
          correctAnswer: "A",
          options: '["A", "B", "C", "D"]',
          points: 2,
        },
      },
      {
        id: "eq2",
        examId: "exam-123",
        questionId: "q2",
        questionBankId: "qb-1",
        order: 2,
        points: 1,
        negativePoints: null,
        createdAt: new Date(),
        question: {
          id: "q2",
          text: "True or False: The sky is blue",
          type: "TRUE_FALSE" as QuestionType,
          correctAnswer: "True",
          options: null,
          points: 1,
        },
      },
    ];

    const mockExamMetadata = {
      id: "exam-123",
      title: "Math Quiz",
      description: "A basic math quiz",
      createdAt: new Date("2024-01-01T08:00:00Z"),
      updatedAt: new Date("2024-01-01T08:00:00Z"),
    };

    beforeEach(() => {
      // Set up default mocks
      mockPrisma.examResult.findMany.mockResolvedValue(mockExamResults);
      mockPrisma.examVariant.findMany.mockResolvedValue(mockExamVariants);
      mockPrisma.examQuestion.findMany.mockResolvedValue(mockExamQuestions);
    });

    it("should successfully collect and transform exam data", async () => {
      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result).toHaveProperty("studentResponses");
      expect(result).toHaveProperty("examVariants");
      expect(result).toHaveProperty("examMetadata");

      // Check student responses structure
      expect(result.studentResponses).toHaveLength(2);
      expect(result.studentResponses[0]).toMatchObject({
        studentId: "student-1",
        variantCode: "A",
        totalScore: 8,
        maxPossibleScore: 10,
        questionResponses: expect.any(Array),
      });

      // Check exam variants structure
      expect(result.examVariants).toHaveLength(2);
      expect(result.examVariants[0]).toMatchObject({
        id: "variant-1",
        examId: "exam-123",
        variantCode: "A",
        questions: expect.any(Array),
      });

      // Check exam metadata
      expect(result.examMetadata).toEqual(mockExamMetadata);
    });

    it("should call Prisma methods with correct parameters", async () => {
      await getDataForBiPointAnalysis(mockExamId, mockExamMetadata);

      expect(mockPrisma.examResult.findMany).toHaveBeenCalledWith({
        where: { examId: mockExamId },
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

      expect(mockPrisma.examVariant.findMany).toHaveBeenCalledWith({
        where: { examId: mockExamId },
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

      expect(mockPrisma.examQuestion.findMany).toHaveBeenCalledWith({
        where: { examId: mockExamId },
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
    });

    it("should handle empty exam results", async () => {
      mockPrisma.examResult.findMany.mockResolvedValue([]);

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.studentResponses).toEqual([]);
      expect(result.examVariants).toHaveLength(2); // Still have variants
    });

    it("should handle empty exam variants", async () => {
      mockPrisma.examVariant.findMany.mockResolvedValue([]);
      mockPrisma.examQuestion.findMany.mockResolvedValue([]);

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants).toEqual([]);
      expect(result.studentResponses).toHaveLength(2); // Still have student responses
    });

    it("should handle null variant code", async () => {
      const resultsWithNullVariant = [
        {
          ...mockExamResults[0],
          variantCode: null,
        },
      ] as any;

      mockPrisma.examResult.findMany.mockResolvedValue(resultsWithNullVariant);

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.studentResponses[0].variantCode).toBe("default");
    });

    it("should throw error when exam results collection fails", async () => {
      mockPrisma.examResult.findMany.mockRejectedValue(
        new Error("Database error")
      );

      await expect(
        getDataForBiPointAnalysis(mockExamId, mockExamMetadata)
      ).rejects.toThrow("Database error");
    });

    it("should throw error when exam variants collection fails", async () => {
      mockPrisma.examVariant.findMany.mockRejectedValue(
        new Error("Variant error")
      );

      await expect(
        getDataForBiPointAnalysis(mockExamId, mockExamMetadata)
      ).rejects.toThrow("Variant error");
    });

    it("should handle missing question details gracefully", async () => {
      // Mock a student answer for a question that doesn't exist in exam questions
      const resultsWithMissingQuestion = [
        {
          ...mockExamResults[0],
          studentAnswers: [
            {
              questionId: "missing-question",
              studentAnswer: "A",
              isCorrect: true,
              points: 1,
            },
          ],
        },
      ] as any;

      mockPrisma.examResult.findMany.mockResolvedValue(
        resultsWithMissingQuestion
      );

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.studentResponses[0].questionResponses[0]).toMatchObject({
        questionId: "missing-question",
        studentAnswer: "A",
        isCorrect: true,
        points: 1,
        maxPoints: 1, // Default when question details not found
      });
    });

    it("should handle questions without options", async () => {
      const questionsWithoutOptions = [
        {
          ...mockExamQuestions[0],
          question: {
            ...mockExamQuestions[0].question,
            options: null,
          },
        },
      ];

      mockPrisma.examQuestion.findMany.mockResolvedValue(
        questionsWithoutOptions
      );

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0].questions[0].options).toEqual([]);
    });

    it("should handle TRUE_FALSE questions without options", async () => {
      const trueFalseQuestions = [
        {
          ...mockExamQuestions[0],
          question: {
            ...mockExamQuestions[0].question,
            type: "TRUE_FALSE" as QuestionType,
            options: null,
          },
        },
      ];

      // Also update the variant to only reference the one question
      const singleQuestionVariants = mockExamVariants.map((v) => ({
        ...v,
        questionOrder: "[0]", // Only reference the first question
        answerOrder: '{"q1": [0, 1]}', // TRUE_FALSE questions only have 2 options
      }));

      mockPrisma.examQuestion.findMany.mockResolvedValue(trueFalseQuestions);
      mockPrisma.examVariant.findMany.mockResolvedValue(singleQuestionVariants);

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0].questions[0].options).toEqual([
        "True",
        "False",
      ]);
    });

    it("should handle invalid JSON in question options", async () => {
      const questionsWithInvalidOptions = [
        {
          ...mockExamQuestions[0],
          question: {
            ...mockExamQuestions[0].question,
            options: "invalid json",
          },
        },
      ];

      mockPrisma.examQuestion.findMany.mockResolvedValue(
        questionsWithInvalidOptions
      );

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0].questions[0].options).toEqual([]);
    });

    it("should handle invalid JSON in variant questionOrder", async () => {
      const variantsWithInvalidOrder = [
        {
          ...mockExamVariants[0],
          questionOrder: "invalid json",
        },
      ];

      mockPrisma.examVariant.findMany.mockResolvedValue(
        variantsWithInvalidOrder
      );

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0]).toMatchObject({
        id: "variant-1",
        examId: "exam-123",
        variantCode: "A",
        questions: expect.any(Array),
      });
    });

    it("should handle invalid JSON in variant answerOrder", async () => {
      const variantsWithInvalidAnswerOrder = [
        {
          ...mockExamVariants[0],
          answerOrder: "invalid json",
        },
      ];

      mockPrisma.examVariant.findMany.mockResolvedValue(
        variantsWithInvalidAnswerOrder
      );

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0]).toMatchObject({
        id: "variant-1",
        examId: "exam-123",
        variantCode: "A",
        questions: expect.any(Array),
      });
    });

    it("should calculate completion time correctly", async () => {
      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.studentResponses[0].completionTime).toBe(60); // 1 hour = 60 minutes
      expect(result.studentResponses[1].completionTime).toBe(90); // 1.5 hours = 90 minutes
    });

    it("should handle missing student information", async () => {
      const resultsWithoutStudent = [
        {
          ...mockExamResults[0],
          student: null,
        },
      ] as any;

      mockPrisma.examResult.findMany.mockResolvedValue(resultsWithoutStudent);

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.studentResponses[0].studentId).toBe("null");
    });

    it("must use question points from examQuestion when available", async () => {
      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0].questions[0].points).toBe(2); // From examQuestion
      expect(result.examVariants[0].questions[1].points).toBe(1); // From examQuestion
    });

    it("must fall back to question.points when examQuestion points is null", async () => {
      const questionsWithNullPoints = [
        {
          ...mockExamQuestions[0],
          points: null,
        },
      ];

      mockPrisma.examQuestion.findMany.mockResolvedValue(
        questionsWithNullPoints
      );

      const result = await getDataForBiPointAnalysis(
        mockExamId,
        mockExamMetadata
      );

      expect(result.examVariants[0].questions[0].points).toBe(2); // Falls back to question.points
    });
  });
});
