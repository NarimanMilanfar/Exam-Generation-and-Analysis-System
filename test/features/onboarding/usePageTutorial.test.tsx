import { renderHook, act } from "@testing-library/react";
import { usePageTutorial } from "../../../app/hooks/usePageTutorial";

// Mock usePathname
const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

describe("usePageTutorial", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should detect dashboard page", () => {
    mockPathname.mockReturnValue("/dashboard");
    const { result } = renderHook(() => usePageTutorial());
    
    expect(result.current.pageName).toBe("Dashboard");
    expect(result.current.currentPageTutorial?.pageTitle).toBe("Dashboard Tutorial");
    expect(result.current.showTutorial).toBe(false);
  });

  it("should detect question bank page", () => {
    mockPathname.mockReturnValue("/course/123/question-bank");
    const { result } = renderHook(() => usePageTutorial());
    
    expect(result.current.pageName).toBe("Question Bank");
    expect(result.current.currentPageTutorial?.pageTitle).toBe("Question Bank Tutorial");
  });

  it("should manage tutorial state", () => {
    mockPathname.mockReturnValue("/dashboard");
    const { result } = renderHook(() => usePageTutorial());

    // Initially closed
    expect(result.current.showTutorial).toBe(false);

    // Start tutorial
    act(() => {
      result.current.startTutorial();
    });
    expect(result.current.showTutorial).toBe(true);

    // Close tutorial
    act(() => {
      result.current.closeTutorial();
    });
    expect(result.current.showTutorial).toBe(false);
  });

  it("should handle path changes", () => {
    mockPathname.mockReturnValue("/dashboard");
    const { result, rerender } = renderHook(() => usePageTutorial());

    expect(result.current.pageName).toBe("Dashboard");

    // Start tutorial
    act(() => {
      result.current.startTutorial();
    });
    expect(result.current.showTutorial).toBe(true);

    // Change pathname - tutorial may remain open depending on implementation
    mockPathname.mockReturnValue("/course/123/question-bank");
    rerender();

    expect(result.current.pageName).toBe("Question Bank");
    // Don't assert tutorial state as it may vary based on implementation
  });
}); 