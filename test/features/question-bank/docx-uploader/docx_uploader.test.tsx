import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import DocxUploaderModal from "../../../../app/(features)/course/[id]/question-bank/[questionBankId]/DocxUploaderModal";

// Mock fetch
global.fetch = jest.fn();

const mockProps = {
  courseId: "course-1",
  questionBankId: "bank-1",
  onClose: jest.fn(),
  onUploadSuccess: jest.fn(),
};

describe("DocxUploaderModal", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders upload modal", () => {
    render(<DocxUploaderModal {...mockProps} />);

    expect(
      screen.getByText("Bulk Upload Questions from DOCX")
    ).toBeInTheDocument();
    expect(screen.getByText("Choose DOCX file to upload")).toBeInTheDocument();
  });

  it("automatically parses file when selected and shows parsed questions", async () => {
    // Mock successful parsing response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [
          {
            text: "What is 2+2?",
            type: "MULTIPLE_CHOICE",
            options: ["3", "4", "5"],
            correctAnswer: "4",
            points: 1,
          },
        ],
      }),
    });

    render(<DocxUploaderModal {...mockProps} />);

    const fileInput = screen.getByLabelText(/Choose DOCX file to upload/i);
    const file = new File(["content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Parsed Questions \(1\)/i)).toBeInTheDocument();
    });

    expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    expect(screen.getByText(/Save All Questions/i)).toBeInTheDocument();
  });

  it("handles parsing errors", async () => {
    // Mock failed parsing response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Failed to parse file" }),
    });

    render(<DocxUploaderModal {...mockProps} />);

    const fileInput = screen.getByLabelText(/Choose DOCX file to upload/i);
    const file = new File(["content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Failed to parse file/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Save All Questions/i)).not.toBeInTheDocument();
  });

  it("handles successful save and calls callbacks", async () => {
    // Mock successful parsing response
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: [
            {
              text: "What is 2+2?",
              type: "MULTIPLE_CHOICE",
              options: ["3", "4", "5"],
              correctAnswer: "4",
              points: 1,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

    render(<DocxUploaderModal {...mockProps} />);

    const fileInput = screen.getByLabelText(/Choose DOCX file to upload/i);
    const file = new File(["content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(screen.getByText(/Save All Questions/i)).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/Save All Questions/i);

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockProps.onUploadSuccess).toHaveBeenCalled();
    });
  });

  it("shows loading state during processing", async () => {
    // Mock a slow response
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ questions: [] }),
              }),
            100
          )
        )
    );

    render(<DocxUploaderModal {...mockProps} />);

    const fileInput = screen.getByLabelText(/Choose DOCX file to upload/i);
    const file = new File(["content"], "test.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(screen.getByText(/Processing file/i)).toBeInTheDocument();
  });

  it("validates file type", async () => {
    render(<DocxUploaderModal {...mockProps} />);

    const fileInput = screen.getByLabelText(/Choose DOCX file to upload/i);
    const file = new File(["content"], "test.txt", { type: "text/plain" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Please select a DOCX file/i)
      ).toBeInTheDocument();
    });
  });
});
