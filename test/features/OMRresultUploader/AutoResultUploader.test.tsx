import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import ResultUploader from "../../../app/(features)/course/[id]/analytics/ResultUploader";
import { toast } from "react-hot-toast";

// Mock react-hot-toast
jest.mock("react-hot-toast", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const createCSVFile = (content: string) =>
  new File([content], "students.csv", { type: "text/csv" });

describe("AutoResultUploader integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock for uploadInfo fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        course: {
          id: "course-1",
          name: "Test Course",
          description: "Test Description",
        },
        term: { id: "term-1", term: "Fall", year: 2024 },
        exam: { id: "exam-1", title: "Final Exam", description: "Final Exam" },
        variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
        students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
        examQuestions: [
          { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
        ],
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should parse CSV and submit results successfully", async () => {
    // Mock successful submission
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          course: {
            id: "course-1",
            name: "Test Course",
            description: "Test Description",
          },
          term: { id: "term-1", term: "Fall", year: 2024 },
          exam: {
            id: "exam-1",
            title: "Final Exam",
            description: "Final Exam",
          },
          variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
          students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
          examQuestions: [
            { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: "Results saved successfully" }),
      });

    render(
      <ResultUploader
        isOpen={true}
        onClose={jest.fn()}
        generationId="gen-1"
        courseId="course-1"
        onSuccess={jest.fn()}
        onStudentsChanged={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
    });

    const fileInput = await screen.findByTestId("file-upload-input");
    const file = createCSVFile("studentId,variant,Q1\n123,1,A");

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: "studentId,variant,Q1\n123,1,A",
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({
          target: { result: "studentId,variant,Q1\n123,1,A" },
        });
      }
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("CSV parsing successful!");
    });

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Results saved successfully!");
    });
  });

  it("should show error when submission fails", async () => {
    // Mock failing submission
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          course: {
            id: "course-1",
            name: "Test Course",
            description: "Test Description",
          },
          term: { id: "term-1", term: "Fall", year: 2024 },
          exam: {
            id: "exam-1",
            title: "Final Exam",
            description: "Final Exam",
          },
          variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
          students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
          examQuestions: [
            { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        text: async () => "Submission failed",
        json: async () => ({ error: "Submission failed" }),
      });

    render(
      <ResultUploader
        isOpen={true}
        onClose={jest.fn()}
        generationId="gen-1"
        courseId="course-1"
        onSuccess={jest.fn()}
        onStudentsChanged={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
    });

    const fileInput = await screen.findByTestId("file-upload-input");
    const file = createCSVFile("studentId,variant,Q1\n123,1,A");

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: "studentId,variant,Q1\n123,1,A",
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({
          target: { result: "studentId,variant,Q1\n123,1,A" },
        });
      }
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("CSV parsing successful!");
    });

    const submitBtn = screen.getByTestId("submit-button");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to save: Submission failed"
      );
    });
  });

  it("should handle invalid CSV format", async () => {
    render(
      <ResultUploader
        isOpen={true}
        onClose={jest.fn()}
        generationId="gen-1"
        courseId="course-1"
        onSuccess={jest.fn()}
        onStudentsChanged={jest.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
    });

    const fileInput = await screen.findByTestId("file-upload-input");
    const file = createCSVFile("invalidHeader\n123");

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: "invalidHeader\n123",
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: "invalidHeader\n123" } });
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("CSV parse error:")
      );
    });
  });
});
