import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import TemplatePlaygroundPage from "../../../app/(features)/course/[id]/templates/playground/page";
import toast from "react-hot-toast";

// Note: This test file tests the 3-page template CREATION flow only
// Template EDITING now uses the edit page at /templates/playground/edit/

// Accurately simulate crypto.randomUUID
beforeAll(() => {
  // Define a simple crypto object
  const mockCrypto = {
    randomUUID: jest.fn(() => "fixed-uuid-" + Math.floor(Math.random() * 1000)),
  };

  Object.defineProperty(global, "crypto", {
    value: mockCrypto,
    writable: true,
    configurable: true,
  });
});

// Clear the simulation
afterAll(() => {
  if (global.crypto) {
    delete (global as any).crypto;
  }
});

// Reset the UUID generator for each test case
beforeEach(() => {
  (global.crypto.randomUUID as jest.Mock).mockReset();
});

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
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
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
    title,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
  }) =>
    isOpen ? (
      <div data-testid="confirmation-modal">
        <p>{title}</p>
        <button onClick={onConfirm} data-testid="confirm-button">
          Confirm
        </button>
        <button onClick={onClose} data-testid="cancel-button">
          Cancel
        </button>
      </div>
    ) : null,
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: mockLocalStorage });

describe("TemplatePlaygroundPage", () => {
  const mockRouterPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();

    (useSession as jest.Mock).mockReturnValue({
      data: { user: { id: "user-1" } },
      status: "authenticated",
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
    });

    (useSearchParams as jest.Mock).mockReturnValue({
      get: jest.fn(() => null),
    });
  });

  describe("Initial Render", () => {
    it("renders page title and default sections for new template", () => {
      render(<TemplatePlaygroundPage />);

      expect(screen.getByText("Create New Template")).toBeInTheDocument();
      expect(screen.getByText("Basic Information")).toBeInTheDocument();
      expect(screen.getByText("Exam Structure")).toBeInTheDocument();
    });

    it("loads template draft from localStorage when available", async () => {
      const mockDraft = {
        name: "Saved Draft",
        description: "Test draft",
        color: "#ef4444",
        sections: [
          {
            id: "Section 1",
            key: "key-1",
            name: "Section 1",
            type: "MULTIPLE_CHOICE",
            start: 1,
            end: 5,
          },
        ],
      };

      mockLocalStorage.setItem(
        "templateDraft_course-123",
        JSON.stringify(mockDraft)
      );
      render(<TemplatePlaygroundPage />);

      expect(
        await screen.findByDisplayValue("Saved Draft")
      ).toBeInTheDocument();
      expect(await screen.findByDisplayValue("Test draft")).toBeInTheDocument();
    });
  });

  describe("Template Information Management", () => {
    it("updates template name when user types", () => {
      render(<TemplatePlaygroundPage />);

      const nameInput = screen.getByPlaceholderText(
        "e.g. Midterm Exam Template"
      );
      fireEvent.change(nameInput, { target: { value: "Final Exam Template" } });

      expect(nameInput).toHaveValue("Final Exam Template");
    });

    it("updates template description when user types", () => {
      render(<TemplatePlaygroundPage />);

      const descInput = screen.getByPlaceholderText(
        "Describe the purpose of this template..."
      );
      fireEvent.change(descInput, { target: { value: "For final exams" } });

      expect(descInput).toHaveValue("For final exams");
    });
  });

  describe("Section Management", () => {
    it("adds sections correctly", async () => {
      render(<TemplatePlaygroundPage />);

      // Initially shows "No sections yet"
      expect(screen.getByText("No sections yet")).toBeInTheDocument();

      // Click to add first section
      fireEvent.click(screen.getByText("Add Your First Section"));

      // Should now show the section form
      expect(screen.getAllByText("Section 1")[0]).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("changes question type correctly", async () => {
      render(<TemplatePlaygroundPage />);

      // Add first section
      fireEvent.click(screen.getByText("Add Your First Section"));

      // Now select the combobox and change its value
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "MULTIPLE_CHOICE" } });

      expect(select).toHaveValue("MULTIPLE_CHOICE");
    });

    it("updates question range when changed", async () => {
      render(<TemplatePlaygroundPage />);

      // Add first section
      fireEvent.click(screen.getByText("Add Your First Section"));

      // Find the end question number input (the editable one)
      const endInput = screen.getByDisplayValue("5"); // Default end value

      fireEvent.change(endInput, { target: { value: "10" } });
      expect(endInput).toHaveValue(10);
    });
  });

  describe("Navigation & Validation", () => {
    it("saves draft to localStorage and navigates to next step when valid", async () => {
      render(<TemplatePlaygroundPage />);

      // Fill in template name
      const nameInput = screen.getByPlaceholderText(
        "e.g. Midterm Exam Template"
      );
      fireEvent.change(nameInput, { target: { value: "Test Template" } });

      // Add a section to make it valid
      fireEvent.click(screen.getByText("Add Your First Section"));

      // Click continue
      fireEvent.click(screen.getByText("Continue to Next Step"));

      // Check localStorage was saved
      const savedDraft = JSON.parse(
        mockLocalStorage.getItem("templateDraft_course-123") || "{}"
      );
      expect(savedDraft.name).toBe("Test Template");

      expect(mockRouterPush).toHaveBeenCalledWith(
        "/course/course-123/templates/playground/questionSelection"
      );
    });

    it("shows error when no sections exist", async () => {
      render(<TemplatePlaygroundPage />);

      // Fill in template name but don't add sections
      const nameInput = screen.getByPlaceholderText(
        "e.g. Midterm Exam Template"
      );
      fireEvent.change(nameInput, { target: { value: "Test Template" } });

      // Try to continue without sections
      fireEvent.click(screen.getByText("Continue to Next Step"));

      // Should not navigate
      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe("Template Preview", () => {
    it("displays correct preview information", async () => {
      render(<TemplatePlaygroundPage />);

      // Set template name and description
      fireEvent.change(
        screen.getByPlaceholderText("e.g. Midterm Exam Template"),
        { target: { value: "Preview Test" } }
      );
      fireEvent.change(
        screen.getByPlaceholderText("Describe the purpose of this template..."),
        { target: { value: "Preview description" } }
      );

      // Add sections to see question counts
      fireEvent.click(screen.getByText("Add Your First Section"));

      // Change the first section to True/False (1-5 by default)
      const select = screen.getByRole("combobox");
      fireEvent.change(select, { target: { value: "TRUE_FALSE" } });

      // Add another section
      fireEvent.click(screen.getByText("Add Another Section"));

      // The second section should be Multiple Choice (6-10 by default)
      const sections = screen.getAllByRole("combobox");
      fireEvent.change(sections[1], { target: { value: "MULTIPLE_CHOICE" } });

      // Check preview shows correct information
      expect(screen.getByText("Preview Test")).toBeInTheDocument();
      // Check preview area specifically (should appear twice - in input and preview)
      expect(screen.getAllByText("Preview description")).toHaveLength(2);
    });
  });

  describe("Sidebar Access", () => {
    it("includes sidebar parameter in navigation when enabled", async () => {
      (useSearchParams as jest.Mock).mockReturnValue(
        new URLSearchParams("sidebar=true")
      );

      render(<TemplatePlaygroundPage />);

      // Fill form and add section
      const nameInput = screen.getByPlaceholderText(
        "e.g. Midterm Exam Template"
      );
      fireEvent.change(nameInput, { target: { value: "Test Template" } });

      fireEvent.click(screen.getByText("Add Your First Section"));
      fireEvent.click(screen.getByText("Continue to Next Step"));

      expect(mockRouterPush).toHaveBeenCalledWith(
        "/course/course-123/templates/playground/questionSelection?sidebar=true"
      );
    });
  });
});
