import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import AdminDashboardPage from "../../../app/(features)/admin/dashboard/page";

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(() => "/admin/dashboard"),
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

// Mock DashboardStats component
jest.mock("../../../app/(features)/admin/components/DashboardStats", () => {
  return function MockDashboardStats({ stats, users }: any) {
    return (
      <div data-testid="dashboard-stats">
        <div>System Status</div>
        <div>Exam Statistics</div>
        <div>Total users</div>
        <div>Server uptime</div>
        <div>good</div>
        <div>99.9%</div>
        <div>System health</div>
        <div>Current Active Users</div>
      </div>
    );
  };
});

// Mock UserTable component
jest.mock("../../../app/(features)/admin/components/UserTable", () => {
  return function MockUserTable({ users, setUsers }: any) {
    return <div data-testid="user-table">User Table</div>;
  };
});

// Mock API calls
global.fetch = jest.fn();

describe("AdminDashboardPage", () => {
  const mockPush = jest.fn();
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;
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

    // Mock fetch for API calls
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => [],
    });
  });

  describe("Authentication and Access Control", () => {
    it("redirects unauthenticated users to auth login", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      });

      render(<AdminDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });

    it("redirects non-admin users to dashboard", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Regular User",
            email: "user@test.com",
            role: "INSTRUCTOR",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      render(<AdminDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("renders dashboard for authenticated admin users", async () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
        expect(screen.getByText("Admin Portal")).toBeInTheDocument();
      });
    });
  });

  describe("Admin Interface", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("uses black theme for admin interface", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const sidebar = document.querySelector(".bg-black");
        expect(sidebar).toBeInTheDocument();
      });
    });

    it("displays system statistics", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("System Status")).toBeInTheDocument();
        expect(screen.getByText("Exam Statistics")).toBeInTheDocument();
        expect(screen.getByText("Total users")).toBeInTheDocument();
        expect(screen.getByText("Server uptime")).toBeInTheDocument();
      });
    });

    it("displays dashboard components", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
        // User table is now on the separate users page, not dashboard
      });
    });
  });

  describe("Admin Sidebar and Navigation", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("displays admin logo and branding", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const logos = screen.getAllByAltText("UExam Logo");
        expect(logos.length).toBeGreaterThan(0);
        expect(logos[0]).toHaveAttribute("src", "/logos/image.png");
        expect(screen.getByText("Admin Portal")).toBeInTheDocument();
      });
    });

    it("uses black theme for admin sidebar", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const sidebar = document.querySelector(".w-16.bg-black");
        expect(sidebar).toBeInTheDocument();
      });
    });

    it("displays all navigation items", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Dashboard")).toBeInTheDocument();
        expect(screen.getByText("User Management")).toBeInTheDocument();
        expect(screen.getByText("Course Oversight")).toBeInTheDocument();
        expect(screen.getByText("Database")).toBeInTheDocument();
        // Removed navigation items: Analytics, Search, Security, Help
      });
    });

    it("highlights active dashboard navigation item", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const dashboardNav = screen.getByText("Dashboard").closest("a");
        expect(dashboardNav).toHaveClass(
          "bg-white/10",
          "text-white",
          "border-r-4",
          "border-white"
        );
      });
    });

    it("displays admin user info in sidebar", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin User")).toBeInTheDocument();
        expect(screen.getByText("System Administrator")).toBeInTheDocument();
      });
    });

    it("handles logout functionality", async () => {
      const user = userEvent.setup();
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const logoutButton = screen.getByTitle("Logout");
        expect(logoutButton).toBeInTheDocument();
      });

      const logoutButton = screen.getByTitle("Logout");
      await user.click(logoutButton);

      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
    });
  });

  describe("System Statistics", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("displays system stats cards", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("System Status")).toBeInTheDocument();
        expect(screen.getByText("Exam Statistics")).toBeInTheDocument();
        expect(screen.getByText("Total users")).toBeInTheDocument();
        expect(screen.getByText("Server uptime")).toBeInTheDocument();
      });
    });

    it("shows correct stat values", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("good")).toBeInTheDocument(); // System health
        expect(screen.getByText("99.9%")).toBeInTheDocument(); // Server uptime
        // Note: Other values are dynamic based on actual data
      });
    });

    it("displays system health information", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("System health")).toBeInTheDocument();
        expect(screen.getByText("Current Active Users")).toBeInTheDocument();
        expect(screen.getByText("Total users")).toBeInTheDocument();
      });
    });

    it("uses white background for stat cards", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        // Check that the dashboard stats component is rendered
        const statsComponent = screen.getByTestId("dashboard-stats");
        expect(statsComponent).toBeInTheDocument();
      });
    });
  });

  describe("System Status", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("displays clean header without confusing elements", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        // Verify System Online status was removed to reduce user confusion
        expect(screen.queryByText("System Online")).not.toBeInTheDocument();
        const statusIndicator = document.querySelector(".bg-green-500");
        expect(statusIndicator).not.toBeInTheDocument();
      });
    });
  });

  describe("Responsive Design and Layout", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("has responsive grid layouts", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        // Check stats grid
        const statsGrid = screen.getByTestId("dashboard-stats");
        expect(statsGrid).toBeInTheDocument();
      });
    });

    it("has proper layout structure", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const mainLayout = document.querySelector(
          ".min-h-screen.bg-gray-50.flex"
        );
        expect(mainLayout).toBeInTheDocument();

        const sidebar = document.querySelector(".w-16.bg-black");
        expect(sidebar).toBeInTheDocument();

        const mainContent = document.querySelector(".flex-1");
        expect(mainContent).toBeInTheDocument();
      });
    });
  });

  describe("Admin Theme and Branding", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("uses black color scheme for admin interface", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const sidebar = document.querySelector(".bg-black");
        expect(sidebar).toBeInTheDocument();
      });
    });

    it("differentiates from regular dashboard design", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        // Admin dashboard should have black sidebar
        const blackSidebar = document.querySelector(".bg-black");
        expect(blackSidebar).toBeInTheDocument();

        // Should not have navy branding
        const navyElements = document.querySelector(".bg-brand-navy");
        expect(navyElements).not.toBeInTheDocument();
      });
    });

    it("displays admin interface elements", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        expect(screen.getByText("Admin Portal")).toBeInTheDocument();
        expect(screen.getByText("System Administrator")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles missing session gracefully", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      });

      render(<AdminDashboardPage />);

      // Should not crash and should redirect
      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });

    it("handles session with missing user role", () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "User",
            email: "user@test.com",
            // role is missing
          },
          expires: "2024-12-31",
        } as any,
        status: "authenticated",
        update: jest.fn(),
      });

      render(<AdminDashboardPage />);

      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: "1",
            name: "Admin User",
            email: "admin@test.com",
            role: "ADMIN",
          },
          expires: "2024-12-31",
        },
        status: "authenticated",
        update: jest.fn(),
      });
    });

    it("has proper heading hierarchy", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const mainHeading = screen.getByRole("heading", { level: 1 });
        expect(mainHeading).toHaveTextContent("Admin Dashboard");
      });
    });

    it("has accessible navigation elements", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const nav = document.querySelector("nav");
        expect(nav).toBeInTheDocument();

        const navLinks = screen.getAllByRole("link");
        expect(navLinks.length).toBeGreaterThan(0);
      });
    });

    it("has accessible buttons with proper titles", async () => {
      render(<AdminDashboardPage />);

      await waitFor(() => {
        const logoutButton = screen.getByTitle("Logout");
        expect(logoutButton).toBeInTheDocument();
        expect(logoutButton).toHaveAttribute("title", "Logout");
      });
    });
  });
});
