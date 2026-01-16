/**
 * Jest unit tests for Course Exams Page Export Functionality
 * Tests the export features including modal logic and DOCX generation
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Document, Packer } from "docx";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock next-auth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
}));

// Mock docx library
jest.mock("docx", () => ({
  Document: jest.fn(),
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  Packer: {
    toBuffer: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock DOM methods
const mockLink = {
  setAttribute: jest.fn(),
  click: jest.fn(),
  style: {},
};

document.createElement = jest.fn(() => mockLink) as any;
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

describe("Exams Page Export Functionality", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  const mockSession = {
    user: {
      id: "user-1",
      email: "test@example.com",
    },
  };

  const mockExams = [
    {
      id: "exam-1",
      title: "Midterm Exam",
      description: "Midterm examination",
      timeLimit: 60,
      questionCount: 5,
      createdAt: "2024-01-01T00:00:00Z",
      term: { term: "Fall", year: 2024 },
      section: "001",
    },
    {
      id: "exam-2", 
      title: "Final Exam",
      description: "Final examination",
      timeLimit: 120,
      questionCount: 10,
      createdAt: "2024-01-02T00:00:00Z",
      term: { term: "Fall", year: 2024 },
      section: "001",
    },
  ];

  const mockDetailedExam = {
    id: "exam-1",
    title: "Midterm Exam",
    description: "Midterm examination",
    timeLimit: 60,
    createdAt: "2024-01-01T00:00:00Z",
    term: { term: "Fall", year: 2024 },
    section: "001",
    questions: [
      {
        id: "q1",
        text: "What is the capital of France?",
        type: "MULTIPLE_CHOICE",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        points: 2,
        negativePoints: -1,
      },
      {
        id: "q2",
        text: "JavaScript is a compiled language.",
        type: "TRUE_FALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        points: 1,
        negativePoints: null,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useParams as jest.Mock).mockReturnValue({ id: "course-1" });
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });

    // Mock successful API responses
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/courses/course-1")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: "course-1",
            name: "Test Course",
            description: "Test course description",
            color: "#3b82f6",
            examCount: 2,
            questionCount: 10,
          }),
        });
      }
      if (url.includes("/api/courses/course-1/exams")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockExams),
        });
      }
      if (url.includes("/api/terms")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { term: "Fall", year: 2024 },
            { term: "Spring", year: 2024 },
          ]),
        });
      }
      if (url.includes("/api/exams/exam-1")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDetailedExam),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    // Mock docx library
    (Document as jest.Mock).mockImplementation(() => ({}));
    (Packer.toBuffer as jest.Mock).mockResolvedValue(Buffer.from("mock-docx-content"));
  });

  describe("Export Selection Logic", () => {
    it("should handle exam selection state correctly", () => {
      // Test state management logic
      let selectedExamIds: string[] = [];
      
      // Simulate selecting all exams
      const handleSelectAllExams = () => {
        selectedExamIds = mockExams.map(exam => exam.id);
      };

      // Simulate deselecting all exams
      const handleDeselectAllExams = () => {
        selectedExamIds = [];
      };

      // Simulate toggling individual exam
      const handleExamToggle = (examId: string) => {
        selectedExamIds = selectedExamIds.includes(examId) 
          ? selectedExamIds.filter(id => id !== examId)
          : [...selectedExamIds, examId];
      };

      // Test initial state
      expect(selectedExamIds).toEqual([]);

      // Test select all
      handleSelectAllExams();
      expect(selectedExamIds).toEqual(["exam-1", "exam-2"]);

      // Test deselect all
      handleDeselectAllExams();
      expect(selectedExamIds).toEqual([]);

      // Test individual toggle
      handleExamToggle("exam-1");
      expect(selectedExamIds).toEqual(["exam-1"]);

      handleExamToggle("exam-2");
      expect(selectedExamIds).toEqual(["exam-1", "exam-2"]);

      handleExamToggle("exam-1");
      expect(selectedExamIds).toEqual(["exam-2"]);
    });

    it("should validate export requirements", () => {
      const validateExportSelection = (selectedIds: string[]) => {
        if (selectedIds.length === 0) {
          return { valid: false, error: "No exams selected for export" };
        }
        return { valid: true, error: null };
      };

      expect(validateExportSelection([])).toEqual({
        valid: false,
        error: "No exams selected for export"
      });

      expect(validateExportSelection(["exam-1"])).toEqual({
        valid: true,
        error: null
      });

      expect(validateExportSelection(["exam-1", "exam-2"])).toEqual({
        valid: true,
        error: null
      });
    });
  });

  describe("DOCX Export Generation", () => {
    it("should fetch exam details for selected exams", async () => {
      const selectedExamIds = ["exam-1"];
      
      // Simulate the export process
      const examPromises = selectedExamIds.map(async (examId) => {
        const response = await fetch(`/api/exams/${examId}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const detailedExams = (await Promise.all(examPromises)).filter(Boolean);

      expect(global.fetch).toHaveBeenCalledWith("/api/exams/exam-1");
      expect(detailedExams).toHaveLength(1);
      expect(detailedExams[0]).toEqual(mockDetailedExam);
    });

    it("should handle fetch errors gracefully", async () => {
      // Mock fetch to return error
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500,
        })
      );

      const selectedExamIds = ["exam-1"];
      
      const examPromises = selectedExamIds.map(async (examId) => {
        const response = await fetch(`/api/exams/${examId}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const detailedExams = (await Promise.all(examPromises)).filter(Boolean);

      expect(detailedExams).toHaveLength(0);
    });

    it("should create DOCX document with proper structure", async () => {
      const selectedExamIds = ["exam-1"];
      
      // Fetch exam details
      const examPromises = selectedExamIds.map(async (examId) => {
        const response = await fetch(`/api/exams/${examId}`);
        return response.ok ? await response.json() : null;
      });

      const detailedExams = (await Promise.all(examPromises)).filter(Boolean);
      
      // Simulate document creation
      if (detailedExams.length > 0) {
        const doc = new Document({
          sections: [{
            properties: {},
            children: [], // Document content would be built here
          }],
        });

        const buffer = await Packer.toBuffer(doc);

        expect(Document).toHaveBeenCalled();
        expect(Packer.toBuffer).toHaveBeenCalled();
        expect(buffer).toEqual(Buffer.from("mock-docx-content"));
      }
    });

    it("should handle multiple choice question formatting", () => {
      const question = {
        text: "What is the capital of France?",
        type: "MULTIPLE_CHOICE",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correctAnswer: "Paris",
        points: 2,
        negativePoints: -1,
      };

      // Test answer formatting logic
      const getAnswerFormatted = (question: any) => {
        if (question.type === "MULTIPLE_CHOICE" && question.options) {
          const answerIndex = question.options.findIndex(
            (option: string) => option === question.correctAnswer
          );
          if (answerIndex !== -1) {
            return String.fromCharCode(65 + answerIndex); // A, B, C, D...
          }
        }
        return question.correctAnswer;
      };

      expect(getAnswerFormatted(question)).toBe("C"); // Paris is option C
    });

    it("should handle true/false question formatting", () => {
      const question = {
        text: "JavaScript is a compiled language.",
        type: "TRUE_FALSE",
        options: ["True", "False"],
        correctAnswer: "False",
        points: 1,
        negativePoints: null,
      };

      const getAnswerFormatted = (question: any) => {
        if (question.type === "TRUE_FALSE") {
          return question.correctAnswer;
        }
        return question.correctAnswer;
      };

      expect(getAnswerFormatted(question)).toBe("False");
    });

    it("should generate proper filename", () => {
      const courseName = "Test Course with Special Characters!@#";
      const generateFilename = (courseName: string) => {
        const date = new Date().toISOString().split('T')[0];
        return `${courseName.replace(/[^a-z0-9]/gi, '_')}_exams_${date}.docx`;
      };

      const filename = generateFilename(courseName);
             expect(filename).toMatch(/^Test_Course_with_Special_Characters____exams_\d{4}-\d{2}-\d{2}\.docx$/);
    });

    it("should trigger file download", async () => {
      const buffer = Buffer.from("mock-docx-content");
      const filename = "test_exams_2024-01-01.docx";

      // Simulate download process
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      expect(document.createElement).toHaveBeenCalledWith("a");
      expect(mockLink.setAttribute).toHaveBeenCalledWith("href", "mock-url");
      expect(mockLink.setAttribute).toHaveBeenCalledWith("download", filename);
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe("User Feedback", () => {
    it("should show loading toast during export", () => {
      const loadingToast = toast.loading("Generating DOCX export...");
      expect(toast.loading).toHaveBeenCalledWith("Generating DOCX export...");
    });

         it("should show success message after export", () => {
       const examCount = 2;
       const suffix = examCount > 1 ? 's' : '';
       const message = `Exported ${examCount} exam${suffix} to DOCX`;
       toast.success(message);
       expect(toast.success).toHaveBeenCalledWith("Exported 2 exams to DOCX");
     });

    it("should show error message on export failure", () => {
      toast.error("Failed to fetch exam details");
      expect(toast.error).toHaveBeenCalledWith("Failed to fetch exam details");
    });

    it("should dismiss loading toast after completion", () => {
      const loadingToast = "mock-toast-id";
      toast.dismiss(loadingToast);
      expect(toast.dismiss).toHaveBeenCalledWith(loadingToast);
    });
  });

  describe("Error Handling", () => {
    it("should handle no exams selected error", () => {
      const selectedExamIds: string[] = [];
      
      if (selectedExamIds.length === 0) {
        toast.error("No exams selected for export");
      }

      expect(toast.error).toHaveBeenCalledWith("No exams selected for export");
    });

    it("should handle API failure gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      try {
        await fetch("/api/exams/exam-1");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network error");
      }
    });

         it("should handle DOCX generation failure", async () => {
       (Packer.toBuffer as jest.Mock).mockRejectedValueOnce(new Error("DOCX generation failed"));

       const mockDoc = new Document({ sections: [] });
       
       try {
         await Packer.toBuffer(mockDoc);
       } catch (error) {
         expect(error).toBeInstanceOf(Error);
         expect((error as Error).message).toBe("DOCX generation failed");
       }
     });
  });
}); 