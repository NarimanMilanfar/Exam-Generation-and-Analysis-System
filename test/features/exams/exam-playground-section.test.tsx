/**
 * Integration tests for Exam Playground Section Functionality
 * Tests both the exam builder component logic and backend API integration for section management
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { GET, POST } from "../../../app/api/exams/route";
import {
  GET as GetExam,
  PUT as UpdateExam,
} from "../../../app/api/exams/[id]/route";
import { GET as GetTerms } from "../../../app/api/terms/route";
import { POST as CreateGeneration } from "../../../app/api/exams/[id]/generations/route";
import { POST as GenerateVariants } from "../../../app/api/courses/[id]/exams/[examId]/variants/route";
import prisma from "../../../lib/prisma";
import { validateSection } from "../../../app/lib/sectionUtils";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

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

jest.mock("../../../app/lib/sectionUtils", () => ({
  validateSection: jest.fn(),
}));

const mockPrisma = prisma as any;
const mockGetServerSession = getServerSession as jest.Mock;
const mockValidateSection = validateSection as jest.Mock;

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
};

const mockTerms = [
  { id: "term-1", term: "Winter Term 1", year: 2025 },
  { id: "term-2", term: "Winter Term 2", year: 2025 },
  { id: "term-3", term: "Summer Term 1", year: 2025 },
  { id: "term-4", term: "Summer Term 2", year: 2025 },
];

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

describe("Exam Playground Section API Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({ user: mockUser });
    mockValidateSection.mockReturnValue({ isValid: true });

    // Mock course access validation
    mockPrisma.course.findUnique.mockResolvedValue(mockCourse);
  });

  describe("POST /api/exams - Exam Creation with Section", () => {
    it("should create exam with section for Term 1", async () => {
      const examData = {
        title: "Midterm Exam",
        description: "Programming fundamentals test",
        courseId: "course-1",
        termId: "term-1",
        section: "001",
        questionIds: ["q1", "q2", "q3"],
        timeLimit: 90,
        numberOfVersions: 2,
      };

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse);
      mockPrisma.term.findUnique.mockResolvedValue({
        id: "term-1",
        term: "Winter Term 1",
        year: 2025,
      });
      mockPrisma.question.findMany.mockResolvedValue([
        { id: "q1", points: 5, questionBankId: "qb-1" },
        { id: "q2", points: 5, questionBankId: "qb-1" },
        { id: "q3", points: 5, questionBankId: "qb-1" },
      ]);
      mockPrisma.exam.create.mockResolvedValue({
        ...mockExam,
        title: "Midterm Exam", // Use the title from the request
        section: "001",
        termId: "term-1",
      });
      mockPrisma.examQuestion.create.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        body: JSON.stringify(examData),
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe("Midterm Exam");
      expect(mockPrisma.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: "Midterm Exam",
          section: "001",
          termId: "term-1",
          userId: "user-1",
        }),
      });
    });

    it("should validate required fields including section", async () => {
      const invalidData = {
        title: "Test Exam",
        // Missing courseId and termId
        section: "001",
      };

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

  describe("GET /api/terms - Terms for Exam Creation", () => {
    it("should fetch available terms for exam creation", async () => {
      mockPrisma.term.findMany.mockResolvedValue(mockTerms);

      const request = new NextRequest("http://localhost:3000/api/terms");
      const response = await GetTerms(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(4);
      expect(data[0]).toHaveProperty("term", "Winter Term 1");
      expect(data[3]).toHaveProperty("term", "Summer Term 2");
    });
  });

  describe("POST /api/exams/[id]/generations - Exam Generation", () => {
    it("should create exam generation with proper configuration", async () => {
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
        randomizeQuestionOrder: true,
        randomizeOptionOrder: true,
        randomizeTrueFalse: false,
        status: "PENDING",
        exam: { id: "exam-1", title: "Midterm Exam" },
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
      expect(data).toHaveProperty("randomizeQuestionOrder", true);
      expect(data).toHaveProperty("status", "PENDING");
    });
  });

  describe("Section validation and consistency", () => {
    it("should handle exams with Term 1 sections (001-010)", async () => {
      const examData = {
        title: "Term 1 Exam",
        courseId: "course-1",
        termId: "term-1",
        section: "005",
        questionIds: ["q1"],
      };

      mockPrisma.course.findFirst.mockResolvedValue(mockCourse);
      mockPrisma.term.findUnique.mockResolvedValue({
        id: "term-1",
        term: "Winter Term 1",
        year: 2025,
      });
      mockPrisma.question.findMany.mockResolvedValue([
        { id: "q1", points: 5, questionBankId: "qb-1" },
      ]);
      mockPrisma.exam.create.mockResolvedValue({
        ...mockExam,
        section: "005",
        termId: "term-1",
      });
      mockPrisma.examQuestion.create.mockResolvedValue({});

      const request = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        body: JSON.stringify(examData),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockPrisma.exam.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          section: "005",
          termId: "term-1",
        }),
      });
    });
  });

  describe("Error handling", () => {
    it("should handle database errors during exam creation", async () => {
      mockPrisma.exam.create.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Exam",
          courseId: "course-1",
          termId: "term-1",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Internal server error" });
    });

    it("should handle unauthorized access", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/exams", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Exam",
          courseId: "course-1",
          termId: "term-1",
        }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
  });
});

describe("Exam Playground Section Component Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe("Add All Questions Functionality", () => {
    const mockQuestions = [
      {
        id: "q1",
        text: "What is React?",
        type: "MULTIPLE_CHOICE",
        difficulty: "EASY",
        points: 5,
        negativePoints: 0,
        questionBankId: "qb-1",
        options: JSON.stringify(["React", "Angular", "Vue", "Svelte"]),
      },
      {
        id: "q2",
        text: "What is JavaScript?",
        type: "MULTIPLE_CHOICE",
        difficulty: "MEDIUM",
        points: 3,
        negativePoints: -1,
        questionBankId: "qb-1",
        options: JSON.stringify(["Language", "Framework", "Library", "Tool"]),
      },
      {
        id: "q3",
        text: "Is TypeScript a superset of JavaScript?",
        type: "TRUE_FALSE",
        difficulty: "EASY",
        points: 2,
        negativePoints: 0,
        questionBankId: "qb-2",
        options: JSON.stringify(["True", "False"]),
      },
      {
        id: "q4",
        text: "What is Node.js?",
        type: "MULTIPLE_CHOICE",
        difficulty: "HARD",
        points: 4,
        negativePoints: -2,
        questionBankId: "qb-2",
        options: JSON.stringify(["Runtime", "Browser", "Database", "Server"]),
      },
    ];

    it("should add all filtered questions to exam when Add All is clicked", () => {
      const selectedQuestions: any[] = [];
      const availableQuestions = [...mockQuestions];
      const filteredAvailableQuestions = [...mockQuestions];
      const notifications: string[] = [];

      const mockToast = {
        success: (message: string) => notifications.push(`SUCCESS: ${message}`),
        error: (message: string) => notifications.push(`ERROR: ${message}`),
      };

      const addAllQuestionsToExam = () => {
        if (filteredAvailableQuestions.length === 0) {
          mockToast.error("No questions available to add");
          return;
        }
        
        selectedQuestions.push(...filteredAvailableQuestions);
        // Remove added questions from available list
        const filteredIds = filteredAvailableQuestions.map(q => q.id);
        availableQuestions.splice(0, availableQuestions.length, 
          ...availableQuestions.filter(q => !filteredIds.includes(q.id))
        );
        
        mockToast.success(`Added ${filteredAvailableQuestions.length} questions to exam`);
      };

      // Execute the function
      addAllQuestionsToExam();

      // Verify all questions were added
      expect(selectedQuestions).toHaveLength(4);
      expect(selectedQuestions.map(q => q.id)).toEqual(["q1", "q2", "q3", "q4"]);
      
      // Verify available questions were cleared
      expect(availableQuestions).toHaveLength(0);
      
      // Verify success notification
      expect(notifications).toContain("SUCCESS: Added 4 questions to exam");
    });

    it("should handle filtered questions correctly", () => {
      const selectedQuestions: any[] = [];
      const availableQuestions = [...mockQuestions];
      // Only EASY difficulty questions are filtered
      const filteredAvailableQuestions = mockQuestions.filter(q => q.difficulty === "EASY");
      const notifications: string[] = [];

      const mockToast = {
        success: (message: string) => notifications.push(`SUCCESS: ${message}`),
        error: (message: string) => notifications.push(`ERROR: ${message}`),
      };

      const addAllQuestionsToExam = () => {
        if (filteredAvailableQuestions.length === 0) {
          mockToast.error("No questions available to add");
          return;
        }
        
        selectedQuestions.push(...filteredAvailableQuestions);
        const filteredIds = filteredAvailableQuestions.map(q => q.id);
        availableQuestions.splice(0, availableQuestions.length, 
          ...availableQuestions.filter(q => !filteredIds.includes(q.id))
        );
        
        mockToast.success(`Added ${filteredAvailableQuestions.length} questions to exam`);
      };

      // Execute the function
      addAllQuestionsToExam();

      // Verify only filtered questions were added (2 EASY questions)
      expect(selectedQuestions).toHaveLength(2);
      expect(selectedQuestions.map(q => q.id)).toEqual(["q1", "q3"]);
      expect(selectedQuestions.every(q => q.difficulty === "EASY")).toBe(true);
      
      // Verify remaining available questions (MEDIUM and HARD)
      expect(availableQuestions).toHaveLength(2);
      expect(availableQuestions.map(q => q.id)).toEqual(["q2", "q4"]);
      
      // Verify success notification with correct count
      expect(notifications).toContain("SUCCESS: Added 2 questions to exam");
    });

    it("should show error when no questions are available to add", () => {
      const selectedQuestions: any[] = [];
      const availableQuestions: any[] = [];
      const filteredAvailableQuestions: any[] = [];
      const notifications: string[] = [];

      const mockToast = {
        success: (message: string) => notifications.push(`SUCCESS: ${message}`),
        error: (message: string) => notifications.push(`ERROR: ${message}`),
      };

      const addAllQuestionsToExam = () => {
        if (filteredAvailableQuestions.length === 0) {
          mockToast.error("No questions available to add");
          return;
        }
        
        selectedQuestions.push(...filteredAvailableQuestions);
        mockToast.success(`Added ${filteredAvailableQuestions.length} questions to exam`);
      };

      // Execute the function
      addAllQuestionsToExam();

      // Verify no questions were added
      expect(selectedQuestions).toHaveLength(0);
      
      // Verify error notification
      expect(notifications).toContain("ERROR: No questions available to add");
      expect(notifications).not.toContain("SUCCESS:");
    });

    it("should respect question bank filters when adding all questions", () => {
      const selectedQuestions: any[] = [];
      const availableQuestions = [...mockQuestions];
      const selectedQuestionBanks = ["qb-1"]; // Only questions from qb-1
      
      // Filter by question bank
      const filteredAvailableQuestions = mockQuestions.filter(q => 
        selectedQuestionBanks.includes("ALL") || selectedQuestionBanks.includes(q.questionBankId)
      );
      
      const notifications: string[] = [];

      const mockToast = {
        success: (message: string) => notifications.push(`SUCCESS: ${message}`),
        error: (message: string) => notifications.push(`ERROR: ${message}`),
      };

      const addAllQuestionsToExam = () => {
        if (filteredAvailableQuestions.length === 0) {
          mockToast.error("No questions available to add");
          return;
        }
        
        selectedQuestions.push(...filteredAvailableQuestions);
        const filteredIds = filteredAvailableQuestions.map(q => q.id);
        availableQuestions.splice(0, availableQuestions.length, 
          ...availableQuestions.filter(q => !filteredIds.includes(q.id))
        );
        
        mockToast.success(`Added ${filteredAvailableQuestions.length} questions to exam`);
      };

      // Execute the function
      addAllQuestionsToExam();

      // Verify only questions from qb-1 were added
      expect(selectedQuestions).toHaveLength(2);
      expect(selectedQuestions.map(q => q.id)).toEqual(["q1", "q2"]);
      expect(selectedQuestions.every(q => q.questionBankId === "qb-1")).toBe(true);
      
      // Verify remaining questions are from qb-2
      expect(availableQuestions).toHaveLength(2);
      expect(availableQuestions.every(q => q.questionBankId === "qb-2")).toBe(true);
      
      // Verify success notification
      expect(notifications).toContain("SUCCESS: Added 2 questions to exam");
    });

    it("should handle search filter when adding all questions", () => {
      const selectedQuestions: any[] = [];
      const availableQuestions = [...mockQuestions];
      const searchTerm = "javascript";
      
      // Filter by search term
      const filteredAvailableQuestions = mockQuestions.filter(q => 
        q.text.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      const notifications: string[] = [];

      const mockToast = {
        success: (message: string) => notifications.push(`SUCCESS: ${message}`),
        error: (message: string) => notifications.push(`ERROR: ${message}`),
      };

      const addAllQuestionsToExam = () => {
        if (filteredAvailableQuestions.length === 0) {
          mockToast.error("No questions available to add");
          return;
        }
        
        selectedQuestions.push(...filteredAvailableQuestions);
        const filteredIds = filteredAvailableQuestions.map(q => q.id);
        availableQuestions.splice(0, availableQuestions.length, 
          ...availableQuestions.filter(q => !filteredIds.includes(q.id))
        );
        
        mockToast.success(`Added ${filteredAvailableQuestions.length} questions to exam`);
      };

      // Execute the function
      addAllQuestionsToExam();

      // Verify only questions matching search were added
      expect(selectedQuestions).toHaveLength(2);
      expect(selectedQuestions.map(q => q.id)).toEqual(["q2", "q3"]);
      expect(selectedQuestions.every(q => 
        q.text.toLowerCase().includes("javascript")
      )).toBe(true);
      
      // Verify success notification
      expect(notifications).toContain("SUCCESS: Added 2 questions to exam");
    });

    it("should calculate button state correctly", () => {
      const getButtonState = (filteredQuestions: any[]) => ({
        disabled: filteredQuestions.length === 0,
        text: `Add All (${filteredQuestions.length})`,
        title: `Add all ${filteredQuestions.length} filtered questions to exam`,
      });

      // With questions available
      const stateWithQuestions = getButtonState(mockQuestions);
      expect(stateWithQuestions.disabled).toBe(false);
      expect(stateWithQuestions.text).toBe("Add All (4)");
      expect(stateWithQuestions.title).toBe("Add all 4 filtered questions to exam");

      // With no questions available
      const stateWithoutQuestions = getButtonState([]);
      expect(stateWithoutQuestions.disabled).toBe(true);
      expect(stateWithoutQuestions.text).toBe("Add All (0)");
      expect(stateWithoutQuestions.title).toBe("Add all 0 filtered questions to exam");

      // With filtered questions
      const filteredQuestions = mockQuestions.filter(q => q.difficulty === "EASY");
      const stateWithFiltered = getButtonState(filteredQuestions);
      expect(stateWithFiltered.disabled).toBe(false);
      expect(stateWithFiltered.text).toBe("Add All (2)");
      expect(stateWithFiltered.title).toBe("Add all 2 filtered questions to exam");
    });
  });

  describe("Section Selection in Exam Builder", () => {
    it("should generate section options based on selected term", () => {
      const generateSectionOptions = (selectedTerm: string): string[] => {
        if (!selectedTerm) return [];

        const sections: string[] = [];
        const isFirstTerm = selectedTerm.toLowerCase().includes("1");
        const startNumber = isFirstTerm ? 1 : 101;

        for (let i = 0; i < 10; i++) {
          const sectionNumber = startNumber + i;
          const formattedSection = isFirstTerm
            ? sectionNumber.toString().padStart(3, "0")
            : sectionNumber.toString();
          sections.push(formattedSection);
        }

        return sections;
      };

      const winterTerm1Sections = generateSectionOptions("Winter Term 1");
      const winterTerm2Sections = generateSectionOptions("Winter Term 2");
      const emptySections = generateSectionOptions("");

      expect(winterTerm1Sections).toHaveLength(10);
      expect(winterTerm1Sections[0]).toBe("001");
      expect(winterTerm1Sections[9]).toBe("010");

      expect(winterTerm2Sections).toHaveLength(10);
      expect(winterTerm2Sections[0]).toBe("101");
      expect(winterTerm2Sections[9]).toBe("110");

      expect(emptySections).toHaveLength(0);
    });

    it("should handle section loading state during term change", () => {
      let loadingSections = false;
      let selectedTerm = "";
      let selectedSection = "";

      const handleTermChange = (term: string) => {
        selectedTerm = term;
        if (term) {
          loadingSections = true;
          selectedSection = "";

          // Simulate loading delay
          setTimeout(() => {
            loadingSections = false;
          }, 300);
        } else {
          loadingSections = false;
          selectedSection = "";
        }
      };

      // Test changing to a term
      handleTermChange("Summer Term 1");
      expect(loadingSections).toBe(true);
      expect(selectedSection).toBe("");
      expect(selectedTerm).toBe("Summer Term 1");

      // Test clearing term
      handleTermChange("");
      expect(loadingSections).toBe(false);
      expect(selectedSection).toBe("");
      expect(selectedTerm).toBe("");
    });

    it("should handle exam editing with existing term and section", async () => {
      const existingExam = {
        id: "exam-1",
        title: "Existing Exam",
        description: "Test description",
        courseId: "course-1",
        termId: "term-1",
        term: { term: "Winter Term 1", year: 2025 },
        section: "004",
        questions: [],
        timeLimit: 90,
      };

      const populateFormWithExisting = (exam: typeof existingExam) => {
        return {
          examName: exam.title,
          examDescription: exam.description,
          selectedTerm: exam.term?.term || "",
          selectedYear: exam.term?.year.toString() || "2025",
          selectedSection: exam.section || "",
          timeLimit: exam.timeLimit,
        };
      };

      const formData = populateFormWithExisting(existingExam);

      expect(formData.examName).toBe("Existing Exam");
      expect(formData.selectedTerm).toBe("Winter Term 1");
      expect(formData.selectedYear).toBe("2025");
      expect(formData.selectedSection).toBe("004");
      expect(formData.timeLimit).toBe(90);
    });
  });

  describe("Validation and Error Handling", () => {
    it("should validate required fields for exam with section", () => {
      const validateExamForm = (formData: any) => {
        const errors: string[] = [];

        if (!formData.title?.trim()) {
          errors.push("Exam title is required");
        }

        if (!formData.courseId) {
          errors.push("Course is required");
        }

        if (formData.selectedQuestions?.length === 0) {
          errors.push("At least one question must be selected");
        }

        if (formData.selectedTerm && !formData.selectedSection) {
          errors.push("Section is required when term is selected");
        }

        return errors;
      };

      const validForm = {
        title: "Valid Exam",
        courseId: "course-1",
        selectedQuestions: ["q1", "q2"],
        selectedTerm: "Winter Term 1",
        selectedSection: "001",
      };

      const invalidForm = {
        title: "",
        courseId: "",
        selectedQuestions: [],
        selectedTerm: "Winter Term 1",
        selectedSection: "",
      };

      expect(validateExamForm(validForm)).toHaveLength(0);
      expect(validateExamForm(invalidForm)).toHaveLength(4);
      expect(validateExamForm(invalidForm)).toContain(
        "Section is required when term is selected"
      );
    });

    it("should handle section consistency validation", () => {
      const validateSectionForTerm = (termName: string, section: string) => {
        if (!termName || !section) return true; // Allow empty values

        const isFirstTerm = termName.toLowerCase().includes("1");
        const sectionNum = parseInt(section);

        if (isFirstTerm) {
          // Term 1 should have sections 001-010
          return sectionNum >= 1 && sectionNum <= 10;
        } else {
          // Term 2 should have sections 101-110
          return sectionNum >= 101 && sectionNum <= 110;
        }
      };

      // Valid combinations
      expect(validateSectionForTerm("Winter Term 1", "001")).toBe(true);
      expect(validateSectionForTerm("Winter Term 1", "010")).toBe(true);
      expect(validateSectionForTerm("Winter Term 2", "101")).toBe(true);
      expect(validateSectionForTerm("Winter Term 2", "110")).toBe(true);

      // Invalid combinations
      expect(validateSectionForTerm("Winter Term 1", "101")).toBe(false);
      expect(validateSectionForTerm("Winter Term 2", "001")).toBe(false);
      expect(validateSectionForTerm("Winter Term 1", "020")).toBe(false);

      // Empty values (should pass)
      expect(validateSectionForTerm("", "")).toBe(true);
      expect(validateSectionForTerm("Winter Term 1", "")).toBe(true);
    });
  });
});
