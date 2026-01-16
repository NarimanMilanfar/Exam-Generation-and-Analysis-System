import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CourseTemplatesPage from "../../../app/(features)/course/[id]/templates/page";

// Mock dependencies
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(() => ({ id: "course-123" })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: jest.fn(),
  Toaster: () => null,
}));

// Mock components
jest.mock("../../../app/components/layouts/CourseLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("../../../app/components/layouts/SimpleLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("../../../app/components/shared/ConfirmationModal", () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div>
        <span>Delete confirmation</span>
        <button onClick={onConfirm}>Confirm Delete</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

const mockRouterPush = jest.fn();

describe("CourseTemplatesPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: "user-123" } },
      status: "authenticated",
    });
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });
    (fetch as jest.Mock) = jest.fn();
  });

  const mockTemplates = [
    {
      id: "template-1",
      name: "Midterm Template",
      description: "Standard midterm exam template",
      color: "#3b82f6",
      questions: [
        { questionNumber: 1, type: "MULTIPLE_CHOICE" },
        { questionNumber: 2, type: "MULTIPLE_CHOICE" },
        { questionNumber: 3, type: "TRUE_FALSE" },
        { questionNumber: 4, type: "TRUE_FALSE" },
        { questionNumber: 5, type: "MULTIPLE_CHOICE" },
      ],
      totalQuestions: 5,
      courseId: "course-123",
    },
    {
      id: "template-2",
      name: "Final Exam Template",
      description: "Comprehensive final exam",
      color: "#ef4444",
      questions: [
        { questionNumber: 1, type: "MULTIPLE_CHOICE" },
        { questionNumber: 2, type: "MULTIPLE_CHOICE" },
        { questionNumber: 3, type: "MULTIPLE_CHOICE" },
        { questionNumber: 4, type: "TRUE_FALSE" },
        { questionNumber: 5, type: "TRUE_FALSE" },
        { questionNumber: 6, type: "TRUE_FALSE" },
        { questionNumber: 7, type: "MULTIPLE_CHOICE" },
        { questionNumber: 8, type: "MULTIPLE_CHOICE" },
      ],
      totalQuestions: 8,
      courseId: "course-123",
    },
  ];

  describe("when authenticated", () => {
    it("shows loading state initially", () => {
      (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<CourseTemplatesPage />);
      expect(screen.queryByText("Exam Templates")).not.toBeInTheDocument();
    });

    it("renders templates page with course data", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText("Exam Templates")).toBeInTheDocument();
      });

      expect(screen.getByText("Create Template")).toBeInTheDocument();
    });

    it("displays empty state when no templates exist", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText("No templates yet")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Create Your First Template")
      ).toBeInTheDocument();
    });

    it("renders template cards when templates exist", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText("Midterm Template")).toBeInTheDocument();
        expect(screen.getByText("Final Exam Template")).toBeInTheDocument();
      });

      // Check template details
      expect(screen.getByText("5 questions")).toBeInTheDocument();
      expect(screen.getByText("8 questions")).toBeInTheDocument();
      expect(
        screen.getByText("Standard midterm exam template")
      ).toBeInTheDocument();
    });

    it("navigates to create template page when Create Template button is clicked", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getByText("Create Template")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Create Template"));
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/course/course-123/templates/playground"
      );
    });

    it("navigates to edit template page when Edit button is clicked", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getAllByTitle("Edit Template").length).toBe(2);
      });

      fireEvent.click(screen.getAllByTitle("Edit Template")[0]);
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/course/course-123/templates/playground/edit?templateId=template-1"
      );
    });

    it("navigates to exam playground when Create Exam button is clicked", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getAllByText("Create Exam Using Template").length).toBe(
          2
        );
      });

      fireEvent.click(screen.getAllByText("Create Exam Using Template")[0]);
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/course/course-123/exams/playground?templateId=template-1"
      );
    });

    it("shows delete modal when delete button is clicked", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getAllByText("Delete").length).toBe(2);
      });

      fireEvent.click(screen.getAllByText("Delete")[0]);
      expect(screen.getByText("Delete confirmation")).toBeInTheDocument();
    });

    it("navigates to view template when View button is clicked", async () => {
      (fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => mockTemplates })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "course-123", name: "Test Course" }),
        });

      render(<CourseTemplatesPage />);

      await waitFor(() => {
        expect(screen.getAllByText("View").length).toBe(2);
      });

      fireEvent.click(screen.getAllByText("View")[0]);
      expect(mockRouterPush).toHaveBeenCalledWith(
        "/course/course-123/templates/template-1"
      );
    });
  });

  describe("when unauthenticated", () => {
    it("redirects to login", () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      render(<CourseTemplatesPage />);
      expect(mockRouterPush).toHaveBeenCalledWith("/auth/login");
    });
  });
});
