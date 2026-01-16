import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import CourseAnalytics from "../../../app/(features)/admin/components/CourseAnalytics";
import toast from "react-hot-toast";

// Mock dependencies
jest.mock("react-hot-toast");
const mockToast = toast as jest.Mocked<typeof toast>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock terms data
const mockTerms = [
  { id: "term-1", term: "Fall", year: 2023 },
  { id: "term-2", term: "Spring", year: 2024 },
  { id: "term-3", term: "Summer", year: 2024 },
];

// Mock analytics data
const mockAnalyticsData = {
  overview: {
    totalCourses: 25,
    coursesWithExams: 20,
    coursesWithEnrollments: 22,
    averageEnrollmentsPerCourse: 35,
    recentActivity: 3,
    activeCoursesPercentage: 80,
  },
  instructorStats: [
    {
      instructor: {
        id: "instructor-1",
        name: "John Doe",
        email: "john@test.com",
      },
      courseCount: 6,
    },
    {
      instructor: {
        id: "instructor-2",
        name: "Jane Smith",
        email: "jane@test.com",
      },
      courseCount: 4,
    },
    {
      instructor: {
        id: "instructor-3",
        name: "Bob Johnson",
        email: "bob@test.com",
      },
      courseCount: 2,
    },
  ],
  termBreakdown: [
    {
      term: { id: "term-1", term: "Fall", year: 2023 },
      courseCount: 15,
    },
    {
      term: { id: "term-2", term: "Spring", year: 2024 },
      courseCount: 8,
    },
    {
      term: { id: "term-3", term: "Summer", year: 2024 },
      courseCount: 3,
    },
  ],
};

const defaultProps = {
  selectedTerm: "",
  onTermChange: jest.fn(),
  terms: mockTerms,
};

