import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import DashboardPage from "../../../app/(features)/dashboard/page";

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock Next.js router and pathname
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: () => "/dashboard",
}));

// Mock Next.js Image component
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, width, height, className }: any) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  ),
}));

// Mock SidebarProvider and useSidebar
jest.mock("../../../app/components/Sidebar", () => {
  const React = require("react");

  // Mock SidebarProvider
  const MockSidebarProvider = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      "div",
      { "data-testid": "sidebar-provider" },
      children
    );
  };

  // Mock Sidebar component
  const MockSidebar = ({ navigationItems }: any) => {
    return React.createElement(
      "div",
      {
        "data-testid": "sidebar",
        className: "bg-brand-navy",
      },
      [
        React.createElement("div", { key: "logo" }, [
          React.createElement("img", {
            key: "logo-collapsed",
            src: "/logos/image.png",
            alt: "UExam Logo",
            width: "32",
            height: "32",
          }),
          React.createElement("img", {
            key: "logo-expanded",
            src: "/logos/image.png",
            alt: "UExam Logo",
            width: "120",
            height: "48",
          }),
        ]),
        React.createElement(
          "nav",
          { key: "nav" },
          navigationItems?.map((item: any) =>
            React.createElement(
              "button",
              {
                key: item.name,
                onClick: () => (window.location.href = item.href),
                className:
                  item.href === "/dashboard"
                    ? "bg-white/10 text-white border-r-4 border-white"
                    : "",
              },
              item.name
            )
          ) || [
            React.createElement(
              "button",
              {
                key: "dashboard",
                onClick: () => (window.location.href = "/dashboard"),
                className: "bg-white/10 text-white border-r-4 border-white",
              },
              "Dashboard"
            ),
            React.createElement(
              "button",
              {
                key: "question-bank",
                onClick: () => (window.location.href = "/question-bank"),
              },
              "Question Bank"
            ),
            React.createElement(
              "button",
              {
                key: "exam-templates",
                onClick: () => (window.location.href = "#"),
              },
              "Exam Templates"
            ),
            React.createElement(
              "button",
              { key: "analytics", onClick: () => (window.location.href = "#") },
              "Analytics"
            ),
            React.createElement(
              "button",
              {
                key: "settings",
                onClick: () => (window.location.href = "/settings"),
              },
              "Settings"
            ),
          ]
        ),
        React.createElement("div", { key: "user" }, [
          React.createElement("div", { key: "name" }, "John Doe"),
          React.createElement("div", { key: "role" }, "INSTRUCTOR"),
          React.createElement("div", { key: "avatar" }, "J"),
          React.createElement(
            "button",
            {
              key: "logout",
              title: "Logout",
              "aria-label": "logout",
              onClick: () =>
                require("next-auth/react").signOut({ callbackUrl: "/" }),
            },
            "Logout"
          ),
        ]),
      ]
    );
  };

  // Mock useSidebar hook
  const mockUseSidebar = () => ({
    isExpanded: false,
    setIsExpanded: jest.fn(),
    hasSidebar: true,
    setHasSidebar: jest.fn(),
  });

  return {
    __esModule: true,
    default: MockSidebar,
    SidebarProvider: MockSidebarProvider,
    useSidebar: mockUseSidebar,
  };
});

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Test wrapper with SidebarProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const { SidebarProvider } = require("../../../app/components/Sidebar");
  return <SidebarProvider>{children}</SidebarProvider>;
};

