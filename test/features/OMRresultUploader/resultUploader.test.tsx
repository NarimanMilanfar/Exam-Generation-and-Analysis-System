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

const mockOnClose = jest.fn();
const mockOnSuccess = jest.fn();
const mockOnStudentsChanged = jest.fn();

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  generationId: "gen123",
  courseId: "course123",
  onSuccess: mockOnSuccess,
  onStudentsChanged: mockOnStudentsChanged,
};

describe("ResultUploader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        course: {
          id: "course-1",
          name: "Test Course",
          description: "Course desc",
        },
        term: { id: "term-1", term: "Fall", year: 2024 },
        exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
        variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
        students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
        examQuestions: [],
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders the modal when open", async () => {
    render(<ResultUploader {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Upload OMR Grades")).toBeInTheDocument();
    });
  });

  it("does not render when closed", () => {
    render(<ResultUploader {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Upload OMR Grades")).not.toBeInTheDocument();
  });

  it("displays course information", async () => {
    render(<ResultUploader {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Test Course")).toBeInTheDocument();
      expect(screen.getByText("Fall 2024")).toBeInTheDocument();
      expect(screen.getByText("Final Exam")).toBeInTheDocument();
    });
  });

  it("shows upload area", async () => {
    render(<ResultUploader {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Choose CSV file to upload")).toBeInTheDocument();
      expect(screen.getByTestId("file-upload-input")).toBeInTheDocument();
    });
  });

  it("calls onClose when close button is clicked", async () => {
    render(<ResultUploader {...defaultProps} />);
    const closeBtn = screen.getByRole("button", { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("handles drag and drop file upload", async () => {
    render(<ResultUploader {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Choose CSV file to upload/i)
      ).toBeInTheDocument();
    });

    const dropZone = screen.getByTestId("drop-zone");
    const file = new File(["studentId,variant,Q1\n1,1,A"], "test.csv", {
      type: "text/csv",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Selected file:/i)).toBeInTheDocument();
    });
  });

  it("automatically parses file when selected and shows success", async () => {
    // Override the default mock to include exam questions
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          course: {
            id: "course-1",
            name: "Test Course",
            description: "Course desc",
          },
          term: { id: "term-1", term: "Fall", year: 2024 },
          exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
          variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
          students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
          examQuestions: [
            { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
          ],
        }),
      })
    );

    render(<ResultUploader {...defaultProps} />);
    await screen.findByText("Choose CSV file to upload");

    const file = new File(["studentId,variant,Q1\n123,1,A"], "test.csv", {
      type: "text/csv",
    });

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: "studentId,variant,Q1\n123,1,A",
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    const input = screen.getByTestId("file-upload-input");

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });

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
  });

  it("shows error if required CSV fields are missing", async () => {
    render(<ResultUploader {...defaultProps} />);
    await waitFor(() => {
      expect(
        screen.getByText(/Choose CSV file to upload/i)
      ).toBeInTheDocument();
    });

    const file = new File(["wrongHeader\n123"], "bad.csv", {
      type: "text/csv",
    });

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: "wrongHeader\n123",
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(screen.getByTestId("file-upload-input"), {
        target: { files: [file] },
      });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: "wrongHeader\n123" } });
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("CSV parse error:")
      );
    });
  });

  it("calls onSuccess and onClose after successful submit", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          course: {
            id: "course-1",
            name: "Test Course",
            description: "Course description",
          },
          term: { id: "term-1", term: "Fall", year: 2024 },
          exam: {
            id: "exam-1",
            title: "Final Exam",
            description: "Final exam",
            term: {
              id: "term-1",
              term: "Fall",
              year: 2024,
            },
            termId: null,
          },
          variants: [
            {
              id: "v1",
              variantNumber: 1,
              variantCode: "A",
              questionOrder: JSON.stringify([0]),
            },
          ],
          students: [{ id: "s1", name: "Student 1", studentId: "123" }],
          examQuestions: [
            {
              id: "q1",
              questionId: "q1",
              question: {
                id: "q1",
                text: "Q1?",
                correctAnswer: "A",
                points: 1,
              },
              points: 1,
            },
          ],
          variantAnswers: [
            {
              variantNumber: 1,
              variantCode: "A",
              questions: [
                {
                  questionId: "q1",
                  questionNumber: 1,
                  text: "Q1?",
                  correctAnswer: "A",
                  originalAnswer: "",
                  points: 1,
                },
              ],
            },
          ],
        }),
      })
    );

    (global.fetch as jest.Mock).mockImplementationOnce(() =>
      Promise.resolve({ ok: true })
    );

    render(<ResultUploader {...defaultProps} />);

    await screen.findByText("Choose CSV file to upload");

    const file = new File(["studentId,variant,Q1\n123,1,A"], "good.csv", {
      type: "text/csv",
    });

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: "studentId,variant,Q1\n123,1,A",
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(screen.getByTestId("file-upload-input"), {
        target: { files: [file] },
      });

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

    fireEvent.click(screen.getByText(/submit/i));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Results saved successfully!");
      expect(defaultProps.onSuccess).toHaveBeenCalled();
    });
  });

  it("disables submit button if CSV is invalid", async () => {
    render(<ResultUploader {...defaultProps} />);
    const button = await screen.findByText(/submit/i);
    expect(button).toBeDisabled();
  });

  describe("Question Count Validation", () => {
    it("validates correct question count", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } },
              { id: "q2", questionId: "q2", question: { id: "q2", text: "Q2?", correctAnswer: "B", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1,Q2\n123,1,A,B"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1,Q2\n123,1,A,B",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1,Q2\n123,1,A,B" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("CSV parsing successful!");
      });
    });

    it("shows error for question count mismatch", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } },
              { id: "q2", questionId: "q2", question: { id: "q2", text: "Q2?", correctAnswer: "B", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1\n123,1,A"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Question count mismatch")
        );
      });
    });

    it("shows error when no exam questions exist", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [{ id: "variant-1", variantNumber: 1, variantCode: "A" }],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1\n123,1,A"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("No exam questions found")
        );
      });
    });
  });

  describe("Variant Number Validation", () => {
    it("validates correct variant numbers", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [
              { id: "variant-1", variantNumber: 1, variantCode: "A" },
              { id: "variant-2", variantNumber: 2, variantCode: "B" }
            ],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1\n123,1,A\n456,2,B"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A\n456,2,B",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A\n456,2,B" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("CSV parsing successful!");
      });
    });

    it("shows error for variant count mismatch", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [
              { id: "variant-1", variantNumber: 1, variantCode: "A" },
              { id: "variant-2", variantNumber: 2, variantCode: "B" },
              { id: "variant-3", variantNumber: 3, variantCode: "C" }
            ],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1\n123,1,A\n456,2,B"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A\n456,2,B",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A\n456,2,B" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Variant count mismatch")
        );
      });
    });

    it("shows error for invalid variant numbers", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [
              { id: "variant-1", variantNumber: 1, variantCode: "A" },
              { id: "variant-2", variantNumber: 2, variantCode: "B" }
            ],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1\n123,1,A\n456,3,B"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A\n456,3,B",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A\n456,3,B" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Invalid variant numbers found")
        );
      });
    });

    it("shows error when no variant column exists", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [
              { id: "variant-1", variantNumber: 1, variantCode: "A" }
            ],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,Q1\n123,A"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,Q1\n123,A",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,Q1\n123,A" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("No variant column found in CSV")
        );
      });
    });

    it("shows error when no exam variants exist", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      const file = new File(["studentId,variant,Q1\n123,1,A"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("No exam variants found")
        );
      });
    });

    it("validates exact variant match requirement", async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            course: { id: "course-1", name: "Test Course", description: "Course desc" },
            term: { id: "term-1", term: "Fall", year: 2024 },
            exam: { id: "exam-1", title: "Final Exam", description: "Final exam" },
            variants: [
              { id: "variant-1", variantNumber: 1, variantCode: "A" },
              { id: "variant-2", variantNumber: 2, variantCode: "B" }
            ],
            students: [{ id: "student-1", name: "John Doe", studentId: "123" }],
            examQuestions: [
              { id: "q1", questionId: "q1", question: { id: "q1", text: "Q1?", correctAnswer: "A", points: 1 } }
            ],
          }),
        })
      );

      render(<ResultUploader {...defaultProps} />);
      await screen.findByText("Choose CSV file to upload");

      // Only using variant 1, missing variant 2
      const file = new File(["studentId,variant,Q1\n123,1,A"], "test.csv", {
        type: "text/csv",
      });

      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null as any,
        result: "studentId,variant,Q1\n123,1,A",
      };
      (global as any).FileReader = jest.fn(() => mockFileReader);

      await act(async () => {
        fireEvent.change(screen.getByTestId("file-upload-input"), {
          target: { files: [file] },
        });

        if (mockFileReader.onload) {
          mockFileReader.onload({
            target: { result: "studentId,variant,Q1\n123,1,A" },
          });
        }
      });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining("Variant count mismatch")
        );
      });
    });
  });
});
