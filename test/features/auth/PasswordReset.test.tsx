// tests/password-reset.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import toast from "react-hot-toast";
import ResetPasswordPage from "@/app/(features)/auth/password-reset/[token]/page";
import PasswordResetPage from "@/app/(features)/auth/password-reset/page";
import "@testing-library/jest-dom";

// Mock toast
jest.mock("react-hot-toast");

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

describe("Password reset request page test", () => {
  const mockUseRouter = require("next/navigation").useRouter;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock useRouter
    mockUseRouter.mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  test("1. Render the password reset form", () => {
    render(<PasswordResetPage />);
    expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Send Reset Email/i })
    ).toBeInTheDocument();
  });

  test("2. Handle the error of non-existent email address (404)", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 404,
      ok: false,
      json: jest.fn().mockResolvedValue({}),
    });

    render(<PasswordResetPage />);
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "nonexist@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Email/i }));

    await waitFor(() => {
      expect(screen.getByText("Email not found.")).toBeInTheDocument();
    });
  });

  test("3. Valid email successfully sent reset email", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    render(<PasswordResetPage />);
    fireEvent.change(screen.getByLabelText("Email Address"), {
      target: { value: "valid@test.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Reset Email/i }));

    await waitFor(() => {
      expect(screen.getByText(/Please wait/i)).toBeInTheDocument();
    });
  });
});

describe("Password reset confirmation page test", () => {
  const mockPush = jest.fn();
  const mockUseRouter = require("next/navigation").useRouter;
  const mockUseParams = require("next/navigation").useParams;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock both useParams and useRouter for ResetPasswordPage
    mockUseParams.mockReturnValue({ token: "valid-token" });
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    });
  });

  test("1. Render the password reset confirmation form", () => {
    render(<ResetPasswordPage />);
    expect(screen.getByText("Reset Your Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Confirm New Password")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Submit New Password/i })
    ).toBeInTheDocument();
  });

  test("2. Handling the error of incorrect password entry", async () => {
    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
      target: { value: "different123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Submit New Password/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
    });
  });

  test("3. Successfully reset password", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Submit New Password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Password reset successful! Redirecting to login...")
      ).toBeInTheDocument();
    });
  });

  test("4. Error in handling expired tokens", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Token expired" }),
    });

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
      target: { value: "newPassword123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Submit New Password/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Token expired")).toBeInTheDocument();
    });
  });

  test("5. Handle invalid password format", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 422,
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Password too short" }),
    });

    render(<ResetPasswordPage />);
    fireEvent.change(screen.getByPlaceholderText("New Password"), {
      target: { value: "short" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirm New Password"), {
      target: { value: "short" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Submit New Password/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Password must be at least 6 characters long")
      ).toBeInTheDocument();
    });
  });
});
