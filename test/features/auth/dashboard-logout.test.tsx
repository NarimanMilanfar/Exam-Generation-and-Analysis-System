import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "@/app/(features)/dashboard/page";
import { signOut, useSession } from "next-auth/react";

// 1. mock useRouter and usePathname
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard",
}));

// 2. mock next-auth/react
jest.mock("next-auth/react");

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
  const MockSidebar = () => {
    return React.createElement("div", { "data-testid": "sidebar" }, [
      React.createElement(
        "button",
        { key: "logout", role: "button", "aria-label": "logout" },
        "Logout"
      ),
    ]);
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

// Test wrapper with SidebarProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const { SidebarProvider } = require("../../../app/components/Sidebar");
  return <SidebarProvider>{children}</SidebarProvider>;
};

describe("Logout behavior on DashboardPage", () => {
  const mockSignOut = signOut as jest.Mock;
  const mockUseSession = useSession as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("logs out and redirects to login when session becomes unauthenticated", async () => {
    const user = userEvent.setup();

    // initial state: authenticated
    let sessionState: {
      data: { user: { name: string; email: string; role: string } } | null;
      status: "authenticated" | "unauthenticated" | "loading";
    } = {
      data: {
        user: {
          name: "Test User",
          email: "test@example.com",
          role: "INSTRUCTOR",
        },
      },
      status: "authenticated",
    };

    mockUseSession.mockImplementation(() => sessionState);

    // Mock fetch for courses API
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    });

    const { rerender } = render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for dashboard to load completely
    await waitFor(() => {
      expect(
        screen.getByText("Manage your courses and exams")
      ).toBeInTheDocument();
    });

    mockSignOut.mockImplementation(() => {
      sessionState = { data: null, status: "unauthenticated" };
      return Promise.resolve();
    });

    // Find and click the logout button
    const logoutButton = await screen.findByRole("button", { name: /logout/i });
    await user.click(logoutButton);

    // Simulate session becoming unauthenticated
    await act(async () => {
      sessionState = { data: null, status: "unauthenticated" };
      mockUseSession.mockImplementation(() => sessionState);

      rerender(
        <TestWrapper>
          <DashboardPage />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/auth/login");
    });
  });
});