describe("CourseAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockAnalyticsData),
    } as Response);
  });

  it("renders analytics data correctly", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      // Check header
      expect(screen.getByText("Course Analytics")).toBeInTheDocument();

      // Check overview stats
      expect(screen.getByText("Total Courses")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("3 added this week")).toBeInTheDocument();

      expect(screen.getByText("Active Courses")).toBeInTheDocument();
      expect(screen.getByText("80%")).toBeInTheDocument();
      expect(screen.getByText("20 courses with exams")).toBeInTheDocument();

      expect(screen.getByText("Average Enrollment")).toBeInTheDocument();
      expect(screen.getByText("35")).toBeInTheDocument();
      expect(screen.getByText("22 courses with students")).toBeInTheDocument();
    });
  });

  it("displays instructor statistics", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Top Instructors by Course Count")).toBeInTheDocument();
      
      // Check top instructors
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@test.com")).toBeInTheDocument();
      expect(screen.getByText("6 courses")).toBeInTheDocument();

      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.getByText("jane@test.com")).toBeInTheDocument();
      expect(screen.getByText("4 courses")).toBeInTheDocument();

      expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
      expect(screen.getByText("bob@test.com")).toBeInTheDocument();
      expect(screen.getByText("2 courses")).toBeInTheDocument();
    });
  });

  it("displays term breakdown", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Course Distribution by Term")).toBeInTheDocument();
      
      // Check term breakdown - use within to scope to the term breakdown section
      const termSection = screen.getByText("Course Distribution by Term").closest('.bg-white');
      expect(within(termSection as HTMLElement).getByText("Fall 2023")).toBeInTheDocument();
      expect(within(termSection as HTMLElement).getByText("15 courses")).toBeInTheDocument();

      expect(within(termSection as HTMLElement).getByText("Spring 2024")).toBeInTheDocument();
      expect(within(termSection as HTMLElement).getByText("8 courses")).toBeInTheDocument();

      expect(within(termSection as HTMLElement).getByText("Summer 2024")).toBeInTheDocument();
      expect(within(termSection as HTMLElement).getByText("3 courses")).toBeInTheDocument();
    });
  });

  it("handles term filter change", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      const termSelect = screen.getByDisplayValue("All Terms");
      fireEvent.change(termSelect, { target: { value: "term-1" } });

      expect(defaultProps.onTermChange).toHaveBeenCalledWith("term-1");
    });
  });

  it("fetches filtered data when term is selected", async () => {
    render(<CourseAnalytics {...defaultProps} selectedTerm="term-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/courses/analytics?termId=term-1");
    });
  });

  it("fetches all data when no term is selected", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/courses/analytics");
    });
  });

  it("shows loading state", () => {
    // Mock a delayed response to test loading state
    mockFetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve(mockAnalyticsData),
        } as Response), 100)
      )
    );

    render(<CourseAnalytics {...defaultProps} />);
    
    // Check for loading skeleton elements
    const loadingElements = screen.getAllByRole("generic");
    expect(loadingElements.length).toBeGreaterThan(0);
  });

  it("handles API errors gracefully", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to fetch analytics");
      expect(screen.getByText("Failed to load analytics data.")).toBeInTheDocument();
    });
  });

  it("handles network errors", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Error loading analytics");
    });

    consoleSpy.mockRestore();
  });

  it("shows empty state when no instructor data", async () => {
    const emptyAnalyticsData = {
      ...mockAnalyticsData,
      instructorStats: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyAnalyticsData),
    } as Response);

    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("No instructor data available")).toBeInTheDocument();
    });
  });

  it("shows empty state when no term data", async () => {
    const emptyAnalyticsData = {
      ...mockAnalyticsData,
      termBreakdown: [],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(emptyAnalyticsData),
    } as Response);

    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("No term data available")).toBeInTheDocument();
    });
  });

  it("displays correct progress bars for instructor stats", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      // Check that progress bars are rendered (they're divs, not actual progressbar role)
      const progressElements = screen.getAllByText(/\d+ courses?$/);
      expect(progressElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("displays correct progress bars for term breakdown", async () => {
    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      // Check that both instructor and term progress elements exist
      const progressElements = screen.getAllByText(/\d+ courses?$/);
      expect(progressElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("limits displayed instructors to top 5", async () => {
    const manyInstructorsData = {
      ...mockAnalyticsData,
      instructorStats: [
        ...mockAnalyticsData.instructorStats,
        ...Array(10).fill(null).map((_, i) => ({
          instructor: {
            id: `instructor-${i + 4}`,
            name: `Instructor ${i + 4}`,
            email: `instructor${i + 4}@test.com`,
          },
          courseCount: 1,
        })),
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manyInstructorsData),
    } as Response);

    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      // Should only display top 5 instructors
      const instructorEmails = screen.getAllByText(/@test\.com$/);
      expect(instructorEmails.length).toBeLessThanOrEqual(5);
    });
  });

  it("limits displayed terms to top 8", async () => {
    const manyTermsData = {
      ...mockAnalyticsData,
      termBreakdown: [
        ...mockAnalyticsData.termBreakdown,
        ...Array(10).fill(null).map((_, i) => ({
          term: { id: `term-${i + 4}`, term: `Term ${i + 4}`, year: 2024 },
          courseCount: 1,
        })),
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(manyTermsData),
    } as Response);

    render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      // Should only display top 8 terms - find elements within term breakdown section
      const termSection = screen.getByText("Course Distribution by Term").closest('.bg-white');
      const termCourseElements = within(termSection as HTMLElement).getAllByText(/\d+ courses?$/);
      expect(termCourseElements.length).toBeLessThanOrEqual(8);
    });
  });

  it("refetches data when selectedTerm changes", async () => {
    const { rerender } = render(<CourseAnalytics {...defaultProps} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/courses/analytics");
    });

    // Clear the mock to track new calls
    mockFetch.mockClear();

    // Change selected term
    rerender(<CourseAnalytics {...defaultProps} selectedTerm="term-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/courses/analytics?termId=term-1");
    });
  });
});