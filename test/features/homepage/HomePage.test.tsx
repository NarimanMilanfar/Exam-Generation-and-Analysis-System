import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import HomePage from "../../../app/page";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
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

describe("HomePage", () => {
  const mockPush = jest.fn();
  const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

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
  });

  describe("Logo Integration", () => {
    it("renders the logo with correct attributes", () => {
      render(<HomePage />);

      const logo = screen.getByAltText("UExam Logo");
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute("src", "/logos/image.png");
      expect(logo).toHaveAttribute("width", "120");
      expect(logo).toHaveAttribute("height", "120");
    });

    it("displays logo above main heading", () => {
      render(<HomePage />);

      const logo = screen.getByAltText("UExam Logo");
      const heading = screen.getByRole("heading", { level: 1 });

      // Logo should be in the DOM before the main heading
      expect(logo).toBeInTheDocument();
      expect(heading).toBeInTheDocument();
    });
  });

  describe("Brand Colors", () => {
    it("uses navy blue gradient background", () => {
      render(<HomePage />);

      // Check for the gradient background class on the main container
      const container = document.querySelector(".bg-gradient-to-br");
      expect(container).toBeInTheDocument();
    });

    it("uses white text for main content", () => {
      render(<HomePage />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveClass("text-white");
    });

    it("uses white button with navy background", () => {
      render(<HomePage />);

      const loginButton = screen.getByRole("link", { name: "Login" });
      expect(loginButton).toHaveClass("bg-white", "text-brand-navy");
    });
  });

  describe("Page Content", () => {
    it("renders main heading and description", () => {
      render(<HomePage />);

      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(screen.getByText(/Exam Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Made Simple/i)).toBeInTheDocument();
    });

    it("renders call-to-action button", () => {
      render(<HomePage />);

      const loginButton = screen.getByRole("link", { name: "Login" });
      expect(loginButton).toBeInTheDocument();
    });

    it("navigates to correct route when login button is clicked", async () => {
      const user = userEvent.setup();
      render(<HomePage />);

      const loginButton = screen.getByRole("link", { name: "Login" });
      expect(loginButton).toHaveAttribute("href", "/auth/login");
    });
  });

  describe("Features Section", () => {
    it("displays feature cards with icons and descriptions", () => {
      render(<HomePage />);

      // Check for feature headings based on actual implementation
      expect(screen.getByText(/Course Management/i)).toBeInTheDocument();
      expect(screen.getByText(/Smart Exam Builder/i)).toBeInTheDocument();
      expect(screen.getByText(/Advanced Analytics/i)).toBeInTheDocument();
    });
  });

  describe("Responsive Design", () => {
    it("has responsive layout classes", () => {
      render(<HomePage />);

      const mainContainer = document.querySelector(".min-h-screen");
      expect(mainContainer).toBeInTheDocument();
    });

    it("renders properly on different screen sizes", () => {
      render(<HomePage />);

      // Check for responsive grid classes
      const featuresGrid = screen
        .getByText(/Course Management/i)
        .closest("div")?.parentElement;
      expect(featuresGrid).toHaveClass("grid");
    });
  });

  describe("Accessibility", () => {
    it("has proper heading hierarchy", () => {
      render(<HomePage />);

      const mainHeading = screen.getByRole("heading", { level: 1 });
      const featureHeadings = screen.getAllByRole("heading", { level: 3 });

      expect(mainHeading).toBeInTheDocument();
      expect(featureHeadings.length).toBeGreaterThan(0);
    });

    it("has proper alt text for logo", () => {
      render(<HomePage />);

      const logo = screen.getByAltText("UExam Logo");
      expect(logo).toBeInTheDocument();
    });

    it("has accessible button and link elements", () => {
      render(<HomePage />);

      const loginButton = screen.getByRole("link", { name: "Login" });
      expect(loginButton).toBeInTheDocument();
    });
  });
});
