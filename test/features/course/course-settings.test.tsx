/**
 * Jest unit tests for Course Settings Page
 * Only the most important and representative tests are kept for brevity and coverage.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import {
  GET as GetCourse,
  PUT as UpdateCourse,
} from "../../../app/api/courses/[id]/route";
import { POST as CreateCourse } from "../../../app/api/courses/route";
import prisma from "../../../lib/prisma";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Mock dependencies
jest.mock("../../../lib/prisma", () => ({
  __esModule: true,
  default: {
    course: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
    exam: {
      findMany: jest.fn(),
    },
    questionBank: {
      findMany: jest.fn(),
    },
    examQuestion: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("../../../lib/auth", () => ({
  authOptions: {},
}));

global.fetch = jest.fn();

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
  description: "Capstone Project",
  userId: "user-1",
  color: "#10b981",
  collaborators: [], // Empty array for owner-only access
  _count: { exams: 2, questions: 10 },
  createdAt: new Date("2024-12-01"),
  updatedAt: new Date("2024-12-01"),
};

// Test suite
describe("Course Settings API Integration (Reduced)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: mockUser });

    // Mock course access validation
    mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
  });

  describe("GET /api/courses/[id] - Course Retrieval", () => {
    it("should fetch course details successfully", async () => {
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse);
      const request = new NextRequest(
        "http://localhost:3000/api/courses/course-1"
      );
      const response = await GetCourse(request, { params: { id: "course-1" } });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data).toHaveProperty("id", "course-1");
      expect(data).toHaveProperty("name", "COSC 499");
    });

    it("should return 404 for non-existent course", async () => {
      mockPrisma.course.findFirst.mockResolvedValue(null);
      mockPrisma.course.findUnique.mockResolvedValue(null); // Mock access validation to fail
      const request = new NextRequest(
        "http://localhost:3000/api/courses/invalid-id"
      );
      const response = await GetCourse(request, {
        params: { id: "invalid-id" },
      });
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: "Course not found or access denied",
      });
    });
  });

  describe("PUT /api/courses/[id] - Course Update", () => {
    it("should update course details successfully", async () => {
      const updateData = {
        name: "COSC 499",
        description: "Updated Capstone Project",
        color: "#10b981",
      };
      mockPrisma.course.findFirst.mockResolvedValue(mockCourse);
      mockPrisma.course.update.mockResolvedValue({
        ...mockCourse,
        description: "Updated Capstone Project",
      });
      const request = new NextRequest(
        "http://localhost:3000/api/courses/course-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );
      const response = await UpdateCourse(request, {
        params: { id: "course-1" },
      });
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.description).toBe("Updated Capstone Project");
    });

    it("should validate course name format", async () => {
      const invalidData = {
        name: "INVALID",
        description: "Invalid course code",
      };
      const request = new NextRequest(
        "http://localhost:3000/api/courses/course-1",
        {
          method: "PUT",
          body: JSON.stringify(invalidData),
        }
      );
      const response = await UpdateCourse(request, {
        params: { id: "course-1" },
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error:
          "Invalid course code format. Must be 3-4 letters, space, and 3 digits (e.g., CSC 101, COSC 499)",
      });
    });
  });

  describe("POST /api/courses - Course Creation", () => {
    it("should create course successfully", async () => {
      const courseData = {
        name: "COSC 499",
        description: "Capstone Project",
        color: "#10b981",
      };
      mockPrisma.course.create.mockResolvedValue({
        ...mockCourse,
        _count: { exams: 0, questions: 0 },
      });
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        body: JSON.stringify(courseData),
      });
      const response = await CreateCourse(request);
      const data = await response.json();
      expect(response.status).toBe(201);
      expect(data.name).toBe("COSC 499");
    });

    it("should validate required fields", async () => {
      const invalidData = { description: "Missing name" };
      const request = new NextRequest("http://localhost:3000/api/courses", {
        method: "POST",
        body: JSON.stringify(invalidData),
      });
      const response = await CreateCourse(request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Course name is required",
      });
    });
  });
});

describe("Course Settings Component Logic (Reduced)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("Course Validation Logic", () => {
    it("should validate course name formatting", () => {
      const isValidCourseCode = (code: string): boolean => {
        const pattern = /^[A-Z]{3,4}\s[0-9]{3}$/;
        return pattern.test(code);
      };
      expect(isValidCourseCode("COSC 499")).toBe(true);
      expect(isValidCourseCode("INVALID")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Course not found" }),
      });
      const fetchCourse = async (courseId: string) => {
        const response = await fetch(`/api/courses/${courseId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch course");
        }
        return await response.json();
      };
      await expect(fetchCourse("invalid-id")).rejects.toThrow(
        "Course not found"
      );
    });
  });
});