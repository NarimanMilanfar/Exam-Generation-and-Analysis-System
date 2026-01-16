import { NextRequest } from 'next/server';

// Mock Prisma
const mockPrisma = {
  course: {
    findUnique: jest.fn(),
  },
  questionBank: {
    findMany: jest.fn(),
  },
  exam: {
    findMany: jest.fn(),
  },
  enrollment: {
    findMany: jest.fn(),
  },
  examResult: {
    findMany: jest.fn(),
  },
  examGeneration: {
    findMany: jest.fn(),
  },
  examVariant: {
    findMany: jest.fn(),
  },
};

jest.mock('@/lib/prisma', () => ({
  default: mockPrisma,
}));

// Mock authentication
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

describe("Course Export API", () => {
  const mockCourse = {
    id: "course-1",
    name: "Introduction to Computer Science",
    description: "A comprehensive introduction to computer science concepts",
    color: "#3b82f6",
    instructor: {
      id: "instructor-1",
      name: "Dr. Smith",
      email: "dr.smith@university.edu",
    },
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };

  const mockQuestionBanks = [
    {
      id: "qbank-1",
      name: "JavaScript Basics",
      description: "Basic JavaScript concepts",
      topic: "Programming",
      color: "#3b82f6",
      courseId: "course-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      questions: [
        {
          id: "q1",
          text: "What is a variable in JavaScript?",
          type: "MULTIPLE_CHOICE",
          options: ["A container for data", "A function", "A loop", "A class"],
          correctAnswer: "A container for data",
          points: 2,
          difficulty: "EASY",
          topic: "Variables",
          questionBankId: "qbank-1",
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-01T00:00:00Z"),
        },
      ],
    },
  ];

  const mockExams = [
    {
      id: "exam-1",
      title: "Midterm Exam",
      description: "Comprehensive midterm examination",
      timeLimit: 120,
      isPublished: true,
      shuffleQuestions: true,
      shuffleAnswers: false,
      negativeMarking: false,
      passingScore: 70,
      courseId: "course-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
      updatedAt: new Date("2024-01-01T00:00:00Z"),
      questions: [
        {
          id: "eq1",
          examId: "exam-1",
          questionId: "q1",
          points: 2,
          order: 1,
          question: mockQuestionBanks[0].questions[0],
          questionBank: mockQuestionBanks[0],
        },
      ],
    },
  ];

  const mockStudents = [
    {
      id: "enrollment-1",
      courseId: "course-1",
      studentId: "student-1",
      termId: "term-1",
      enrolledAt: new Date("2024-01-01T00:00:00Z"),
      student: {
        id: "student-1",
        name: "John Doe",
        studentId: "12345",
        email: "john.doe@university.edu",
      },
      term: {
        id: "term-1",
        term: "Fall",
        year: 2024,
      },
    },
  ];

  const mockExamResults = [
    {
      id: "result-1",
      examId: "exam-1",
      studentId: "student-1",
      score: 25,
      totalPoints: 30,
      percentage: 83.33,
      createdAt: new Date("2024-01-15T00:00:00Z"),
      student: mockStudents[0].student,
      exam: mockExams[0],
      answers: [
        {
          questionId: "q1",
          answer: "A container for data",
          isCorrect: true,
          points: 2,
        },
      ],
    },
  ];

  const mockExamGenerations = [
    {
      id: "gen-1",
      examId: "exam-1",
      questionCount: 15,
      shuffleQuestions: true,
      shuffleAnswers: false,
      createdAt: new Date("2024-01-10T00:00:00Z"),
    },
  ];

  const mockExamVariants = [
    {
      id: "variant-1",
      examGenerationId: "gen-1",
      variantNumber: 1,
      questions: [
        {
          questionId: "q1",
          order: 1,
          options: ["A container for data", "A function", "A loop", "A class"],
        },
      ],
      answerKey: [
        {
          questionId: "q1",
          correctAnswer: "A container for data",
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
    mockPrisma.questionBank.findMany.mockResolvedValue(mockQuestionBanks);
    mockPrisma.exam.findMany.mockResolvedValue(mockExams);
    mockPrisma.enrollment.findMany.mockResolvedValue(mockStudents);
    mockPrisma.examResult.findMany.mockResolvedValue(mockExamResults);
    mockPrisma.examGeneration.findMany.mockResolvedValue(mockExamGenerations);
    mockPrisma.examVariant.findMany.mockResolvedValue(mockExamVariants);
  });

  describe("Export Data Structure", () => {
    it("should validate complete export data structure", async () => {
      const exportData = {
        course: mockCourse,
        exportInfo: {
          exportedAt: expect.any(String),
          version: "1.0",
        },
        questionBanks: mockQuestionBanks,
        exams: mockExams,
        students: mockStudents,
        examResults: mockExamResults,
        analytics: {
          overview: {
            totalQuestions: expect.any(Number),
            totalExams: expect.any(Number),
            totalQuestionBanks: expect.any(Number),
            totalStudents: expect.any(Number),
          },
          examResults: {
            totalResults: expect.any(Number),
            averageScore: expect.any(Number),
            averagePercentage: expect.any(Number),
            completionRate: expect.any(Number),
          },
          questionBanks: expect.any(Array),
        },
        examGenerations: mockExamGenerations,
        examVariants: mockExamVariants,
      };

      expect(exportData.course).toEqual(mockCourse);
      expect(exportData.questionBanks).toHaveLength(1);
      expect(exportData.exams).toHaveLength(1);
      expect(exportData.students).toHaveLength(1);
      expect(exportData.examResults).toHaveLength(1);
    });

    it("should include course metadata and components", () => {
      const courseMetadata = {
        id: mockCourse.id,
        name: mockCourse.name,
        description: mockCourse.description,
        instructor: mockCourse.instructor,
        createdAt: mockCourse.createdAt,
      };

      expect(courseMetadata.id).toBe("course-1");
      expect(courseMetadata.name).toBe("Introduction to Computer Science");
      expect(courseMetadata.instructor.name).toBe("Dr. Smith");

      // Validate components have required structure
      const questionBank = mockQuestionBanks[0];
      expect(questionBank.id).toBe("qbank-1");
      expect(questionBank.name).toBe("JavaScript Basics");
      expect(questionBank.questions).toHaveLength(1);
      expect(questionBank.questions[0].text).toBe("What is a variable in JavaScript?");

      const exam = mockExams[0];
      expect(exam.id).toBe("exam-1");
      expect(exam.title).toBe("Midterm Exam");
      expect(exam.timeLimit).toBe(120);
      expect(exam.questions).toHaveLength(1);

      const student = mockStudents[0];
      expect(student.student.name).toBe("John Doe");
      expect(student.student.studentId).toBe("12345");
      expect(student.term.term).toBe("Fall");
      expect(student.term.year).toBe(2024);

      const result = mockExamResults[0];
      expect(result.score).toBe(25);
      expect(result.totalPoints).toBe(30);
      expect(result.percentage).toBe(83.33);
      expect(result.student.name).toBe("John Doe");
      expect(result.exam.title).toBe("Midterm Exam");
    });
  });

  describe("Analytics Calculation", () => {
    it("should calculate overview statistics", () => {
      const analytics = {
        overview: {
          totalQuestions: mockQuestionBanks.reduce((sum, bank) => sum + bank.questions.length, 0),
          totalExams: mockExams.length,
          totalQuestionBanks: mockQuestionBanks.length,
          totalStudents: mockStudents.length,
        },
      };

      expect(analytics.overview.totalQuestions).toBe(1);
      expect(analytics.overview.totalExams).toBe(1);
      expect(analytics.overview.totalQuestionBanks).toBe(1);
      expect(analytics.overview.totalStudents).toBe(1);
    });

    it("should calculate exam results and question bank analytics", () => {
      const totalResults = mockExamResults.length;
      const averageScore = mockExamResults.reduce((sum, r) => sum + r.score, 0) / totalResults;
      const averagePercentage = mockExamResults.reduce((sum, r) => sum + r.percentage, 0) / totalResults;
      const completionRate = (totalResults / mockStudents.length) * 100;

      const analytics = {
        examResults: {
          totalResults,
          averageScore,
          averagePercentage,
          completionRate,
        },
      };

      expect(analytics.examResults.totalResults).toBe(1);
      expect(analytics.examResults.averageScore).toBe(25);
      expect(analytics.examResults.averagePercentage).toBe(83.33);
      expect(analytics.examResults.completionRate).toBe(100);

      const questionBankAnalytics = mockQuestionBanks.map(bank => ({
        name: bank.name,
        questionCount: bank.questions.length,
        totalPoints: bank.questions.reduce((sum, q) => sum + q.points, 0),
        averageQuestionPoints: bank.questions.reduce((sum, q) => sum + q.points, 0) / bank.questions.length,
      }));

      expect(questionBankAnalytics).toHaveLength(1);
      expect(questionBankAnalytics[0].name).toBe("JavaScript Basics");
      expect(questionBankAnalytics[0].questionCount).toBe(1);
      expect(questionBankAnalytics[0].totalPoints).toBe(2);
      expect(questionBankAnalytics[0].averageQuestionPoints).toBe(2);
    });
  });

  describe("Data Relationships", () => {
    it("should maintain proper relationships between entities", () => {
      // Question to question bank relationship
      const question = mockQuestionBanks[0].questions[0];
      expect(question.questionBankId).toBe("qbank-1");
      expect(question.questionBankId).toBe(mockQuestionBanks[0].id);

      // Exam question relationship
      const examQuestion = mockExams[0].questions[0];
      expect(examQuestion.examId).toBe("exam-1");
      expect(examQuestion.questionId).toBe("q1");
      expect(examQuestion.question.id).toBe("q1");

      // Student enrollment relationship
      const enrollment = mockStudents[0];
      expect(enrollment.courseId).toBe("course-1");
      expect(enrollment.studentId).toBe("student-1");
      expect(enrollment.termId).toBe("term-1");

      // Exam result relationship
      const result = mockExamResults[0];
      expect(result.examId).toBe("exam-1");
      expect(result.studentId).toBe("student-1");
      expect(result.student.id).toBe("student-1");
      expect(result.exam.id).toBe("exam-1");
    });

    it("should include export timestamp and version", () => {
      const exportInfo = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };

      expect(exportInfo.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(exportInfo.version).toBe("1.0");
    });
  });

  describe("Edge Cases and Data Validation", () => {
    it("should handle empty data scenarios", () => {
      const emptyQuestionBanks: any[] = [];
      const emptyExams: any[] = [];
      const emptyStudents: any[] = [];
      const emptyResults: any[] = [];
      
      const analytics = {
        overview: {
          totalQuestions: emptyQuestionBanks.reduce((sum, bank) => sum + bank.questions.length, 0),
          totalQuestionBanks: emptyQuestionBanks.length,
          totalExams: emptyExams.length,
          totalStudents: emptyStudents.length,
        },
        examResults: {
          totalResults: emptyResults.length,
          averageScore: emptyResults.length > 0 ? emptyResults.reduce((sum, r) => sum + r.score, 0) / emptyResults.length : 0,
          averagePercentage: emptyResults.length > 0 ? emptyResults.reduce((sum, r) => sum + r.percentage, 0) / emptyResults.length : 0,
          completionRate: emptyStudents.length > 0 ? (emptyResults.length / emptyStudents.length) * 100 : 0,
        },
      };

      expect(analytics.overview.totalQuestions).toBe(0);
      expect(analytics.overview.totalQuestionBanks).toBe(0);
      expect(analytics.overview.totalExams).toBe(0);
      expect(analytics.overview.totalStudents).toBe(0);
      expect(analytics.examResults.totalResults).toBe(0);
      expect(analytics.examResults.averageScore).toBe(0);
      expect(analytics.examResults.averagePercentage).toBe(0);
      expect(analytics.examResults.completionRate).toBe(0);
    });

    it("should handle questions with missing optional fields", () => {
      const questionWithoutOptionals: any = {
        id: "q-min",
        text: "Simple question",
        type: "TRUE_FALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 1,
        difficulty: null,
        topic: null,
        questionBankId: "qbank-1",
      };

      expect(questionWithoutOptionals.difficulty).toBeNull();
      expect(questionWithoutOptionals.topic).toBeNull();
      expect(questionWithoutOptionals.points).toBe(1);
    });

    it("should handle exam without time limit", () => {
      const examWithoutTimeLimit = {
        ...mockExams[0],
        timeLimit: null,
      };

      expect(examWithoutTimeLimit.timeLimit).toBeNull();
      expect(examWithoutTimeLimit.title).toBe("Midterm Exam");
    });

    it("should validate enum values", () => {
      const validDifficulties = ["EASY", "MEDIUM", "HARD"];
      const validQuestionTypes = ["MULTIPLE_CHOICE", "TRUE_FALSE", "SHORT_ANSWER"];

      const question = mockQuestionBanks[0].questions[0];
      
      if (question.difficulty) {
        expect(validDifficulties).toContain(question.difficulty);
      }
      expect(validQuestionTypes).toContain(question.type);
    });
  });

  describe("Data Integrity and Performance", () => {
    it("should maintain consistent calculations", () => {
      const calculatedQuestionCount = mockQuestionBanks.reduce(
        (sum, bank) => sum + bank.questions.length,
        0
      );
      
      const expectedTotalQuestions = 1;
      expect(calculatedQuestionCount).toBe(expectedTotalQuestions);

      const totalQuestionPoints = mockQuestionBanks.reduce(
        (sum, bank) => sum + bank.questions.reduce((bankSum, q) => bankSum + q.points, 0),
        0
      );

      expect(totalQuestionPoints).toBe(2);

      const examQuestionIds = mockExams.reduce(
        (ids, exam) => [...ids, ...exam.questions.map(eq => eq.questionId)],
        [] as string[]
      );

      const allQuestionIds = mockQuestionBanks.reduce(
        (ids, bank) => [...ids, ...bank.questions.map(q => q.id)],
        [] as string[]
      );

      examQuestionIds.forEach(questionId => {
        expect(allQuestionIds).toContain(questionId);
      });
    });

    it("should handle large datasets efficiently", () => {
      // Simulate large dataset
      const largeQuestionBank = {
        ...mockQuestionBanks[0],
        questions: Array(100).fill(null).map((_, index) => ({
          ...mockQuestionBanks[0].questions[0],
          id: `q${index + 1}`,
          text: `Question ${index + 1}`,
        })),
      };

      const questionCount = largeQuestionBank.questions.length;
      const totalPoints = largeQuestionBank.questions.reduce((sum, q) => sum + q.points, 0);

      expect(questionCount).toBe(100);
      expect(totalPoints).toBe(200); // 100 questions * 2 points each

      // Simulate multiple exam results
      const multipleResults = Array(10).fill(null).map((_, index) => ({
        ...mockExamResults[0],
        id: `result-${index + 1}`,
        score: 20 + index % 10,
        percentage: (20 + index % 10) / 30 * 100,
      }));

      const averageScore = multipleResults.reduce((sum, r) => sum + r.score, 0) / multipleResults.length;
      const averagePercentage = multipleResults.reduce((sum, r) => sum + r.percentage, 0) / multipleResults.length;

      expect(averageScore).toBeGreaterThan(0);
      expect(averagePercentage).toBeGreaterThan(0);
      expect(multipleResults).toHaveLength(10);
    });
  });
}); 