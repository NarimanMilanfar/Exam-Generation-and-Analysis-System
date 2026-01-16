/**
 * ActivityItem Component Tests
 *
 * Tests the ActivityItem component rendering and behavior
 */

import { render, screen } from "@testing-library/react";
import ActivityItem from "../../../app/components/activity/ActivityItem";

const mockActivity = {
  id: "activity-1",
  userId: "user-123",
  courseId: "course-123",
  action: "EXAM_CREATED",
  resource: "exam",
  resourceId: "exam-456",
  details: '{"title":"Final Exam","description":"Comprehensive final exam"}',
  createdAt: "2024-01-15T10:30:00Z",
  user: {
    id: "user-123",
    name: "John Doe",
    email: "john@example.com",
  },
};

describe("ActivityItem Component", () => {
  describe("Rendering", () => {
    it("should render activity item correctly", () => {
      render(<ActivityItem activity={mockActivity} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Exam Created")).toBeInTheDocument();
      expect(screen.getByText("Final Exam")).toBeInTheDocument();
    });

    it("should render user initials in avatar", () => {
      render(<ActivityItem activity={mockActivity} />);

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it("should format action text correctly", () => {
      const activityWithUnderscore = {
        ...mockActivity,
        action: "QUESTION_BANK_UPDATED",
      };

      render(<ActivityItem activity={activityWithUnderscore} />);

      expect(screen.getByText("Question Bank Updated")).toBeInTheDocument();
    });

    it("should display resource type", () => {
      render(<ActivityItem activity={mockActivity} />);

      expect(screen.getByText(/exam/)).toBeInTheDocument();
    });

    it("should display formatted date", () => {
      render(<ActivityItem activity={mockActivity} />);

      // Date should be formatted to local date and time
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
    });
  });

  describe("Compact Mode", () => {
    it("should render in compact mode", () => {
      render(<ActivityItem activity={mockActivity} compact={true} />);

      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Exam Created")).toBeInTheDocument();
    });

    it("should show only date in compact mode", () => {
      render(<ActivityItem activity={mockActivity} compact={true} />);

      // In compact mode, should only show date, not time
      const dateText = screen.getByText(/1\/15\/2024/);
      expect(dateText).toBeInTheDocument();
      // Should not contain "at" (indicating time)
      expect(dateText.textContent).not.toMatch(/at/);
    });
  });

  describe("Action Colors", () => {
    it("should apply green color for CREATED actions", () => {
      render(<ActivityItem activity={mockActivity} />);

      const actionBadge = screen.getByText("Exam Created");
      expect(actionBadge).toHaveClass("text-green-600", "bg-green-100");
    });

    it("should apply blue color for UPDATED actions", () => {
      const updatedActivity = {
        ...mockActivity,
        action: "EXAM_UPDATED",
      };

      render(<ActivityItem activity={updatedActivity} />);

      const actionBadge = screen.getByText("Exam Updated");
      expect(actionBadge).toHaveClass("text-blue-600", "bg-blue-100");
    });

    it("should apply red color for DELETED actions", () => {
      const deletedActivity = {
        ...mockActivity,
        action: "EXAM_DELETED",
      };

      render(<ActivityItem activity={deletedActivity} />);

      const actionBadge = screen.getByText("Exam Deleted");
      expect(actionBadge).toHaveClass("text-red-600", "bg-red-100");
    });

    it("should apply purple color for SHARED actions", () => {
      const sharedActivity = {
        ...mockActivity,
        action: "COLLABORATOR_ADDED",
      };

      render(<ActivityItem activity={sharedActivity} />);

      const actionBadge = screen.getByText("Collaborator Added");
      expect(actionBadge).toHaveClass("text-purple-600", "bg-purple-100");
    });

    it("should apply gray color for unknown actions", () => {
      const unknownActivity = {
        ...mockActivity,
        action: "UNKNOWN_ACTION",
      };

      render(<ActivityItem activity={unknownActivity} />);

      const actionBadge = screen.getByText("Unknown Action");
      expect(actionBadge).toHaveClass("text-gray-600", "bg-gray-100");
    });
  });

  describe("Resource Display Names", () => {
    it("should display exam title from details", () => {
      render(<ActivityItem activity={mockActivity} />);

      expect(screen.getByText("Final Exam")).toBeInTheDocument();
    });

    it("should display question text truncated", () => {
      const questionActivity = {
        ...mockActivity,
        resource: "question",
        details:
          '{"text":"This is a very long question text that should be truncated after 50 characters to keep the display clean"}',
      };

      render(<ActivityItem activity={questionActivity} />);

      expect(
        screen.getByText(/This is a very long question text that should be/)
      ).toBeInTheDocument();
      expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
    });

    it("should display question bank name from details", () => {
      const questionBankActivity = {
        ...mockActivity,
        resource: "question_bank",
        details: '{"name":"Biology Question Bank"}',
      };

      render(<ActivityItem activity={questionBankActivity} />);

      expect(screen.getByText("Biology Question Bank")).toBeInTheDocument();
    });

    it("should display collaborator name from details", () => {
      const collaboratorActivity = {
        ...mockActivity,
        resource: "collaborator",
        details: '{"name":"Jane Smith"}',
      };

      render(<ActivityItem activity={collaboratorActivity} />);

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });

    it("should fallback to resourceId when details parsing fails", () => {
      const invalidDetailsActivity = {
        ...mockActivity,
        details: "invalid json",
        resourceId: "fallback-id",
      };

      render(<ActivityItem activity={invalidDetailsActivity} />);

      expect(screen.getByText("fallback-id")).toBeInTheDocument();
    });

    it("should fallback to resourceId when details is null", () => {
      const nullDetailsActivity = {
        ...mockActivity,
        details: null,
        resourceId: "fallback-id",
      };

      render(<ActivityItem activity={nullDetailsActivity} />);

      expect(screen.getByText("fallback-id")).toBeInTheDocument();
    });
  });

  describe("User Avatar", () => {
    it("should show first letter of user name", () => {
      render(<ActivityItem activity={mockActivity} />);

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    it('should show "U" when user name is empty', () => {
      const noNameActivity = {
        ...mockActivity,
        user: {
          ...mockActivity.user,
          name: "",
        },
      };

      render(<ActivityItem activity={noNameActivity} />);

      expect(screen.getByText("U")).toBeInTheDocument();
    });

    it('should show "U" when user name is null', () => {
      const nullNameActivity = {
        ...mockActivity,
        user: {
          ...mockActivity.user,
          name: null as any,
        },
      };

      render(<ActivityItem activity={nullNameActivity} />);

      expect(screen.getByText("U")).toBeInTheDocument();
    });
  });

  describe("Hover Effects", () => {
    it("should have hover class", () => {
      const { container } = render(<ActivityItem activity={mockActivity} />);

      const activityItem = container.firstChild as HTMLElement;
      expect(activityItem).toHaveClass("hover:bg-gray-50");
    });
  });
});
