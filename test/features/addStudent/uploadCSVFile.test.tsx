// test/features/uploadCSV/uploadCSVFile.test.tsx

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import UploadCSVFile from "../../../app/(features)/course/[id]/student/uploadCSVFile";
import toast from "react-hot-toast";

// Mock react-hot-toast
jest.mock("react-hot-toast");

describe("UploadCSVFile Component", () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const courseId = "test-course-id";

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch for terms API
    (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: "term1", year: 2023, term: "Fall" },
          { id: "term2", year: 2023, term: "Spring" },
        ]),
    });
  });

  it("renders upload dialog correctly", async () => {
    render(
      <UploadCSVFile
        show={true}
        onClose={mockOnClose}
        courseId={courseId}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Upload CSV File")).toBeInTheDocument();
      expect(screen.getByText("Choose CSV file to upload")).toBeInTheDocument();
    });
  });

  it("automatically parses file when CSV is selected", async () => {
    render(
      <UploadCSVFile
        show={true}
        onClose={mockOnClose}
        courseId={courseId}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText(/Choose CSV file to upload/i);
    const csvContent = "id,name\n12345678,John Doe\n67890123,Jane Smith";
    const file = new File([csvContent], "students.csv", { type: "text/csv" });

    // Mock FileReader
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: csvContent,
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: csvContent } });
      }
    });

    // Should show success toast for auto-parsing
    expect(toast.success).toHaveBeenCalledWith("File parsed successfully");

    // Should show parsed data preview
    await waitFor(() => {
      expect(screen.getByText(/Parsed Data Preview/i)).toBeInTheDocument();
      expect(screen.getByText(/Doe/)).toBeInTheDocument(); 
    expect(screen.getByText(/Smith/)).toBeInTheDocument();
    });
  });

  it("shows an error toast for invalid data format rows", async () => {
    render(
      <UploadCSVFile
        show={true}
        onClose={mockOnClose}
        courseId={courseId}
        onSuccess={mockOnSuccess}
      />
    );

    const fileInput = screen.getByLabelText(/Choose CSV file to upload/i);
    const invalidCsvContent = "id,name,extra\n12345,Doe"; // Invalid format
    const file = new File([invalidCsvContent], "students.csv", {
      type: "text/csv",
    });

    // Mock FileReader
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: invalidCsvContent,
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: invalidCsvContent } });
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });

    await waitFor(() => {
      const errorItem = screen.getByText("CSV must have exactly 2 columns. Expected: id,name");
      expect(errorItem).toBeInTheDocument();
    });

    expect(screen.getByText(/Save and Upload/i)).toBeDisabled();
  });

  it("shows an error toast for empty rows", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    render(
      <UploadCSVFile
        show={true}
        onClose={mockOnClose}
        courseId="test-course"
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/Choose CSV file to upload/i)
      ).toBeInTheDocument();
    });

    // File with an empty row
    const csvContent = "id,name\n123,John\n,";
    const file = new File([csvContent], "students.csv", { type: "text/csv" });

    const fileInput = screen.getByLabelText(/Choose CSV file to upload/i);

    // Mock FileReader
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: csvContent,
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Simulate FileReader onload with empty rows
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: csvContent } });
      }
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Found 2 format errors"),
        expect.anything()
      );
    });
  });

  it("handles save and API success correctly", async () => {
    // Mock successful API response for saving
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([{ id: "term1", year: 2023, term: "Fall" }]),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ enrollments: [] }),
      });

    render(
      <UploadCSVFile
        show={true}
        onClose={mockOnClose}
        courseId={courseId}
        onSuccess={mockOnSuccess}
      />
    );

    const csvContent = "id,name\n12345678,John Doe\n67890123,Jane Smith";
    const file = new File([csvContent], "students.csv", { type: "text/csv" });

    // Mock FileReader for auto-parsing
    const mockFileReader = {
      readAsText: jest.fn(),
      onload: null as any,
      result: csvContent,
    };
    (global as any).FileReader = jest.fn(() => mockFileReader);

    const fileInput = screen.getByLabelText(/Choose CSV file to upload/i);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Trigger auto-parsing
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: csvContent } });
      }
    });

    // Wait for terms to load and select them
    await waitFor(() => {
      expect(screen.getByText("2023")).toBeInTheDocument();
    });

    // Select year and term
    const yearSelect = screen.getByLabelText(/Year/i);
    const termSelect = screen.getByLabelText(/Term/i);

    fireEvent.change(yearSelect, { target: { value: "2023" } });

    await waitFor(() => {
      expect(termSelect).not.toBeDisabled();
    });

    fireEvent.change(termSelect, { target: { value: "Fall" } });

    // Click save
    const saveButton = screen.getByText("Save and Upload");
    expect(saveButton).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("shows error for non-CSV files", async () => {
    render(
      <UploadCSVFile
        show={true}
        onClose={mockOnClose}
        courseId={courseId}
        onSuccess={mockOnSuccess}
      />
    );

    const file = new File(["content"], "test.txt", { type: "text/plain" });
    const fileInput = screen.getByLabelText(/Choose CSV file to upload/i);

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    expect(toast.error).toHaveBeenCalledWith("Please select a CSV file");
  });
});
