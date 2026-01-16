import { renderHook, waitFor } from "@testing-library/react";
import { act } from "react";
import { useOnboarding } from "../../../app/hooks/useOnboarding";

// Mock fetch
global.fetch = jest.fn();

describe("useOnboarding", () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it("should fetch and manage onboarding status", async () => {
    const mockStatus = {
      onboardingCompleted: false,
      onboardingSkipped: false,
      shouldShowOnboarding: true,
      isNewUser: true,
      userStats: { courses: 0, exams: 0, questionBanks: 0 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStatus,
    } as Response);

    const { result } = renderHook(() => useOnboarding());

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.showOnboarding).toBe(false);

    // Wait for loading to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.onboardingStatus).toEqual(mockStatus);
    expect(result.current.showOnboarding).toBe(true);
    expect(result.current.error).toBe(null);
    expect(mockFetch).toHaveBeenCalledWith("/api/auth/onboarding");
  });

  it("should handle different onboarding states correctly", async () => {
    // Test completed onboarding
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        onboardingCompleted: true,
        onboardingSkipped: false,
        shouldShowOnboarding: false,
        isNewUser: false,
        userStats: { courses: 1, exams: 2, questionBanks: 3 },
      }),
    } as Response);

    const { result: completedResult } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(completedResult.current.showOnboarding).toBe(false);
      expect(completedResult.current.onboardingStatus?.onboardingCompleted).toBe(true);
    });
  });

  it("should handle errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.onboardingStatus).toBe(null);
      expect(result.current.showOnboarding).toBe(false);
      expect(result.current.error).toBe("Network error");
    });
  });

  it("should complete and skip onboarding", async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        onboardingCompleted: false,
        onboardingSkipped: false,
        shouldShowOnboarding: true,
        isNewUser: true,
        userStats: { courses: 0, exams: 0, questionBanks: 0 },
      }),
    } as Response);

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test complete onboarding
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        onboardingCompleted: true,
        onboardingSkipped: false,
      }),
    } as Response);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        onboardingCompleted: true,
        onboardingSkipped: false,
        shouldShowOnboarding: false,
        isNewUser: true,
        userStats: { courses: 0, exams: 0, questionBanks: 0 },
      }),
    } as Response);

    await act(async () => {
      await result.current.completeOnboarding();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/auth/onboarding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "complete" }),
    });
  });

  it("should refetch status when requested", async () => {
    // Initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        onboardingCompleted: false,
        onboardingSkipped: false,
        shouldShowOnboarding: true,
        isNewUser: true,
        userStats: { courses: 0, exams: 0, questionBanks: 0 },
      }),
    } as Response);

    const { result } = renderHook(() => useOnboarding());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Refetch with updated data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        onboardingCompleted: false,
        onboardingSkipped: false,
        shouldShowOnboarding: false,
        isNewUser: false,
        userStats: { courses: 1, exams: 0, questionBanks: 0 },
      }),
    } as Response);

    await act(async () => {
      await result.current.refetchStatus();
    });

    await waitFor(() => {
      expect(result.current.onboardingStatus?.userStats.courses).toBe(1);
      expect(result.current.showOnboarding).toBe(false);
    });
  });
}); 