import { NextRequest } from 'next/server';
import { GET } from '../../../../../app/api/exam-generations/[id]/analysis/variants/route';
import prisma from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { validateCourseAccess } from '../../../../../lib/coursePermissions';

// Mock dependencies
jest.mock('../../../../../lib/prisma', () => ({
  examGeneration: {
    findUnique: jest.fn(),
  },
  examVariant: {
    findMany: jest.fn(),
  },
  examResult: {
    findMany: jest.fn(),
  },
  examQuestion: {
    findMany: jest.fn(),
  },
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('../../../../../lib/coursePermissions', () => ({
  validateCourseAccess: jest.fn(),
}));

jest.mock('../../../../../app/lib/biPointAnalysis', () => ({
  AnalyzeByVariant: jest.fn(),
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockValidateCourseAccess = validateCourseAccess as jest.MockedFunction<typeof validateCourseAccess>;

// Fix Prisma mock typing
const mockExamGenerationFindUnique = mockPrisma.examGeneration.findUnique as jest.MockedFunction<typeof mockPrisma.examGeneration.findUnique>;
const mockExamVariantFindMany = mockPrisma.examVariant.findMany as jest.MockedFunction<typeof mockPrisma.examVariant.findMany>;
const mockExamResultFindMany = mockPrisma.examResult.findMany as jest.MockedFunction<typeof mockPrisma.examResult.findMany>;
const mockExamQuestionFindMany = mockPrisma.examQuestion.findMany as jest.MockedFunction<typeof mockPrisma.examQuestion.findMany>;

describe('/api/exam-generations/[id]/analysis/variants', () => {
  let mockRequest: NextRequest;
  const mockGenerationId = 'gen-123';
  const mockExamId = 'exam-123';
  const mockCourseId = 'course-123';

  beforeEach(() => {
    jest.clearAllMocks();

    mockRequest = new NextRequest('http://localhost:3000/api/exam-generations/gen-123/analysis/variants');

    // Default successful session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-123' },
    } as any);

    // Default successful course access
    mockValidateCourseAccess.mockResolvedValue({ hasAccess: true, userId: 'user-123' });
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when session has no user', async () => {
      mockGetServerSession.mockResolvedValue({} as any);

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Exam Generation Validation', () => {
    it('should return 404 when exam generation is not found', async () => {
      mockExamGenerationFindUnique.mockResolvedValue(null);

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Exam generation not found');
    });

    it('should return 403 when user has no access to course', async () => {
      mockExamGenerationFindUnique.mockResolvedValue({
        id: mockGenerationId,
        examId: mockExamId,
        exam: {
          id: mockExamId,
          title: 'Test Exam',
          description: 'Test Description',
          createdAt: new Date(),
          updatedAt: new Date(),
          course: {
            id: mockCourseId,
          },
        },
      } as any);

      mockValidateCourseAccess.mockResolvedValue({ hasAccess: false, userId: 'user-123' });

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });
  });

  describe('Data Analysis', () => {
    const mockExamGeneration = {
      id: mockGenerationId,
      examId: mockExamId,
      exam: {
        id: mockExamId,
        title: 'Test Exam',
        description: 'Test Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        course: {
          id: mockCourseId,
        },
      },
    };

    const mockStudentResponses = [
      {
        studentId: 'student-1',
        variantCode: 'V1',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
        ],
        totalScore: 5,
        maxPossibleScore: 10,
      },
    ];

    const mockExamVariants = [
      {
        id: 'variant-1',
        examId: mockExamId,
        variantCode: 'V1',
        questions: [
          {
            id: 'q1',
            questionText: 'Test Question 1',
            questionType: 'MULTIPLE_CHOICE',
            correctAnswer: 'A',
            options: ['A', 'B', 'C', 'D'],
            points: 1,
          },
        ],
      },
    ];

    const mockVariantResults = [
      {
        examId: mockExamId,
        examTitle: 'Test Exam - Variant V1',
        questionResults: [
          {
            questionId: 'q1',
            questionText: 'Test Question 1',
            questionType: 'MULTIPLE_CHOICE',
            totalResponses: 1,
            correctResponses: 1,
            difficultyIndex: 1.0,
            discriminationIndex: 0.5,
            pointBiserialCorrelation: 0.8,
            distractorAnalysis: {
              distractors: [],
              correctOption: {
                option: 'A',
                frequency: 1,
                percentage: 100,
                discriminationIndex: 0.5,
                pointBiserialCorrelation: 0.8,
              },
              omittedResponses: 0,
              omittedPercentage: 0,
            },
            statisticalSignificance: {
              isSignificant: true,
              pValue: 0.01,
              criticalValue: 3.841,
              degreesOfFreedom: 1,
              testStatistic: 4.0,
              confidenceInterval: { lower: 0.8, upper: 1.0 },
            },
            reliabilityMetrics: undefined,
          },
        ],
        summary: {
          averageDifficulty: 1.0,
          averageDiscrimination: 0.5,
          averagePointBiserial: 0.8,
          reliabilityMetrics: undefined,
          scoreDistribution: {
            mean: 5,
            median: 5,
            standardDeviation: 0,
            skewness: null,
            kurtosis: null,
            min: 5,
            max: 5,
            quartiles: [5, 5, 5],
          },
        },
        metadata: {
          totalStudents: 1,
          totalVariants: 1,
          analysisDate: new Date(),
          sampleSize: 1,
          excludedStudents: 0,
          studentResponses: mockStudentResponses,
        },
      },
    ];

    beforeEach(() => {
      mockExamGenerationFindUnique.mockResolvedValue(mockExamGeneration as any);
      
      // Mock the new Prisma queries
      mockExamVariantFindMany.mockResolvedValue([
        {
          id: 'variant-1',
          variantCode: 'V1',
          variantNumber: 1,
          answerKey: JSON.stringify([
            { questionId: 'q1', correctAnswer: 'A', originalAnswer: 'cos(x)' },
            { questionId: 'q2', correctAnswer: 'B', originalAnswer: 'e^x' }
          ]),
          answerOrder: JSON.stringify({
            'q1': [0, 1, 2, 3],
            'q2': [1, 0, 2, 3]
          }),
          createdAt: new Date(),
          updatedAt: new Date(),
          examId: mockExamId,
          questionOrder: null,
          generationId: mockGenerationId
        }
      ]);
      
      mockExamResultFindMany.mockResolvedValue([
        {
          id: 'result-1',
          studentId: 'student-1',
          variantCode: 'V1',
          score: 5,
          totalPoints: 10,
          percentage: 50,
          examId: mockExamId,
          termId: 'term-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          student: {
            id: 'student-1',
            studentId: 'STU001',
            name: 'John Doe',
            createdAt: new Date(),
            updatedAt: new Date()
          },
          studentAnswers: [
            { 
              id: 'sa1',
              questionId: 'q1', 
              studentAnswer: 'A', 
              isCorrect: true,
              examResultId: 'result-1',
              createdAt: new Date(),
              question: {
                id: 'q1',
                points: 5,
                examId: mockExamId,
                questionBankId: 'qb1',
                order: 1,
                negativePoints: null,
                createdAt: new Date()
              }
            },
            { 
              id: 'sa2',
              questionId: 'q2', 
              studentAnswer: 'B', 
              isCorrect: true,
              examResultId: 'result-1',
              createdAt: new Date(),
              question: {
                id: 'q2',
                points: 5,
                examId: mockExamId,
                questionBankId: 'qb1',
                order: 2,
                negativePoints: null,
                createdAt: new Date()
              }
            }
          ]
        } as any
      ]);
      
      mockExamQuestionFindMany.mockResolvedValue([
        {
          id: 'eq1',
          questionId: 'q1',
          points: 5,
          examId: mockExamId,
          questionBankId: 'qb1',
          order: 1,
          negativePoints: null,
          createdAt: new Date(),
          question: {
            id: 'q1',
            text: 'What is the derivative of x³?',
            options: JSON.stringify(['cos(x)', 'sin(x)', 'tan(x)', 'e^x']),
            type: 'MULTIPLE_CHOICE',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } as any,
        {
          id: 'eq2',
          questionId: 'q2',
          points: 5,
          examId: mockExamId,
          questionBankId: 'qb1',
          order: 2,
          negativePoints: null,
          createdAt: new Date(),
          question: {
            id: 'q2',
            text: 'What is the derivative of e^x?',
            options: JSON.stringify(['ln(x)', 'e^x', '1/x', 'x^(x-1)']),
            type: 'MULTIPLE_CHOICE',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } as any
      ]);
      
      const { AnalyzeByVariant } = require('../../../../../app/lib/biPointAnalysis');
      AnalyzeByVariant.mockResolvedValue(mockVariantResults);
    });

    it('should return 400 when no student responses are available', async () => {
      mockExamResultFindMany.mockResolvedValue([]);

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No student results available for this exam generation. Please upload results first.');
    });

    it('should successfully return variant analysis results', async () => {
      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockVariantResults);
      
      // Verify the Prisma queries were called
      expect(mockExamVariantFindMany).toHaveBeenCalledWith({
        where: { generationId: mockGenerationId },
        orderBy: { variantNumber: 'asc' }
      });
      
      expect(mockExamResultFindMany).toHaveBeenCalledWith({
        where: { 
          examId: mockExamId,
          variantCode: { in: ['V1'] }
        },
        include: {
          student: true,
          studentAnswers: {
            include: {
              question: true
            }
          }
        }
      });
      
      expect(mockExamQuestionFindMany).toHaveBeenCalledWith({
        where: { examId: mockExamId },
        include: {
          question: true
        },
        orderBy: { order: 'asc' }
      });
      
      const { AnalyzeByVariant } = require('../../../../../app/lib/biPointAnalysis');
      expect(AnalyzeByVariant).toHaveBeenCalled();
    });

    it('should handle errors during analysis gracefully', async () => {
      const { AnalyzeByVariant } = require('../../../../../app/lib/biPointAnalysis');
      AnalyzeByVariant.mockRejectedValue(new Error('Analysis failed'));

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform variant analysis: Error: Analysis failed');
    });

    it('should handle errors during data fetching gracefully', async () => {
      mockExamVariantFindMany.mockRejectedValue(new Error('Data fetch failed'));

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to perform variant analysis: Error: Data fetch failed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle exam with empty description', async () => {
      const mockExamGeneration = {
        id: mockGenerationId,
        examId: mockExamId,
        exam: {
          id: mockExamId,
          title: 'Test Exam',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          course: { id: mockCourseId },
        },
      };

      mockExamGenerationFindUnique.mockResolvedValue(mockExamGeneration as any);
      
      // Mock the Prisma queries for this test
      mockExamVariantFindMany.mockResolvedValue([
        {
          id: 'variant-1',
          variantCode: 'V1',
          variantNumber: 1,
          answerKey: '[]',
          answerOrder: '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
          examId: mockExamId,
          questionOrder: null,
          generationId: mockGenerationId
        }
      ]);
      mockExamResultFindMany.mockResolvedValue([
        { 
          id: 'result-1',
          studentId: 'student-1', 
          variantCode: 'V1', 
          score: 5, 
          totalPoints: 10, 
          percentage: 50,
          examId: mockExamId,
          termId: 'term-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          student: {
            id: 'student-1',
            studentId: 'STU001',
            name: 'John Doe',
            createdAt: new Date(),
            updatedAt: new Date()
          } as any,
          studentAnswers: [] 
        } as any
      ]);
      mockExamQuestionFindMany.mockResolvedValue([]);
      
      const { AnalyzeByVariant } = require('../../../../../app/lib/biPointAnalysis');
      AnalyzeByVariant.mockResolvedValue([]);

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });

      expect(response.status).toBe(200);
    });

    it('should handle multiple variants correctly', async () => {
      const mockVariantResults = [
        { examId: mockExamId, examTitle: 'Test Exam - Variant V1', questionResults: [], summary: {}, metadata: {} },
        { examId: mockExamId, examTitle: 'Test Exam - Variant V2', questionResults: [], summary: {}, metadata: {} },
      ];

      mockExamGenerationFindUnique.mockResolvedValue({
        id: mockGenerationId,
        examId: mockExamId,
        exam: {
          id: mockExamId,
          title: 'Test Exam',
          description: 'Test Description',
          createdAt: new Date(),
          updatedAt: new Date(),
          course: { id: mockCourseId },
        },
      } as any);
      
      // Mock multiple variants
      mockExamVariantFindMany.mockResolvedValue([
        { 
          id: 'variant-1', 
          variantCode: 'V1', 
          variantNumber: 1, 
          answerKey: '[]', 
          answerOrder: '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
          examId: mockExamId,
          questionOrder: null,
          generationId: mockGenerationId
        },
        { 
          id: 'variant-2', 
          variantCode: 'V2', 
          variantNumber: 2, 
          answerKey: '[]', 
          answerOrder: '{}',
          createdAt: new Date(),
          updatedAt: new Date(),
          examId: mockExamId,
          questionOrder: null,
          generationId: mockGenerationId
        }
      ]);
      
      mockExamResultFindMany.mockResolvedValue([
        { 
          id: 'result-1',
          studentId: 'student-1', 
          variantCode: 'V1', 
          score: 5, 
          totalPoints: 10, 
          percentage: 50,
          examId: mockExamId,
          termId: 'term-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          student: {
            id: 'student-1',
            studentId: 'STU001',
            name: 'John Doe',
            createdAt: new Date(),
            updatedAt: new Date()
          } as any,
          studentAnswers: [] 
        } as any,
        { 
          id: 'result-2',
          studentId: 'student-2', 
          variantCode: 'V2', 
          score: 7, 
          totalPoints: 10, 
          percentage: 70,
          examId: mockExamId,
          termId: 'term-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          student: {
            id: 'student-2',
            studentId: 'STU002',
            name: 'Jane Smith',
            createdAt: new Date(),
            updatedAt: new Date()
          } as any,
          studentAnswers: [] 
        } as any
      ]);
      
      mockExamQuestionFindMany.mockResolvedValue([]);
      
      const { AnalyzeByVariant } = require('../../../../../app/lib/biPointAnalysis');
      AnalyzeByVariant.mockResolvedValue(mockVariantResults);

      const response = await GET(mockRequest, { params: { id: mockGenerationId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
      expect(data[0].examTitle).toBe('Test Exam - Variant V1');
      expect(data[1].examTitle).toBe('Test Exam - Variant V2');
    });
  });
}); 