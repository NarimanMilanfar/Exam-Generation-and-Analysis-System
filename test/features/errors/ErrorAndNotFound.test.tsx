import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import NotFound from "@/app/not-found";
import GlobalError from "@/app/error";
import "@testing-library/jest-dom";

// Mock next/navigation
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

// Mock Image component from next/image to avoid rendering issues in tests
jest.mock("next/image", () => (props: any) => {
  return <img {...props} alt={props.alt || "mocked image"} />;
});

describe("404 - NotFound Page", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    // Simulate user has browser history
    Object.defineProperty(window, "history", {
      value: { length: 2 },
      writable: true,
    });
  });

  it("renders NotFound content correctly", () => {
    render(<NotFound />);
    expect(screen.getByText("404 - Page Not Found")).toBeInTheDocument();
    expect(
      screen.getByText(/the page you're looking for doesn't exist/i)
    ).toBeInTheDocument();
  });

  it("clicks Go Back and triggers router.back()", () => {
    render(<NotFound />);
    fireEvent.click(screen.getByRole("button", { name: /Go Back/i }));
    expect(mockBack).toHaveBeenCalled();
  });

  it("clicks Go to Dashboard and triggers router.push('/dashboard')", () => {
    render(<NotFound />);
    fireEvent.click(screen.getByRole("button", { name: /Go to Dashboard/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});

describe("500 - GlobalError Page", () => {
  const mockReset = jest.fn();
  const error = new Error("Test error");

  beforeEach(() => {
    mockBack.mockClear();
    mockPush.mockClear();
    mockReset.mockClear();
    Object.defineProperty(window, "history", {
      value: { length: 2 },
      writable: true,
    });
  });

  it("renders GlobalError content correctly", () => {
    render(<GlobalError error={error} reset={mockReset} />);
    expect(screen.getByText("500 - Internal Server Error")).toBeInTheDocument();
    expect(
      screen.getByText(/something went wrong on our end/i)
    ).toBeInTheDocument();
  });

  it("clicks Try Again and triggers reset()", () => {
    render(<GlobalError error={error} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }));
    expect(mockReset).toHaveBeenCalled();
  });

  it("clicks Go Back and triggers router.back()", () => {
    render(<GlobalError error={error} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /Go Back/i }));
    expect(mockBack).toHaveBeenCalled();
  });

  it("clicks Go to Dashboard and triggers router.push('/dashboard')", () => {
    render(<GlobalError error={error} reset={mockReset} />);
    fireEvent.click(screen.getByRole("button", { name: /Go to Dashboard/i }));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
