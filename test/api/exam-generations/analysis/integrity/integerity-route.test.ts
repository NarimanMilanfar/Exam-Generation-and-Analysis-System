import { NextRequest } from 'next/server';
import prisma from '../../../../../lib/prisma';
import * as biPointAnalysis from '../../../../../app/lib/biPointAnalysis';

// Mock next-auth completely to avoid ES module issues
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url: url || 'http://localhost:3000/api/exam-generations/generation123/analysis/integrity',
  })),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(),
    })),
  },
}));

// Mock dependencies
jest.mock('../../../../../lib/prisma', () => ({
  examGeneration: {
    findUnique: jest.fn(),
  },
  examResult: {
    findMany: jest.fn(),
  },
}));
jest.mock('../../../../../app/lib/biPointAnalysis');

// Import after mocking to avoid ES module issues
const { getServerSession } = require('next-auth');
const { NextResponse } = require('next/server');

// Import the actual route handler
const { GET } = require('../../../../../app/api/exam-generations/[id]/analysis/integrity/route');

describe('Integrity Analysis API', () => {
  const mockSession = {
    user: { id: 'user123', name: 'Test User', email: 'test@example.com' },
  };

  const mockExamGeneration = {
    id: 'generation123',
    examId: 'exam123',
    exam: {
      id: 'exam123',
      title: 'Test Exam',
      description: 'Test Description',
      userId: 'user123',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    variants: [
      {
        id: 'variant1',
        examId: 'exam123',
        variantCode: 'A',
        questionOrder: JSON.stringify([1, 2, 3, 4]),
        answerOrder: JSON.stringify({
          'q1': [0, 1, 2, 3],
          'q2': [1, 2, 3, 0],
          'q3': [2, 3, 0, 1],
          'q4': [3, 0, 1, 2],
        }),
        answerKey: JSON.stringify([
          { questionId: 'q1', questionNumber: 1, correctAnswer: 'A', originalAnswer: 'A' },
          { questionId: 'q2', questionNumber: 2, correctAnswer: 'B', originalAnswer: 'B' },
          { questionId: 'q3', questionNumber: 3, correctAnswer: 'C', originalAnswer: 'C' },
          { questionId: 'q4', questionNumber: 4, correctAnswer: 'D', originalAnswer: 'D' },
        ]),
      },
      {
        id: 'variant2',
        examId: 'exam123',
        variantCode: 'B',
        questionOrder: JSON.stringify([4, 3, 2, 1]),
        answerOrder: JSON.stringify({
          'q1': [3, 0, 1, 2],
          'q2': [2, 3, 0, 1],
          'q3': [1, 2, 3, 0],
          'q4': [0, 1, 2, 3],
        }),
        answerKey: JSON.stringify([
          { questionId: 'q1', questionNumber: 1, correctAnswer: 'D', originalAnswer: 'A' },
          { questionId: 'q2', questionNumber: 2, correctAnswer: 'C', originalAnswer: 'B' },
          { questionId: 'q3', questionNumber: 3, correctAnswer: 'B', originalAnswer: 'C' },
          { questionId: 'q4', questionNumber: 4, correctAnswer: 'A', originalAnswer: 'D' },
        ]),
      },
    ],
  };

  const mockExamResults = [
    {
      id: 'result1',
      examId: 'exam123',
      studentId: 'student1',
      variantCode: 'A',
      score: 85,
      totalPoints: 100,
      percentage: 85,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z'),
      studentAnswers: [
        {
          questionId: 'q1',
          studentAnswer: 'A',
          isCorrect: true,
          points: 25,
        },
        {
          questionId: 'q2',
          studentAnswer: 'B',
          isCorrect: true,
          points: 25,
        },
        {
          questionId: 'q3',
          studentAnswer: 'C',
          isCorrect: true,
          points: 25,
        },
        {
          questionId: 'q4',
          studentAnswer: 'D',
          isCorrect: true,
          points: 10,
        },
      ],
      student: {
        id: 'student1',
        name: 'John Doe',
        studentId: 'S001',
      },
    },
    {
      id: 'result2',
      examId: 'exam123',
      studentId: 'student2',
      variantCode: 'B',
      score: 90,
      totalPoints: 100,
      percentage: 90,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T11:00:00Z'),
      studentAnswers: [
        {
          questionId: 'q1',
          studentAnswer: 'D',
          isCorrect: true,
          points: 25,
        },
        {
          questionId: 'q2',
          studentAnswer: 'C',
          isCorrect: true,
          points: 25,
        },
        {
          questionId: 'q3',
          studentAnswer: 'B',
          isCorrect: true,
          points: 25,
        },
        {
          questionId: 'q4',
          studentAnswer: 'A',
          isCorrect: true,
          points: 15,
        },
      ],
      student: {
        id: 'student2',
        name: 'Jane Smith',
        studentId: 'S002',
      },
    },
  ];

  const mockIntegrityResult = {
    studentSimilarity: {
      'S001 (A)': {
        'S001 (A)': 1.0,
        'S002 (B)': 0.5,
      },
      'S002 (B)': {
        'S001 (A)': 0.5,
        'S002 (B)': 1.0,
      },
    },
    variantSimilarity: {
      'A': {
        'A': 1.0,
        'B': 0.0,
      },
      'B': {
        'A': 0.0,
        'B': 1.0,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.examGeneration.findUnique as jest.Mock).mockResolvedValue(mockExamGeneration);
    (prisma.examResult.findMany as jest.Mock).mockResolvedValue(mockExamResults);
    (biPointAnalysis.analyzeIntegrity as jest.Mock).mockReturnValue(mockIntegrityResult);
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(401);
    expect(responseJson).toEqual({ error: 'Unauthorized' });
  });

  it('should return 404 if exam generation is not found', async () => {
    (prisma.examGeneration.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(404);
    expect(responseJson).toEqual({ error: 'Exam generation not found' });
  });

  it('should return 404 if no student responses are found', async () => {
    (prisma.examResult.findMany as jest.Mock).mockResolvedValue([]);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(404);
    expect(responseJson).toEqual({ error: 'No student responses found' });
  });

  it('should successfully return integrity analysis results', async () => {
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(responseJson).toEqual(mockIntegrityResult);
  });

  it('should transform exam generation data correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    await GET(request, { params: { id: 'generation123' } });

    // Verify that the exam generation was fetched with correct includes
    expect(prisma.examGeneration.findUnique).toHaveBeenCalledWith({
      where: { id: 'generation123' },
      include: {
        exam: true,
        variants: true,
      },
    });
  });

  it('should transform exam results data correctly', async () => {
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    await GET(request, { params: { id: 'generation123' } });

    // Verify that exam results were fetched with correct includes
    expect(prisma.examResult.findMany).toHaveBeenCalledWith({
      where: {
        examId: 'exam123',
      },
      include: {
        studentAnswers: true,
        student: true,
      },
    });
  });

  it('should transform student responses correctly for analysis', async () => {
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    await GET(request, { params: { id: 'generation123' } });

    // Verify that analyzeIntegrity was called with transformed data
    expect(biPointAnalysis.analyzeIntegrity).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'variant1',
          examId: 'exam123',
          variantCode: 'A',
          questions: [],
          metadata: {
            questionOrder: [1, 2, 3, 4],
            optionPermutations: {
              'q1': [0, 1, 2, 3],
              'q2': [1, 2, 3, 0],
              'q3': [2, 3, 0, 1],
              'q4': [3, 0, 1, 2],
            },
            answerKey: expect.any(String),
          },
        }),
        expect.objectContaining({
          id: 'variant2',
          examId: 'exam123',
          variantCode: 'B',
          questions: [],
          metadata: {
            questionOrder: [4, 3, 2, 1],
            optionPermutations: {
              'q1': [3, 0, 1, 2],
              'q2': [2, 3, 0, 1],
              'q3': [1, 2, 3, 0],
              'q4': [0, 1, 2, 3],
            },
            answerKey: expect.any(String),
          },
        }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 'S001 (A)',
          variantCode: 'A',
          questionResponses: expect.arrayContaining([
            expect.objectContaining({
              questionId: 'q1',
              studentAnswer: 'A',
              isCorrect: true,
              points: 25,
              maxPoints: 25,
              responseTime: 0,
            }),
          ]),
          totalScore: 85,
          maxPossibleScore: 100,
          completionTime: 0,
          startedAt: expect.any(Date),
          completedAt: expect.any(Date),
        }),
        expect.objectContaining({
          studentId: 'S002 (B)',
          variantCode: 'B',
          questionResponses: expect.arrayContaining([
            expect.objectContaining({
              questionId: 'q1',
              studentAnswer: 'D',
              isCorrect: true,
              points: 25,
              maxPoints: 25,
              responseTime: 0,
            }),
          ]),
          totalScore: 90,
          maxPossibleScore: 100,
          completionTime: 0,
          startedAt: expect.any(Date),
          completedAt: expect.any(Date),
        }),
      ])
    );
  });

  it('should handle missing variant code gracefully', async () => {
    const mockResultsWithMissingVariantCode = [
      {
        ...mockExamResults[0],
        variantCode: null,
      },
    ];

    (prisma.examResult.findMany as jest.Mock).mockResolvedValue(mockResultsWithMissingVariantCode);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(responseJson).toEqual(mockIntegrityResult);
  });

  it('should handle missing student ID gracefully', async () => {
    const mockResultsWithMissingStudentId = [
      {
        ...mockExamResults[0],
        student: {
          ...mockExamResults[0].student,
          studentId: null,
        },
      },
    ];

    (prisma.examResult.findMany as jest.Mock).mockResolvedValue(mockResultsWithMissingStudentId);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(responseJson).toEqual(mockIntegrityResult);
  });

  it('should handle malformed JSON in variant metadata', async () => {
    const mockGenerationWithMalformedJSON = {
      ...mockExamGeneration,
      variants: [
        {
          ...mockExamGeneration.variants[0],
          questionOrder: 'invalid json',
          answerOrder: 'invalid json',
          answerKey: 'invalid json',
        },
      ],
    };

    (prisma.examGeneration.findUnique as jest.Mock).mockResolvedValue(mockGenerationWithMalformedJSON);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(500);
    expect(responseJson).toEqual({ error: 'Internal server error' });
  });

  it('should handle analysis errors gracefully', async () => {
    (biPointAnalysis.analyzeIntegrity as jest.Mock).mockImplementation(() => {
      throw new Error('Analysis failed');
    });

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(500);
    expect(responseJson).toEqual({ error: 'Internal server error' });
  });

  it('should return correct integrity analysis structure', async () => {
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(responseJson).toHaveProperty('studentSimilarity');
    expect(responseJson).toHaveProperty('variantSimilarity');

    expect(responseJson.studentSimilarity).toBeInstanceOf(Object);
    expect(responseJson.variantSimilarity).toBeInstanceOf(Object);

    // Check student similarity structure
    expect(responseJson.studentSimilarity['S001 (A)']).toBeInstanceOf(Object);
    expect(responseJson.studentSimilarity['S001 (A)']['S001 (A)']).toBe(1.0);
    expect(responseJson.studentSimilarity['S001 (A)']['S002 (B)']).toBe(0.5);

    // Check variant similarity structure
    expect(responseJson.variantSimilarity['A']).toBeInstanceOf(Object);
    expect(responseJson.variantSimilarity['A']['A']).toBe(1.0);
    expect(responseJson.variantSimilarity['A']['B']).toBe(0.0);
  });

  it('should handle empty variants array', async () => {
    const mockGenerationWithNoVariants = {
      ...mockExamGeneration,
      variants: [],
    };

    (prisma.examGeneration.findUnique as jest.Mock).mockResolvedValue(mockGenerationWithNoVariants);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(responseJson).toEqual(mockIntegrityResult);
  });

  it('should handle empty student answers array', async () => {
    const mockResultsWithNoAnswers = [
      {
        ...mockExamResults[0],
        studentAnswers: [],
      },
    ];

    (prisma.examResult.findMany as jest.Mock).mockResolvedValue(mockResultsWithNoAnswers);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/analysis/integrity');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(200);
    expect(responseJson).toEqual(mockIntegrityResult);
  });
}); 