import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminLoginPage from "../../../app/(features)/admin/login/page";

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

// Mock Lucide React icons
jest.mock("lucide-react", () => ({
  Eye: ({ className }: any) => (
    <div className={className} data-testid="eye-icon" />
  ),
  EyeOff: ({ className }: any) => (
    <div className={className} data-testid="eye-off-icon" />
  ),
  ArrowLeft: ({ className }: any) => (
    <div className={className} data-testid="arrow-left-icon" />
  ),
}));

describe("AdminLoginPage", () => {
  const mockPush = jest.fn();
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
  const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
  const mockUseSearchParams = useSearchParams as jest.MockedFunction<
    typeof useSearchParams
  >;

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
      get: jest.fn().mockReturnValue(null),
    } as any);
  });

  describe("Page Structure and Branding", () => {
    it("renders admin login page with dark theme", () => {
      render(<AdminLoginPage />);

      // Check for admin-specific branding
      expect(screen.getByText("Administrator Portal")).toBeInTheDocument();
      expect(
        screen.getByText("Restricted access for system administrators only")
      ).toBeInTheDocument();

      // Check for logo
      const logo = screen.getByAltText("UExam Logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/logos/image.png");
      expect(logo).toHaveAttribute("width", "80");
      expect(logo).toHaveAttribute("height", "80");
    });

    it("displays admin warning banner", () => {
      render(<AdminLoginPage />);

      expect(screen.getByText("Admin Access Required")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Only authorized administrators can access this portal"
        )
      ).toBeInTheDocument();
    });

    it("has back to home navigation", () => {
      render(<AdminLoginPage />);

      const backLink = screen.getByRole("link", { name: /back to home/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute("href", "/");
    });

    it("has link to regular login", () => {
      render(<AdminLoginPage />);

      const regularLoginLink = screen.getByRole("link", {
        name: /not an admin\? use regular login/i,
      });
      expect(regularLoginLink).toBeInTheDocument();
      expect(regularLoginLink).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("Form Elements and Interactions", () => {
    it("renders form fields with admin-specific labels", () => {
      render(<AdminLoginPage />);

      // Check form fields
      expect(screen.getByLabelText("Administrator Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();

      // Check placeholders
      expect(
        screen.getByPlaceholderText("Enter your email")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your password")
      ).toBeInTheDocument();

      // Check submit button
      expect(
        screen.getByRole("button", { name: "Access Admin Portal" })
      ).toBeInTheDocument();
    });

    it("toggles password visibility", async () => {
      const user = userEvent.setup();
      render(<AdminLoginPage />);

      const passwordInput = screen.getByLabelText("Password");
      const toggleButton = screen.getByTestId("eye-icon").parentElement;

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();

      // Click to show password
      await user.click(toggleButton!);
      expect(passwordInput).toHaveAttribute("type", "text");
      expect(screen.getByTestId("eye-off-icon")).toBeInTheDocument();

      // Click to hide password again
      await user.click(toggleButton!);
      expect(passwordInput).toHaveAttribute("type", "password");
      expect(screen.getByTestId("eye-icon")).toBeInTheDocument();
    });

    it("handles form input changes", async () => {
      const user = userEvent.setup();
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");

      expect(emailInput).toHaveValue("admin@uexam.com");
      expect(passwordInput).toHaveValue("admin123");
    });
  });

  describe("Authentication Flow", () => {
    it("successfully authenticates admin user", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/admin/dashboard",
      });
      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          name: "Admin User",
          email: "admin@uexam.com",
          role: "ADMIN",
        },
        expires: "2024-12-31",
      });

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith("credentials", {
          email: "admin@uexam.com",
          password: "admin123",
          redirect: false,
        });
        expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
      });
    });

    it("rejects non-admin users", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/admin/dashboard",
      });
      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          name: "Regular User",
          email: "user@uexam.com",
          role: "INSTRUCTOR",
        },
        expires: "2024-12-31",
      });

      // Mock fetch for signout
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "user@uexam.com");
      await user.type(passwordInput, "user123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Access denied. Admin privileges required.")
        ).toBeInTheDocument();
        expect(global.fetch).toHaveBeenCalledWith("/api/auth/signout", {
          method: "POST",
        });
      });
    });

    it("handles invalid credentials", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: "CredentialsSignin",
        status: 401,
        ok: false,
        url: null,
      });

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "wrong@email.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid credentials or access denied")
        ).toBeInTheDocument();
      });
    });

    it("handles authentication failure", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/admin/dashboard",
      });
      mockGetSession.mockResolvedValue(null);

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText("Authentication failed")).toBeInTheDocument();
      });
    });

    it("shows loading state during authentication", async () => {
      const user = userEvent.setup();
      mockSignIn.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      expect(screen.getByText("Authenticating...")).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });
  });

  describe("Dark Theme and Styling", () => {
    it("uses dark gradient background", () => {
      render(<AdminLoginPage />);

      const container = document.querySelector(".bg-gradient-to-br");
      expect(container).toBeInTheDocument();
      expect(container).toHaveClass(
        "from-gray-900",
        "via-black",
        "to-gray-800"
      );
    });

    it("uses dark theme form elements", () => {
      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");

      expect(emailInput).toHaveClass(
        "bg-gray-800/50",
        "text-white",
        "border-gray-600"
      );
      expect(passwordInput).toHaveClass(
        "bg-gray-800/50",
        "text-white",
        "border-gray-600"
      );
    });

    it("uses white submit button with black text", () => {
      render(<AdminLoginPage />);

      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });
      expect(submitButton).toHaveClass(
        "bg-white",
        "text-black",
        "hover:bg-gray-100"
      );
    });
  });

  describe("Callback URL Handling", () => {
    it("uses custom callback URL from search params", async () => {
      const user = userEvent.setup();
      mockUseSearchParams.mockReturnValue({
        get: jest.fn().mockReturnValue("/admin/users"),
      } as any);

      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/admin/users",
      });
      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          name: "Admin User",
          email: "admin@uexam.com",
          role: "ADMIN",
        },
        expires: "2024-12-31",
      });

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/users");
      });
    });

    it("defaults to admin dashboard when no callback URL", async () => {
      const user = userEvent.setup();
      mockSignIn.mockResolvedValue({
        error: null,
        status: 200,
        ok: true,
        url: "http://localhost:3000/admin/dashboard",
      });
      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          name: "Admin User",
          email: "admin@uexam.com",
          role: "ADMIN",
        },
        expires: "2024-12-31",
      });

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
      });
    });
  });

  describe("Error Handling", () => {
    it("handles network errors gracefully", async () => {
      const user = userEvent.setup();
      mockSignIn.mockRejectedValue(new Error("Network error"));

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("An error occurred during login")
        ).toBeInTheDocument();
      });
    });

    it("clears error when form is resubmitted", async () => {
      const user = userEvent.setup();
      mockSignIn
        .mockResolvedValueOnce({
          error: "CredentialsSignin",
          status: 401,
          ok: false,
          url: null,
        })
        .mockResolvedValueOnce({
          error: null,
          status: 200,
          ok: true,
          url: "http://localhost:3000/admin/dashboard",
        });

      mockGetSession.mockResolvedValue({
        user: {
          id: "1",
          name: "Admin User",
          email: "admin@uexam.com",
          role: "ADMIN",
        },
        expires: "2024-12-31",
      });

      render(<AdminLoginPage />);

      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");
      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });

      // First attempt - should show error
      await user.type(emailInput, "wrong@email.com");
      await user.type(passwordInput, "wrongpassword");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Invalid credentials or access denied")
        ).toBeInTheDocument();
      });

      // Clear and retry - error should be cleared
      await user.clear(emailInput);
      await user.clear(passwordInput);
      await user.type(emailInput, "admin@uexam.com");
      await user.type(passwordInput, "admin123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Invalid credentials or access denied")
        ).not.toBeInTheDocument();
        expect(mockPush).toHaveBeenCalledWith("/admin/dashboard");
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper form labels and structure", () => {
      render(<AdminLoginPage />);

      // Check form structure
      const form = document.querySelector("form");
      expect(form).toBeInTheDocument();

      // Check labels are properly associated
      const emailInput = screen.getByLabelText("Administrator Email");
      const passwordInput = screen.getByLabelText("Password");

      expect(emailInput).toHaveAttribute("id", "email");
      expect(passwordInput).toHaveAttribute("id", "password");
    });

    it("has proper heading hierarchy", () => {
      render(<AdminLoginPage />);

      const mainHeading = screen.getByRole("heading", { level: 2 });
      expect(mainHeading).toHaveTextContent("Administrator Portal");
    });

    it("has accessible button states", () => {
      render(<AdminLoginPage />);

      const submitButton = screen.getByRole("button", {
        name: "Access Admin Portal",
      });
      expect(submitButton).toHaveAttribute("type", "submit");
      expect(submitButton).not.toBeDisabled();
    });
  });
});
