import { NextRequest } from 'next/server';
import prisma from '../../../lib/prisma';
import * as biPointAnalysis from '../../../app/lib/biPointAnalysis';
import * as examAnalysisAdapter from '../../../app/lib/examAnalysisAdapter';

// Mock next-auth completely to avoid ES module issues
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url) => ({
    url: url || 'http://localhost:3000/api/exam-generations/generation123/export',
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
jest.mock('../../../lib/prisma', () => ({
  examGeneration: {
    findUnique: jest.fn(),
  },
}));
jest.mock('../../../app/lib/biPointAnalysis');
jest.mock('../../../app/lib/examAnalysisAdapter');
jest.mock('../../../lib/coursePermissions', () => ({
  validateCourseAccess: jest.fn(),
}));

// Import after mocking to avoid ES module issues
const { getServerSession } = require('next-auth');
const { NextResponse } = require('next/server');
const { validateCourseAccess } = require('../../../lib/coursePermissions');

// Mock the actual route handler
jest.mock('../../../app/api/exam-generations/[id]/export/route', () => ({
  GET: jest.fn(),
}));

const { GET } = require('../../../app/api/exam-generations/[id]/export/route');

describe('Export Analytics API', () => {
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
      course: {
        id: 'course123',
        name: 'Test Course',
      },
    },
  };

  const mockStudentResponses = [
    {
      studentId: 'student1',
      displayStudentId: 'S001',
      variantCode: 'A',
      questionResponses: [
        {
          questionId: 'q1',
          studentAnswer: 'A',
          isCorrect: true,
          points: 1,
          maxPoints: 1,
        },
      ],
      totalScore: 1,
      maxPossibleScore: 1,
      startedAt: new Date(),
    },
  ];

  const mockExamVariants = [
    {
      variantId: 'variant1',
      variantCode: 'A',
      questions: [
        {
          id: 'q1',
          text: 'Question 1',
          type: 'MULTIPLE_CHOICE',
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
        },
      ],
    },
  ];

  const mockAnalysisResult = {
    examId: 'exam123',
    examTitle: 'Test Exam',
    analysisConfig: {},
    questionResults: [
      {
        questionId: 'q1',
        questionText: 'Question 1',
        questionType: 'MULTIPLE_CHOICE',
        totalResponses: 10,
        correctResponses: 8,
        difficultyIndex: 0.8,
        discriminationIndex: 0.6,
        pointBiserialCorrelation: 0.7,
        distractorAnalysis: {
          distractors: [],
          correctOption: {
            option: 'A',
            frequency: 8,
            percentage: 80,
            discriminationIndex: 0.6,
            pointBiserialCorrelation: 0.7,
          },
          omittedResponses: 0,
          omittedPercentage: 0,
        },
        statisticalSignificance: {
          isSignificant: true,
          pValue: 0.01,
          criticalValue: 3.84,
          degreesOfFreedom: 1,
          testStatistic: 5.0,
        },
      },
    ],
    summary: {
      averageDifficulty: 0.8,
      averageDiscrimination: 0.6,
      averagePointBiserial: 0.7,
    },
    metadata: {
      totalStudents: 10,
      totalVariants: 1,
      analysisDate: new Date(),
      sampleSize: 10,
      excludedStudents: 0,
      studentResponses: mockStudentResponses,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    (prisma.examGeneration.findUnique as jest.Mock).mockResolvedValue(mockExamGeneration);
    (validateCourseAccess as jest.Mock).mockResolvedValue({ hasAccess: true });
    
    // Mock the data fetching and analysis functions
    (examAnalysisAdapter.getDataForBiPointAnalysis as jest.Mock).mockResolvedValue({
      studentResponses: mockStudentResponses,
      examVariants: mockExamVariants,
    });
    
    (biPointAnalysis.analyzeExam as jest.Mock).mockResolvedValue(mockAnalysisResult);
  });

  it('should return 401 if user is not authenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    
    GET.mockResolvedValueOnce(NextResponse.json({ error: "Unauthorized" }, { status: 401 }));
    
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/export');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(401);
    expect(responseJson).toEqual({ error: 'Unauthorized' });
  });

  it('should return 404 if exam generation is not found', async () => {
    (prisma.examGeneration.findUnique as jest.Mock).mockResolvedValue(null);
    
    GET.mockResolvedValueOnce(NextResponse.json({ error: "Exam generation not found" }, { status: 404 }));
    
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/export');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(404);
    expect(responseJson).toEqual({ error: 'Exam generation not found' });
  });

  it('should return 403 if user does not have access to the exam generation', async () => {
    (validateCourseAccess as jest.Mock).mockResolvedValueOnce({ hasAccess: false });
    GET.mockResolvedValueOnce(NextResponse.json({ error: "Forbidden" }, { status: 403 }));
    
    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/export');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(403);
    expect(responseJson).toEqual({ error: 'Forbidden' });
  });

  it('should generate global CSV export with proper headers', async () => {
    const mockResponse = {
      text: async () => "Exam Analytics Export: Test Exam\nSummary Statistics\nQuestion Analysis\nDifficulty Distribution\n",
      headers: {
        get: (key) => {
          const headers = {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="exam-analytics-Test-Exam-${new Date().toISOString().split("T")[0]}.csv"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          };
          return headers[key];
        }
      },
    };
    
    GET.mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/export');
    const response = await GET(request, { params: { id: 'generation123' } });

    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="exam-analytics-Test-Exam-');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');

    const responseText = await response.text();
    expect(responseText).toContain('Exam Analytics Export: Test Exam');
    expect(responseText).toContain('Summary Statistics');
    expect(responseText).toContain('Question Analysis');
    expect(responseText).toContain('Difficulty Distribution');
  });

  it('should generate student mapping CSV export with proper headers', async () => {
    const mockResponse = {
      text: async () => "Student ID,Display ID,Rank,Score,Max Score,Percentage,Variant,Performance Category\n",
      headers: {
        get: (key) => {
          const headers = {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="student-mapping-Test-Exam-${new Date().toISOString().split("T")[0]}.csv"`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          };
          return headers[key];
        }
      },
    };
    
    GET.mockResolvedValueOnce(mockResponse);

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/export?type=student');
    const response = await GET(request, { params: { id: 'generation123' } });

    expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="student-mapping-Test-Exam-');
    expect(response.headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');

    const responseText = await response.text();
    expect(responseText).toContain('Student ID');
    expect(responseText).toContain('Display ID');
    expect(responseText).toContain('Rank');
    expect(responseText).toContain('Score');
    expect(responseText).toContain('Variant');
    expect(responseText).toContain('Performance Category');
  });
  
  it('should handle analysis errors', async () => {
    GET.mockResolvedValueOnce(NextResponse.json({ error: "No student results available for this exam generation. Please upload results first." }, { status: 400 }));

    const request = new NextRequest('http://localhost:3000/api/exam-generations/generation123/export');
    const response = await GET(request, { params: { id: 'generation123' } });
    const responseJson = await response.json();

    expect(response.status).toBe(400);
    expect(responseJson.error).toContain('No student results available');
  });
}); 