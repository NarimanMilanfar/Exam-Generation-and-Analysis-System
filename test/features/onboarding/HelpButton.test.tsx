import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock usePageTutorial hook first
const mockStartTutorial = jest.fn();
jest.mock("../../../app/hooks/usePageTutorial", () => ({
  usePageTutorial: () => ({
    startTutorial: mockStartTutorial,
    currentPageTutorial: {
      pageTitle: "Test Tutorial",
      description: "Test description",
      steps: [],
    },
    showTutorial: false,
    closeTutorial: jest.fn(),
    pageName: "test-page",
  }),
}));

// Mock Next.js Image component
jest.mock("next/image", () => {
  return ({ src, alt, width, height, className }: any) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  );
});

// Import component after mocks
import HelpButton from "../../../app/components/shared/HelpButton";

describe("HelpButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render help button correctly", () => {
    render(<HelpButton />);
    
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("title", "Get help with test-page");
    
    // Check for SVG icon instead of image
    const helpIcon = button.querySelector("svg");
    expect(helpIcon).toBeInTheDocument();
    expect(helpIcon).toHaveAttribute("viewBox", "0 0 24 24");
  });

  it("should handle click interactions", async () => {
    const user = userEvent.setup();
    render(<HelpButton />);
    
    const button = screen.getByRole("button");
    await user.click(button);
    
    expect(mockStartTutorial).toHaveBeenCalledTimes(1);
  });

  it("should support different sizes", () => {
    const { rerender } = render(<HelpButton size="sm" />);
    
    let button = screen.getByRole("button");
    expect(button).toHaveClass("w-8", "h-8"); // sm size is w-8 h-8

    rerender(<HelpButton size="lg" />);
    button = screen.getByRole("button");
    expect(button).toHaveClass("w-12", "h-12"); // lg size is w-12 h-12
  });
}); 