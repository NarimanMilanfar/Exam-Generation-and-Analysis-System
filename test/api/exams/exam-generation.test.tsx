/**
 * Integration tests for Exam Generation API endpoints
 */

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { GET, POST } from "../../../app/api/exams/route";
import {
  GET as GetExam,
  PUT as UpdateExam,
  DELETE as DeleteExam,
} from "../../../app/api/exams/[id]/route";
import { GET as GetCourseExams } from "../../../app/api/courses/[id]/exams/route";
import { POST as CreateGeneration } from "../../../app/api/exams/[id]/generations/route";
import prisma from "../../../lib/prisma";

// Mock dependencies
jest.mock("../../../lib/prisma", () => ({
  __esModule: true,
  default: {
    exam: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    course: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    term: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    questionBank: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    examQuestion: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    examGeneration: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    examResult: {
      create: jest.fn(),
    },
    courseConfig: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => {
      // Create a mock prisma instance for the transaction
      const mockPrismaInstance = {
        exam: { create: jest.fn(), update: jest.fn() },
        examQuestion: { create: jest.fn(), deleteMany: jest.fn() },
      };
      return callback(mockPrismaInstance);
    }),
  },
}));

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("../../../lib/auth", () => ({
  authOptions: {},
}));

const mockPrisma = prisma as any;
const mockGetServerSession = getServerSession as jest.Mock;

// Test data
const mockUser = {
  id: "user-1",
  email: "professor@uexam.com",
  role: "TEACHER",
};

const mockCourse = {
  id: "course-1",
  name: "COSC 499",
  userId: "user-1",
  collaborators: [], // Empty array for owner-only access
  _count: { exams: 2, questions: 10 },
  createdAt: new Date("2024-12-01"),
  updatedAt: new Date("2024-12-01"),
};

const mockExam = {
  id: "exam-1",
  title: "Programming Test",
  description: "Test your programming knowledge",
  courseId: "course-1",
  userId: "user-1",
  termId: "term-1",
  section: "001",
  isPublished: false,
  timeLimit: 60,
  numberOfVersions: 2,
  questionsPerExam: 5,
  shuffleQuestions: true,
  shuffleAnswers: true,
  negativeMarking: false,
  passingScore: 70.0,
  totalPoints: 10,
  instructions: "Read carefully before starting",
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  course: mockCourse,
  term: { term: "Winter Term 1", year: 2025 },
  questions: [],
  variants: [],
  _count: { questions: 5, results: 0 },
};

