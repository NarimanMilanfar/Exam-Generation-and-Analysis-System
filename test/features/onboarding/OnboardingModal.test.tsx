import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import OnboardingModal from "../../../app/components/onboarding/OnboardingModal";

// Mock Next.js components
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("next/image", () => {
  return ({ src, alt, width, height, className }: any) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  );
});

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

describe("OnboardingModal", () => {
  const mockOnComplete = jest.fn();
  const mockOnSkip = jest.fn();

  const defaultProps = {
    isOpen: true,
    onComplete: mockOnComplete,
    onSkip: mockOnSkip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render modal when open and hide when closed", () => {
    const { rerender } = render(<OnboardingModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();

    rerender(<OnboardingModal {...defaultProps} isOpen={true} />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Welcome to UExam! 🎉")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
  });

  it("should navigate through steps correctly", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal {...defaultProps} />);

    // Start at step 1
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

    // Navigate to step 2
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });
    expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();
    expect(screen.getByText("Step 1: Create Your First Course")).toBeInTheDocument();

    // Navigate back to step 1
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /previous/i }));
    });
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();

    // Navigate to last step
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /continue/i }));
      });
    }
    expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
  });

  it("should handle skip functionality", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal {...defaultProps} />);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /skip tutorial/i }));
    });
    
    await waitFor(() => {
      expect(mockOnSkip).toHaveBeenCalledTimes(1);
    });
  });

  it("should handle complete functionality", async () => {
    const user = userEvent.setup();
    render(<OnboardingModal {...defaultProps} />);
    
    // Navigate to last step
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /continue/i }));
      });
    }

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /get started/i }));
    });
    
    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });
  });

  it("should show loading states during async operations", async () => {
    const user = userEvent.setup();
    const slowOnComplete = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<OnboardingModal {...defaultProps} onComplete={slowOnComplete} />);

    // Navigate to last step
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await user.click(screen.getByRole("button", { name: /continue/i }));
      });
    }

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /get started/i }));
    });
    
    expect(screen.getByRole("button", { name: /completing/i })).toBeInTheDocument();
  });
}); 