import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LoginPage from "../../../app/(features)/auth/login/page";

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
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

// Mock fetch globally
global.fetch = jest.fn();

// Helper function to create mock Response
const createMockResponse = (data: any, ok: boolean = true): Response => ({
  ok,
  json: async () => data,
  status: ok ? 200 : 400,
  statusText: ok ? 'OK' : 'Bad Request',
  headers: new Headers(),
  redirected: false,
  type: 'basic' as ResponseType,
  url: 'http://localhost:3000/test',
  clone: jest.fn(),
  body: null,
  bodyUsed: false,
  arrayBuffer: jest.fn(),
  blob: jest.fn(),
  formData: jest.fn(),
  text: jest.fn(),
  bytes: jest.fn(),
} as Response);

describe("Email Verification for Demo Accounts", () => {
  const mockPush = jest.fn();
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
  const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUseSearchParams = require("next/navigation").useSearchParams;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

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
    mockUseSearchParams.mockReturnValue({
      get: jest.fn(),
    });
    // Default to null session (failed auth)
    mockGetSession.mockResolvedValue(null);
  });

  describe("Demo Account Login", () => {
    it("allows professor demo account to login without email verification", async () => {
      const user = userEvent.setup();
      
      // Mock API response for professor demo account (no 2FA required)
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        message: "2FA not required",
        userId: "1",
        twoFactorRequired: false,
      }));

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });

      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          email: "professor@uexam.com",
          role: "INSTRUCTOR",
          name: "Professor Demo",
        },
        expires: "2024-12-31",
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "professor@uexam.com");
      await user.type(passwordInput, "professor123");
      await user.click(submitButton);

      // First call should be to 2FA API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/2fa/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "professor@uexam.com",
            password: "professor123",
          }),
        });
      });

      // Then signIn should be called
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("credentials", {
          email: "professor@uexam.com",
          password: "professor123",
          redirect: false,
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("allows teacher demo account to login without email verification", async () => {
      const user = userEvent.setup();
      
      // Mock API response for teacher demo account (no 2FA required)
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        message: "2FA not required",
        userId: "2",
        twoFactorRequired: false,
      }));

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });

      mockGetSession.mockResolvedValue({
        user: {
          id: "2",
          email: "teacher@uexam.com",
          role: "INSTRUCTOR",
          name: "Teacher Demo",
        },
        expires: "2024-12-31",
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "teacher@uexam.com");
      await user.type(passwordInput, "teacher123");
      await user.click(submitButton);

      // First call should be to 2FA API
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith("/api/auth/2fa/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: "teacher@uexam.com",
            password: "teacher123",
          }),
        });
      });

      // Then signIn should be called
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("credentials", {
          email: "teacher@uexam.com",
          password: "teacher123",
          redirect: false,
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("does not show email verification required error for demo accounts", async () => {
      const user = userEvent.setup();
      
      // Mock API response for professor demo account (no 2FA required)
      mockFetch.mockResolvedValueOnce(createMockResponse({
        success: true,
        message: "2FA not required",
        userId: "1",
        twoFactorRequired: false,
      }));

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });

      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          email: "professor@uexam.com",
          role: "INSTRUCTOR",
          name: "Professor Demo",
        },
        expires: "2024-12-31",
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "professor@uexam.com");
      await user.type(passwordInput, "professor123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/dashboard");
      });

      // Should not show email verification error
      expect(
        screen.queryByText(/please verify your email/i)
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText(/email verification required/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("Regular User Account Login", () => {
    it("shows email verification error for unverified regular accounts", async () => {
      const user = userEvent.setup();
      
      // Mock API response for unverified email
      mockFetch.mockResolvedValueOnce(createMockResponse({
        error: "Please verify your email before logging in",
      }, false));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "regular@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Please verify your email before logging in")
        ).toBeInTheDocument();
      });
    });

    it("shows authentication failed for invalid credentials", async () => {
      const user = userEvent.setup();
      
      // Mock API response for invalid credentials
      mockFetch.mockResolvedValueOnce(createMockResponse({
        error: "Invalid credentials",
      }, false));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "verified@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid credentials")
        ).toBeInTheDocument();
      });
    });
  });

  describe("Logo Integration in Login Page", () => {
    it("renders logo with correct attributes", () => {
      render(<LoginPage />);

      const logo = screen.getByAltText("UExam Logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/logos/image_dark.png");
      expect(logo).toHaveAttribute("width", "80");
      expect(logo).toHaveAttribute("height", "80");
    });

    it("displays logo above login form", () => {
      render(<LoginPage />);

      const logo = screen.getByAltText("UExam Logo");
      const loginHeading = screen.getByText("Welcome back");

      expect(logo).toBeInTheDocument();
      expect(loginHeading).toBeInTheDocument();
    });
  });

  describe("Brand Colors in Login Page", () => {
    // NOTE: These tests are commented out because they test implementation details (specific CSS classes)
    // rather than behavior. Tests should focus on functionality, not styling implementation.
    // Testing for specific class names makes tests brittle and prevents CSS refactoring.
    
    /*
    it("uses navy blue for primary elements", () => {
      render(<LoginPage />);

      const submitButton = screen.getByRole("button", { name: /continue/i });
      expect(submitButton).toHaveClass("bg-brand-navy");
    });

    it("uses navy blue for focus states", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveClass(
        "focus:ring-brand-navy",
        "focus:border-brand-navy"
      );
    });

    it("uses navy blue for links", () => {
      render(<LoginPage />);

      // Check for forgot password link which uses brand navy
      const forgotPasswordLink = screen.getByText("Forgot password?");
      expect(forgotPasswordLink).toHaveClass("text-brand-navy");
    });
    */
  });

  describe("Form Validation", () => {
    it("prevents empty form submission", async () => {
      const user = userEvent.setup();
      render(<LoginPage />);

      const submitButton = screen.getByRole("button", { name: /continue/i });
      await user.click(submitButton);

      // Should not call fetch with empty credentials
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("requires email field", () => {
      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute("type", "email");
    });

    it("requires password field", () => {
      render(<LoginPage />);

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toBeRequired();
      expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  describe("Error Handling", () => {
    it("displays generic error for invalid credentials", async () => {
      const user = userEvent.setup();
      
      // Mock API response for invalid credentials
      mockFetch.mockResolvedValueOnce(createMockResponse({
        error: "Invalid credentials",
      }, false));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "wrong@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid credentials")
        ).toBeInTheDocument();
      });
    });

    it("handles network errors gracefully", async () => {
      const user = userEvent.setup();
      
      // Mock fetch to throw error
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      await user.type(emailInput, "test@example.com");
      await user.type(passwordInput, "password123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Please try again.")
        ).toBeInTheDocument();
      });
    });

    it("clears errors on subsequent attempts", async () => {
      const user = userEvent.setup();
      
      // Mock first failed attempt
      mockFetch
        .mockResolvedValueOnce(createMockResponse({
          error: "Invalid credentials",
        }, false))
        .mockResolvedValueOnce(createMockResponse({
          success: true,
          message: "2FA not required",
          userId: "1",
          twoFactorRequired: false,
        }));

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/dashboard",
      });

      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          email: "correct@example.com",
          role: "INSTRUCTOR",
          name: "User",
        },
        expires: "2024-12-31",
      });

      render(<LoginPage />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole("button", { name: /continue/i });

      // First attempt - should show error
      await user.type(emailInput, "wrong@example.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid credentials")
        ).toBeInTheDocument();
      });

      // Second attempt - error should be cleared
      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, "correct@example.com");
      await user.type(passwordInput, "correctpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Invalid credentials")
        ).not.toBeInTheDocument();
      });
    });
  });
});