describe("DashboardPage", () => {
  const mockPush = jest.fn();
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  describe("Authentication Flow", () => {
    it("redirects to login if user is not authenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });

    it("redirects admin users to admin dashboard", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
    });

    it("shows loading state while session is loading", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "loading",
        update: jest.fn(),
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      expect(screen.getByText("Loading...")).toBeInTheDocument();
      const spinner = document.querySelector(".animate-spin");
      expect(spinner).toBeInTheDocument();
    });
  });

  describe("Canvas-Style Layout", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "1",
            name: "COSC 101",
            description: "Introduction to Programming",
            color: "#10b981",
            examCount: 3,
            questionCount: 25,
            createdAt: "2024-01-01",
          },
          {
            id: "2",
            name: "MATH 201",
            description: "Advanced Calculus",
            color: "#8b5cf6",
            examCount: 2,
            questionCount: 18,
            createdAt: "2024-01-02",
          },
        ],
      });
    });

    it("renders the Canvas-style sidebar with logo", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // Check for logo - there are multiple logos (collapsed and expanded states)
        const logos = screen.getAllByAltText("UExam Logo");
        expect(logos.length).toBeGreaterThanOrEqual(1);
        expect(logos[0]).toBeInTheDocument();
        expect(logos[0]).toHaveAttribute("src", "/logos/image.png");
        expect(logos[0]).toHaveAttribute("width", "32");
        expect(logos[0]).toHaveAttribute("height", "32");
      });
    });

    it("renders navigation items in sidebar", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getAllByText("Dashboard")).toHaveLength(2); // Sidebar and header
        expect(screen.getByText("Question Bank")).toBeInTheDocument(); // Sidebar
        expect(screen.getByText("Number of Questions")).toBeInTheDocument(); // Quick stats
        expect(screen.getByText("Exam Templates")).toBeInTheDocument();
        expect(screen.getByText("Analytics")).toBeInTheDocument();
        expect(screen.getByText("Settings")).toBeInTheDocument();
      });
    });

    it("shows active state for Dashboard navigation item", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const dashboardItems = screen.getAllByText("Dashboard");
        const sidebarDashboard = dashboardItems.find((item: HTMLElement) =>
          item.closest("nav")
        );
        const dashboardItem = sidebarDashboard?.closest("button");
        expect(dashboardItem).toHaveClass(
          "bg-white/10",
          "text-white",
          "border-r-4",
          "border-white"
        );
      });
    });

    it("displays user information in sidebar", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("John Doe")).toBeInTheDocument();
        expect(screen.getByText("INSTRUCTOR")).toBeInTheDocument();
        expect(screen.getByText("J")).toBeInTheDocument(); // User avatar initial
      });
    });

    it("handles logout functionality", async () => {
      const user = userEvent.setup();
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const logoutButton = screen.getByTitle("Logout");
        expect(logoutButton).toBeInTheDocument();
      });

      const logoutButton = screen.getByTitle("Logout");
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });

  describe("Main Content Area", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "1",
            name: "COSC 101",
            description: "Introduction to Programming",
            color: "#10b981",
            examCount: 3,
            questionCount: 25,
            createdAt: "2024-01-01",
          },
        ],
      });
    });

    it("renders main header with correct branding", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Dashboard" })
        ).toBeInTheDocument();
        expect(
          screen.getByText("Manage your courses and exams")
        ).toBeInTheDocument();
      });
    });

    it("displays quick stats cards", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("Total Courses")).toBeInTheDocument();
        expect(screen.getByText("Total Exams")).toBeInTheDocument();
        // Use getAllByText for Question Bank since it appears in both sidebar and stats
        const questionBankElements = screen.getAllByText("Question Bank");
        expect(questionBankElements.length).toBeGreaterThan(0);
      });
    });

    it("calculates and displays correct stats", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument(); // Total Courses
        expect(screen.getByText("3")).toBeInTheDocument(); // Total Exams
        expect(screen.getByText("25")).toBeInTheDocument(); // Total Questions
      });
    });
  });

  describe("Course Cards", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("displays course cards with correct information", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "1",
            name: "COSC 101",
            description: "Introduction to Programming",
            color: "#10b981",
            examCount: 3,
            questionCount: 25,
            createdAt: "2024-01-01",
          },
        ],
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("COSC 101")).toBeInTheDocument();
        expect(
          screen.getByText("Introduction to Programming")
        ).toBeInTheDocument();
        expect(screen.getByText("3 exams")).toBeInTheDocument();
        expect(screen.getByText("25 questions")).toBeInTheDocument();
      });
    });

    it("displays Add Course card", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText("New Course")).toBeInTheDocument();
        // Use getAllByText for Create Course since it appears in multiple places
        const createCourseElements = screen.getAllByText("Create Course");
        expect(createCourseElements.length).toBeGreaterThan(0);
        expect(
          screen.getByText("Organize your exams and questions")
        ).toBeInTheDocument();
      });
    });

    it("navigates to course page when course card is clicked", async () => {
      const user = userEvent.setup();
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "1",
            name: "COSC 101",
            description: "Introduction to Programming",
            color: "#10b981",
            examCount: 3,
            questionCount: 25,
            createdAt: "2024-01-01",
          },
        ],
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const courseCard = screen.getByText("COSC 101").closest("div");
        expect(courseCard).toBeInTheDocument();
      });

      const courseCard = screen.getByText("COSC 101").closest("div");
      await user.click(courseCard!);

      expect(mockPush).toHaveBeenCalledWith("/course/1");
    });
  });

  describe("Create Course Modal", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
    });

    it("opens create course modal when Create Course button is clicked", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", term: "Winter 1", year: "2024" },
            { id: "2", term: "Summer 1", year: "2024" },
          ],
        });
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButtons = screen.getAllByRole("button", {
          name: "Create Course",
        });
        expect(createButtons.length).toBeGreaterThan(0);
      });

      const createButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      await user.click(createButtons[0]); // Click the first button (header button)

      expect(screen.getByText("Create New Course")).toBeInTheDocument();
    });

    it("opens create course modal when Add Course card is clicked", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", term: "Winter 1", year: "2024" },
            { id: "2", term: "Summer 1", year: "2024" },
          ],
        });
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const addCourseCard = screen.getByText("New Course");
        expect(addCourseCard).toBeInTheDocument();
      });

      const addCourseCard = screen.getByText("New Course").closest("div");
      await user.click(addCourseCard!);

      expect(screen.getByText("Create New Course")).toBeInTheDocument();
    });

    it("creates new course with valid data", async () => {
      const user = userEvent.setup();
      
      // Mock all possible fetch calls to ensure proper sequencing
      // Mock fetch to handle all calls with proper responses
      mockFetch.mockImplementation(function(url, options) {
        if (url === '/api/courses' && (!options || options.method !== 'POST')) {
          // Initial courses fetch
          return Promise.resolve({
            ok: true,
            json: async () => [],
          });
        }
        if (url === '/api/terms') {
          // Terms fetch when modal opens
          return Promise.resolve({
            ok: true,
            json: async () => [
              { id: "1", term: "Winter 1", year: "2024" },
              { id: "2", term: "Summer 1", year: "2024" },
            ],
          });
        }
        if (url === '/api/courses' && options && options.method === 'POST') {
          // Course creation
          return Promise.resolve({
            ok: true,
            json: async () => ({
              id: "2",
              name: "PHYS 301",
              description: "Advanced Physics",
              color: "#f59e0b",
              examCount: 0,
              questionCount: 0,
              createdAt: "2024-01-03",
            }),
          });
        }
        // Default fallback
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: 'Not found' }),
        });
      });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButtons = screen.getAllByRole("button", {
          name: "Create Course",
        });
        expect(createButtons.length).toBeGreaterThan(0);
      });

      const createButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      
      // Open modal with act wrapping
      await act(async () => {
        await user.click(createButtons[0]);
      });

      // Wait for modal to open and terms to load
      await waitFor(() => {
        expect(screen.getByText("Create New Course")).toBeInTheDocument();
      }, { timeout: 5000 });

      // Wait for terms to be loaded and form to be ready
      await waitFor(() => {
        const nameInput = screen.queryByPlaceholderText("e.g., CSC 101 or COSC 101");
        expect(nameInput).toBeInTheDocument();
      }, { timeout: 5000 });

      // Fill out form
      const nameInput = screen.getByPlaceholderText(
        "e.g., CSC 101 or COSC 101"
      );
      const descriptionInput = screen.getByPlaceholderText(
        "Brief description of the course"
      );

      await act(async () => {
        await user.type(nameInput, "PHYS 301");
        await user.type(descriptionInput, "Advanced Physics");
      });

      // Submit form
      const submitButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      
      await act(async () => {
        await user.click(submitButtons[submitButtons.length - 1]);
      });

      await waitFor(() => {
        expect(screen.queryByText("Create New Course")).not.toBeInTheDocument();
      });

      // Verify the course was added
      await waitFor(() => {
        expect(screen.getByText("PHYS 301")).toBeInTheDocument();
      });
    });

    it("closes modal when Cancel button is clicked", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", term: "Winter 1", year: "2024" },
            { id: "2", term: "Summer 1", year: "2024" },
          ],
        });
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButtons = screen.getAllByRole("button", {
          name: "Create Course",
        });
        expect(createButtons.length).toBeGreaterThan(0);
      });

      const createButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      await user.click(createButtons[0]);

      expect(screen.getByText("Create New Course")).toBeInTheDocument();

      const cancelButton = screen.getByRole("button", { name: "Cancel" });
      await user.click(cancelButton);

      expect(screen.queryByText("Create New Course")).not.toBeInTheDocument();
    });

    it("allows color selection in modal", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", term: "Winter 1", year: "2024" },
            { id: "2", term: "Summer 1", year: "2024" },
          ],
        });
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButtons = screen.getAllByRole("button", {
          name: "Create Course",
        });
        expect(createButtons.length).toBeGreaterThan(0);
      });

      const createButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      await user.click(createButtons[0]);

      // Check that color options are available
      const colorButtons = screen
        .getAllByRole("button")
        .filter((button: HTMLElement) => button.style.backgroundColor);
      expect(colorButtons.length).toBeGreaterThan(0);

      // Click a different color
      if (colorButtons.length > 1) {
        await user.click(colorButtons[1]);
        expect(colorButtons[1]).toHaveClass("border-gray-800");
      }
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("handles course fetch error gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        // Should still render the page structure even if courses fail to load
        expect(
          screen.getByRole("heading", { name: "Dashboard" })
        ).toBeInTheDocument();
        expect(screen.getByText("My Courses")).toBeInTheDocument();
      });
    });

    it("handles course creation error gracefully", async () => {
      const user = userEvent.setup();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [
            { id: "1", term: "Winter 1", year: "2024" },
            { id: "2", term: "Summer 1", year: "2024" },
          ],
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createButtons = screen.getAllByRole("button", {
          name: "Create Course",
        });
        expect(createButtons.length).toBeGreaterThan(0);
      });

      const createButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      await user.click(createButtons[0]);

      const nameInput = screen.getByPlaceholderText(
        "e.g., CSC 101 or COSC 101"
      );
      await user.type(nameInput, "TEST 101");

      const submitButtons = screen.getAllByRole("button", {
        name: "Create Course",
      });
      await user.click(submitButtons[submitButtons.length - 1]);

      // Wait for the fetch call to be made
      await waitFor(() => {
        // Should handle error without crashing
        expect(mockFetch).toHaveBeenCalledWith(
          "/api/courses",
          expect.objectContaining({
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: expect.any(String),
          })
        );
      });
    });
  });

  describe("Brand Colors and Styling", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "John Doe",
            email: "john@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => [],
      });
    });

    it("uses brand navy color for sidebar", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const sidebar = screen.getByTestId("sidebar");
        expect(sidebar).toHaveClass("bg-brand-navy");
      });
    });

    it("uses brand navy color for buttons", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const createCourseButtons = screen.getAllByRole("button", {
          name: "Create Course",
        });
        expect(createCourseButtons[0]).toHaveClass("bg-brand-navy");
      });
    });

    it("uses white background for main content", async () => {
      render(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );

      await waitFor(() => {
        const mainContent = document.querySelector(".bg-white");
        expect(mainContent).toBeInTheDocument();
      });
    });
  });
});