describe("Exam Generation API Routes (Reduced)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: mockUser });

    // Mock course access validation
    mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
  });

  // GET /api/exams
  describe("GET /api/exams", () => {
    it("should fetch all exams for authenticated user", async () => {
      // Mock the getUserAccessibleCourses function calls
      mockPrisma.course.findMany
        .mockResolvedValueOnce([mockCourse]) // owned courses
        .mockResolvedValueOnce([]); // collaborated courses

      mockPrisma.exam.findMany.mockResolvedValue([mockExam]);
      const request = new NextRequest("http://localhost:3000/api/exams");
      const response = await GET(request);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("id", "exam-1");
    });
    it("should return 401 for unauthenticated requests", async () => {
      mockGetServerSession.mockResolvedValue(null);
      const request = new NextRequest("http://localhost:3000/api/exams");
      const response = await GET(request);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
  });

  // POST /api/exams
  describe("POST /api/exams", () => {
    const examData = {
      title: "New Programming Test",
      description: "Test your programming knowledge",
      courseId: "course-1",
      termId: "term-1",
      section: "001",
      questionIds: ["question-1", "question-2"],
      timeLimit: 60,
      numberOfVersions: 1,
      shuffleQuestions: false,
      shuffleAnswers: false,
      negativeMarking: false,
      passingScore: 70,
      instructions: "Read carefully",
    };
    it("should create exam with individual questions", async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse);
      mockPrisma.term.findUnique.mockResolvedValue({
        id: "term-1",
        term: "Winter Term 1",
        year: 2025,
      });
      mockPrisma.question.findMany.mockResolvedValue([
        { id: "question-1", points: 5, questionBankId: "qb-1" },
        { id: "question-2", points: 5, questionBankId: "qb-1" },
      ]);
      mockPrisma.exam.create.mockResolvedValue({
        ...mockExam,
        title: "New Programming Test",
      });
      mockPrisma.examQuestion.create.mockResolvedValue({});
      const request = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        body: JSON.stringify(examData),
      });
      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id");
      expect(data.title).toBe("New Programming Test");
    });
    it("should validate required fields", async () => {
      const invalidData = { description: "Missing title" };
      const request = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const response = await POST(request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Title, courseId, and termId are required",
      });
    });
  });

  // GET /api/exams/[id]
  describe("GET /api/exams/[id]", () => {
    it("should fetch specific exam", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(mockExam);
      const request = new NextRequest("http://localhost:3000/api/exams/exam-1");
      const response = await GetExam(request, { params: { id: "exam-1" } });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("id", "exam-1");
    });
    it("should return 404 for non-existent exam", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost:3000/api/exams/invalid-id"
      );
      const response = await GetExam(request, { params: { id: "invalid-id" } });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Exam not found" });
    });
  });

  // PUT /api/exams/[id]
  describe("PUT /api/exams/[id]", () => {
    it("should update exam with section", async () => {
      const updateData = {
        title: "Updated Exam",
        description: "Updated description",
        termId: "term-2",
        section: "105",
        questionIds: ["q1", "q2"],
      };
      mockPrisma.exam.findUnique.mockResolvedValue(mockExam);
      mockPrisma.term.findUnique.mockResolvedValue({
        id: "term-2",
        term: "Winter Term 2",
        year: 2025,
      });
      mockPrisma.question.findMany.mockResolvedValue([
        { id: "q1", points: 5, questionBankId: "qb-1" },
        { id: "q2", points: 5, questionBankId: "qb-1" },
      ]);
      mockPrisma.examQuestion.deleteMany.mockResolvedValue({});
      mockPrisma.examQuestion.create.mockResolvedValue({});
      mockPrisma.examQuestion.findMany.mockResolvedValue([
        { points: 5, question: { points: 5 } },
        { points: 5, question: { points: 5 } },
      ]);
      mockPrisma.exam.update.mockResolvedValue({
        ...mockExam,
        title: "Updated Exam",
        section: "105",
      });
      const request = new NextRequest(
        "http://localhost:3000/api/exams/exam-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );
      const response = await UpdateExam(request, { params: { id: "exam-1" } });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.title).toBe("Updated Exam");
    });
    it("should validate required fields for update", async () => {
      const invalidUpdate = { description: "Missing title and termId" };
      const request = new NextRequest(
        "http://localhost:3000/api/exams/exam-1",
        {
          method: "PUT",
          body: JSON.stringify(invalidUpdate),
        }
      );
      const response = await UpdateExam(request, { params: { id: "exam-1" } });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Title/name is required",
      });
    });
  });

  // DELETE /api/exams/[id]
  describe("DELETE /api/exams/[id]", () => {
    it("should delete exam", async () => {
      mockPrisma.exam.findFirst.mockResolvedValue(mockExam);
      mockPrisma.exam.delete.mockResolvedValue(mockExam);
      const request = new NextRequest("http://localhost:3000/api/exams/exam-1");
      const response = await DeleteExam(request, { params: { id: "exam-1" } });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        message: "Exam deleted successfully",
      });
    });
    it("should return 404 for non-existent exam", async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(null);
      const request = new NextRequest(
        "http://localhost:3000/api/exams/invalid-id"
      );
      const response = await DeleteExam(request, {
        params: { id: "invalid-id" },
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Exam not found" });
    });
  });

  // GET /api/courses/[id]/exams
  describe("GET /api/courses/[id]/exams", () => {
    it("should fetch exams for a specific course", async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse);
      mockPrisma.exam.findMany.mockResolvedValue([mockExam]);
      const request = new NextRequest(
        "http://localhost:3000/api/courses/course-1/exams"
      );
      const response = await GetCourseExams(request, {
        params: { id: "course-1" },
      });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data[0]).toHaveProperty("id", "exam-1");
    });
    it("should return 404 for non-existent course", async () => {
      // Mock course.findUnique to return null for the invalid ID
      mockPrisma.course.findUnique.mockResolvedValueOnce(null);
      const request = new NextRequest(
        "http://localhost:3000/api/courses/invalid-id/exams"
      );
      const response = await GetCourseExams(request, {
        params: { id: "invalid-id" },
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Course not found or access denied",
      });
    });
  });

  // POST /api/exams/[id]/generations
  describe("POST /api/exams/[id]/generations", () => {
    it("should create exam generation", async () => {
      const generationData = {
        numberOfVariants: 3,
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        randomizeTrueFalse: false,
      };
      mockPrisma.exam.findUnique.mockResolvedValue(mockExam);
      mockPrisma.examGeneration.create.mockResolvedValue({
        id: "gen-1",
        examId: "exam-1",
        numberOfVariants: 3,
        status: "PENDING",
        exam: { id: "exam-1", title: "Test Exam" },
      });
      const request = new NextRequest(
        "http://localhost:3000/api/exams/exam-1/generations",
        {
          method: "POST",
          body: JSON.stringify(generationData),
        }
      );
      const response = await CreateGeneration(request, {
        params: { id: "exam-1" },
      });
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data).toHaveProperty("id", "gen-1");
      expect(data).toHaveProperty("numberOfVariants", 3);
    });
    it("should validate number of variants", async () => {
      const invalidData = { numberOfVariants: 15 };
      const request = new NextRequest(
        "http://localhost:3000/api/exams/exam-1/generations",
        {
          method: "POST",
          body: JSON.stringify(invalidData),
        }
      );
      const response = await CreateGeneration(request, {
        params: { id: "exam-1" },
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Number of variants must be between 1 and 10",
      });
    });
  });

  // Error handling
  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Mock course.findMany calls first (for getUserAccessibleCourses)
      mockPrisma.course.findMany
        .mockRejectedValueOnce(new Error("Database connection failed"))
        .mockRejectedValueOnce(new Error("Database connection failed"));

      const request = new NextRequest("http://localhost:3000/api/exams");
      const response = await GET(request);
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
    });
  });
});
