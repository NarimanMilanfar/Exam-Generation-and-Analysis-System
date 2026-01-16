import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import LoginPage from "../../../app/(features)/auth/login/page";

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
}));

// Mock fetch globally
global.fetch = jest.fn();

describe("LoginPage - Error Handling", () => {
  const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows generic error for invalid login attempt", async () => {
    // Mock fetch to return error response
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Invalid credentials",
      }),
    } as Response);

    render(<LoginPage />);
    const user = userEvent.setup();

    await act(async () => {
      await user.type(screen.getByLabelText(/email/i), "fake@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });

    const errorMessage = await screen.findByText("Invalid credentials");
    expect(errorMessage).toBeInTheDocument();
  });

  it("shows generic error for account without password", async () => {
    // Mock fetch to return error response
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Invalid credentials",
      }),
    } as Response);

    render(<LoginPage />);
    const user = userEvent.setup();

    await act(async () => {
      await user.type(
        screen.getByLabelText(/email/i),
        "no-password@example.com"
      );
      await user.type(screen.getByLabelText(/password/i), "somepassword");
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });

    const errorMessage = await screen.findByText("Invalid credentials");
    expect(errorMessage).toBeInTheDocument();
  });

  it("shows generic error for incorrect password", async () => {
    // Mock fetch to return error response
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Invalid credentials",
      }),
    } as Response);

    render(<LoginPage />);
    const user = userEvent.setup();

    await act(async () => {
      await user.type(screen.getByLabelText(/email/i), "user@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });

    const errorMessage = await screen.findByText("Invalid credentials");
    expect(errorMessage).toBeInTheDocument();
  });

  it("shows email verification error", async () => {
    // Mock fetch to return email verification error
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: "Please verify your email before logging in",
      }),
    } as Response);

    render(<LoginPage />);
    const user = userEvent.setup();

    await act(async () => {
      await user.type(screen.getByLabelText(/email/i), "unverified@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });

    const errorMessage = await screen.findByText("Please verify your email before logging in");
    expect(errorMessage).toBeInTheDocument();
  });

  it("shows network error", async () => {
    // Mock fetch to throw error (network error)
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(<LoginPage />);
    const user = userEvent.setup();

    await act(async () => {
      await user.type(screen.getByLabelText(/email/i), "user@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });

    const errorMessage = await screen.findByText("Something went wrong. Please try again.");
    expect(errorMessage).toBeInTheDocument();
  });
});
