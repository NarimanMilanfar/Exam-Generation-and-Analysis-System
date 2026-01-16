import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act } from "react";
import TutorialModal from "../../../app/components/onboarding/TutorialModal";

// Mock Next.js Image component
jest.mock("next/image", () => {
  return ({ src, alt, width, height, className }: any) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  );
});

describe("TutorialModal", () => {
  const mockOnClose = jest.fn();

  const sampleTutorial = {
    pageTitle: "Test Tutorial",
    description: "This is a test tutorial",
    steps: [
      {
        id: "step-1",
        title: "Step 1: First Step",
        description: "This is the first step description",
        content: <div>First step content</div>,
        icon: "🎯",
      },
      {
        id: "step-2",
        title: "Step 2: Second Step", 
        description: "This is the second step description",
        content: <div>Second step content</div>,
        icon: "📝",
      },
      {
        id: "step-3",
        title: "Step 3: Final Step",
        description: "This is the final step description",
        content: <div>Final step content</div>,
        icon: "✅",
      },
    ],
  };

  const defaultProps = {
    isOpen: true,
    tutorial: sampleTutorial,
    pageName: "test-page",
    onClose: mockOnClose,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render tutorial when open", () => {
    render(<TutorialModal {...defaultProps} />);
    
    expect(screen.getByText("Test Tutorial")).toBeInTheDocument();
    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("Step 1: First Step")).toBeInTheDocument();
    expect(screen.getByText("First step content")).toBeInTheDocument();
  });

  it("should navigate through tutorial steps", async () => {
    const user = userEvent.setup();
    render(<TutorialModal {...defaultProps} />);

    // Start at step 1
    expect(screen.getByText("Step 1: First Step")).toBeInTheDocument();
    expect(screen.getByText("First step content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();

    // Navigate to step 2 using "Continue" button
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });
    
    // Wait for animation to complete and step 2 to be visible
    await waitFor(() => {
      expect(screen.getByText("Step 2: Second Step")).toBeInTheDocument();
    });
    expect(screen.getByText("Second step content")).toBeInTheDocument();

    // Navigate to final step
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });
    
    // Wait for animation to complete and final step to be visible
    await waitFor(() => {
      expect(screen.getByText("Step 3: Final Step")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /complete tutorial/i })).toBeInTheDocument();
  });

  it("should handle close actions", async () => {
    const user = userEvent.setup();
    render(<TutorialModal {...defaultProps} />);

    // Navigate to final step
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });
    
    // Wait for step 2 to be ready
    await waitFor(() => {
      expect(screen.getByText("Step 2: Second Step")).toBeInTheDocument();
    });
    
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    });
    
    // Wait for final step to be ready and button to be available
    await waitFor(() => {
      expect(screen.getByText("Step 3: Final Step")).toBeInTheDocument();
    });
    
    // Test finish button (actual text is "Complete Tutorial")
    await act(async () => {
      await user.click(screen.getByRole("button", { name: /complete tutorial/i }));
    });
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should handle special cases", () => {
    // Test with no tutorial
    render(<TutorialModal {...defaultProps} tutorial={null} />);
    expect(screen.queryByText("Test Tutorial")).not.toBeInTheDocument();

    // Test with single step
    const singleStepTutorial = {
      pageTitle: "Single Step",
      description: "Only one step",
      steps: [
        {
          id: "only-step",
          title: "Only Step",
          description: "This is the only step",
          content: <div>Single step content</div>,
          icon: "1️⃣",
        },
      ],
    };
    
    render(<TutorialModal {...defaultProps} tutorial={singleStepTutorial} />);
    expect(screen.getByText("Single Step")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /complete tutorial/i })).toBeInTheDocument();
  });
}); 