import { useState, useEffect, useCallback } from "react";

interface OnboardingStatus {
  onboardingCompleted: boolean;
  onboardingSkipped: boolean;
  shouldShowOnboarding: boolean;
  isNewUser: boolean;
  userStats: {
    courses: number;
    exams: number;
    questionBanks: number;
  };
}

interface UseOnboardingReturn {
  onboardingStatus: OnboardingStatus | null;
  isLoading: boolean;
  error: string | null;
  showOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refetchStatus: () => Promise<void>;
}

export function useOnboarding(): UseOnboardingReturn {
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOnboardingStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("/api/auth/onboarding");
      
      if (!response.ok) {
        throw new Error(`Failed to fetch onboarding status: ${response.statusText}`);
      }
      
      const data = await response.json();
      setOnboardingStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch onboarding status");
      console.error("Error fetching onboarding status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateOnboardingStatus = useCallback(async (action: "complete" | "skip") => {
    try {
      setError(null);
      
      const response = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update onboarding status: ${response.statusText}`);
      }
      
      // Refetch the status to get updated data
      await fetchOnboardingStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update onboarding status");
      console.error("Error updating onboarding status:", err);
      throw err; // Re-throw to allow caller to handle
    }
  }, [fetchOnboardingStatus]);

  const completeOnboarding = useCallback(async () => {
    await updateOnboardingStatus("complete");
  }, [updateOnboardingStatus]);

  const skipOnboarding = useCallback(async () => {
    await updateOnboardingStatus("skip");
  }, [updateOnboardingStatus]);

  const refetchStatus = useCallback(async () => {
    await fetchOnboardingStatus();
  }, [fetchOnboardingStatus]);

  useEffect(() => {
    fetchOnboardingStatus();
  }, [fetchOnboardingStatus]);

  const showOnboarding = Boolean(
    onboardingStatus?.shouldShowOnboarding && 
    !isLoading && 
    !error
  );

  return {
    onboardingStatus,
    isLoading,
    error,
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    refetchStatus,
  };
} 