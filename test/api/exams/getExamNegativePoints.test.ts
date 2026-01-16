import { NextRequest } from "next/server";
import * as routeModule from "../../../app/api/exams/[id]/route";  

// Mock getServerSession
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

// Mock prisma
jest.mock("../../../lib/prisma", () => ({
  exam: {
    findUnique: jest.fn(),
  },
}));

// Mock coursePermissions
jest.mock("../../../lib/coursePermissions", () => ({
  validateCourseAccess: jest.fn(),
}));

jest.mock("next/server", () => {
  const originalModule = jest.requireActual("next/server");
  return {
    ...originalModule,
    NextResponse: {
      json: (data: any, opts?: any) => ({
        status: opts?.status ?? 200,
        json: async () => data,
      }),
    },
  };
});

import { getServerSession } from "next-auth/next";
import prisma from "../../../lib/prisma";
import { validateCourseAccess } from "../../../lib/coursePermissions";
import { NextResponse } from "next/server";

describe("GET /api/exams/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 Unauthorized if no session", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = {} as NextRequest;
    const params = { id: "exam1" };

    const res = await routeModule.GET(req, { params });

    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns exam data including negativePoints when authorized", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "user1" },
    });

    (validateCourseAccess as jest.Mock).mockResolvedValue({
      hasAccess: true,
      userId: "user1"
    });

    (prisma.exam.findUnique as jest.Mock).mockResolvedValue({
      id: "exam1",
      title: "Sample Exam",
      description: "desc",
      courseId: "course1",
      termId: "term1",
      term: { id: "term1", term: "Winter", year: 2025 },
      course: { id: "course1", name: "Course", color: "#123456" },
      questions: [
        {
          question: {
            id: "q1",
            text: "Question 1",
            type: "MULTIPLE_CHOICE",
            options: JSON.stringify(["A", "B", "C"]),
            correctAnswer: "A",
            points: 5,
            negativePoints: 2,
            difficulty: "EASY",
            topic: "topic1",
            courseId: "course1",
          },
          questionBankId: "qb1",
          points: 5,
          negativePoints: 2,
        },
      ],
      _count: { questions: 1, results: 0 },
      isPublished: false,
      timeLimit: 60,
      startDate: null,
      endDate: null,
      numberOfVersions: 1,
      questionsPerExam: 1,
      shuffleQuestions: false,
      shuffleAnswers: false,
      negativeMarking: true,
      passingScore: 50,
      instructions: null,
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
    });

    const req = {} as NextRequest;
    const params = { id: "exam1" };

    const res = await routeModule.GET(req, { params });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty("questions");
    expect(data.questions.length).toBe(1);
    expect(data.questions[0]).toHaveProperty("negativePoints", 2);
    expect(data.questions[0]).toHaveProperty("points", 5);
  });
});
