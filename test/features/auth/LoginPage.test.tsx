import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import { signIn, getSession } from "next-auth/react";
import LoginPage from "../../../app/(features)/auth/login/page";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
}));

// Mock fetch for 2FA API calls
global.fetch = jest.fn();

// Mock Next.js Link component
jest.mock("next/link", () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe("LoginPage", () => {
  const mockPush = jest.fn();
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
  const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock useRouter to return our mock push function
    const mockUseRouter = require("next/navigation").useRouter;
    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    // Mock fetch for 2FA API calls
    const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
    mockFetch.mockClear();
  });

  describe("Component Rendering", () => {
    it("renders login form with all required elements", () => {
      render(<LoginPage />);

      // Check page title
      expect(screen.getByText("Welcome back")).toBeInTheDocument();
      expect(
        screen.getByText("Sign in to your UExam account")
      ).toBeInTheDocument();

      // Check form fields
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

      // Check submit button
      expect(
        screen.getByRole("button", { name: /continue/i })
      ).toBeInTheDocument();

      // Check forgot password link
      expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    });

    it("has proper form accessibility attributes", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(emailInput).toHaveAttribute("required");
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(passwordInput).toHaveAttribute("required");
    });
  });

  describe("Form Interactions", () => {
    it("updates form fields when user types", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      await act(async () => {
        await user.type(emailInput, "professor@uexam.com");
      });

      await act(async () => {
        await user.type(passwordInput, "professor123");
      });

      expect(emailInput).toHaveValue("professor@uexam.com");
      expect(passwordInput).toHaveValue("professor123");
    });

    it("shows loading state when form is submitted", async () => {
      const user = userEvent.setup();

      // Mock 2FA API response (no 2FA required)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          userId: "user-123",
          twoFactorRequired: false,
        }),
      } as Response);

      mockSignIn.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await act(async () => {
        await user.type(emailInput, "professor@uexam.com");
      });

      await act(async () => {
        await user.type(passwordInput, "professor123");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Signing in...")).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe("Authentication Flow", () => {
    it("calls signIn with correct credentials on form submission", async () => {
      const user = userEvent.setup();

      // Mock 2FA API response (no 2FA required)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          userId: "user-123",
          twoFactorRequired: false,
        }),
      } as Response);

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });
      mockGetSession.mockResolvedValue(null);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await act(async () => {
        await user.type(emailInput, "professor@uexam.com");
      });

      await act(async () => {
        await user.type(passwordInput, "professor123");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("credentials", {
          email: "professor@uexam.com",
          password: "professor123",
          redirect: false,
        });
      });
    });

    it("redirects to dashboard on successful login", async () => {
      const user = userEvent.setup();

      // Mock 2FA API response (no 2FA required)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          userId: "user-123",
          twoFactorRequired: false,
        }),
      } as Response);

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });
      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          name: "Professor",
          email: "professor@uexam.com",
          role: "INSTRUCTOR",
        },
        expires: "2024-12-31",
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await act(async () => {
        await user.type(emailInput, "professor@uexam.com");
      });

      await act(async () => {
        await user.type(passwordInput, "professor123");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("shows error message on failed login", async () => {
      const user = userEvent.setup();

      // Mock 2FA API response (authentication failed)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "Invalid email or password",
        }),
      } as Response);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await act(async () => {
        await user.type(emailInput, "wrong@example.com");
      });

      await act(async () => {
        await user.type(passwordInput, "wrongpassword");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Invalid email or password")
        ).toBeInTheDocument();
      });
    });

    it("handles network errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock fetch to reject (network error)
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await act(async () => {
        await user.type(emailInput, "professor@uexam.com");
      });

      await act(async () => {
        await user.type(passwordInput, "professor123");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Please try again.")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("clears error message when form is resubmitted", async () => {
      const user = userEvent.setup();

      // Mock 2FA API responses
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: "Invalid email or password",
          }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            userId: "user-123",
            twoFactorRequired: false,
          }),
        } as Response);

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });
      mockGetSession.mockResolvedValue(null);

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      // First submission - should show error
      await act(async () => {
        await user.type(emailInput, "wrong@example.com");
      });

      await act(async () => {
        await user.type(passwordInput, "wrongpassword");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Invalid email or password")
        ).toBeInTheDocument();
      });

      // Second submission - error should be cleared
      await act(async () => {
        await user.clear(emailInput);
      });

      await act(async () => {
        await user.clear(passwordInput);
      });

      await act(async () => {
        await user.type(emailInput, "correct@example.com");
      });

      await act(async () => {
        await user.type(passwordInput, "correctpassword");
      });

      await act(async () => {
        await user.click(submitButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByText("Invalid email or password")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    it("requires email and password fields", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toBeRequired();
      expect(passwordInput).toBeRequired();
    });

    it("prevents form submission when fields are empty", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole("button", { name: /continue/i });

      await act(async () => {
        await user.click(submitButton);
      });

      // signIn should not be called if form validation prevents submission
      expect(mockSignIn).not.toHaveBeenCalled();
    });
  });
});
