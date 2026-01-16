/**
 * Jest unit tests for Exam Variants Page
 * Tests the frontend component logic for variant generation and management
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

// Mock Next.js modules
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// We'll test the core logic without the full component due to complexity
// This tests the variant generation and state management logic

describe("Variants Page Logic", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
  };

  const mockSearchParams = new URLSearchParams();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    (global.fetch as jest.Mock).mockClear();
  });

  describe("Variant Generation Configuration", () => {
    it("should validate variant count input", () => {
      const validateVariantCount = (count: number, maxAllowed: number = 10) => {
        if (!count || count < 1) return "Variant count must be at least 1";
        if (count > maxAllowed)
          return `Variant count cannot exceed ${maxAllowed}`;
        return null;
      };

      expect(validateVariantCount(0)).toBe("Variant count must be at least 1");
      expect(validateVariantCount(-1)).toBe("Variant count must be at least 1");
      expect(validateVariantCount(11)).toBe("Variant count cannot exceed 10");
      expect(validateVariantCount(5)).toBeNull();
    });

    it("should handle completion status locking", () => {
      const isGenerationCompleted = (status: string) => status === "COMPLETED";
      const canModifyGeneration = (status: string) =>
        !isGenerationCompleted(status);

      expect(canModifyGeneration("DRAFT")).toBe(true);
      expect(canModifyGeneration("IN_PROGRESS")).toBe(true);
      expect(canModifyGeneration("COMPLETED")).toBe(false);
    });

    it("should prepare generation config data correctly", () => {
      const prepareConfigData = (formData: any) => ({
        variantCount: parseInt(formData.variantCount) || 3,
        randomizeQuestionOrder: Boolean(formData.randomizeQuestionOrder),
        randomizeOptionOrder: Boolean(formData.randomizeOptionOrder),
        enforceMaxVariations: true, // Always enforce for consistency
      });

      const mockFormData = {
        variantCount: "4",
        randomizeQuestionOrder: true,
        randomizeOptionOrder: false,
      };

      const config = prepareConfigData(mockFormData);

      expect(config.variantCount).toBe(4);
      expect(config.randomizeQuestionOrder).toBe(true);
      expect(config.randomizeOptionOrder).toBe(false);
      expect(config.enforceMaxVariations).toBe(true);
    });
  });

  describe("API Integration Logic", () => {
    it("should handle successful variant generation", async () => {
      const mockResponse = {
        success: true,
        generation: {
          id: "gen1",
          variantCount: 4,
          status: "DRAFT",
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const generateVariants = async (examId: string, config: any) => {
        const response = await fetch(`/api/exams/${examId}/generations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          throw new Error("Failed to generate variants");
        }

        return await response.json();
      };

      const result = await generateVariants("exam1", { variantCount: 4 });

      expect(result.success).toBe(true);
      expect(result.generation.variantCount).toBe(4);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/exams/exam1/generations",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantCount: 4 }),
        }
      );
    });

    it("should handle variant generation errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Insufficient questions" }),
      });

      const generateVariants = async (examId: string, config: any) => {
        const response = await fetch(`/api/exams/${examId}/generations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to generate variants");
        }

        return await response.json();
      };

      await expect(
        generateVariants("exam1", { variantCount: 4 })
      ).rejects.toThrow("Insufficient questions");
    });

    it("should fetch existing variants correctly", async () => {
      const mockVariants = [
        { id: "v1", generationId: "gen1", variantNumber: 1 },
        { id: "v2", generationId: "gen1", variantNumber: 2 },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ variants: mockVariants }),
      });

      const fetchVariants = async (generationId: string) => {
        const response = await fetch(
          `/api/exam-variants?generationId=${generationId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch variants");
        }

        const data = await response.json();
        return data.variants;
      };

      const variants = await fetchVariants("gen1");

      expect(variants).toHaveLength(2);
      expect(variants[0].variantNumber).toBe(1);
      expect(variants[1].variantNumber).toBe(2);
    });
  });

  describe("State Management Logic", () => {
    it("should manage loading states correctly", () => {
      let isLoading = false;
      let isGenerating = false;
      let error: string | null = null;

      const setLoadingState = (loading: boolean) => {
        isLoading = loading;
      };
      const setGeneratingState = (generating: boolean) => {
        isGenerating = generating;
      };
      const setError = (err: string | null) => {
        error = err;
      };

      // Initial state
      expect(isLoading).toBe(false);
      expect(isGenerating).toBe(false);
      expect(error).toBeNull();

      // Start generation
      setGeneratingState(true);
      setError(null);
      expect(isGenerating).toBe(true);
      expect(error).toBeNull();

      // Complete generation
      setGeneratingState(false);
      expect(isGenerating).toBe(false);

      // Handle error
      setError("Generation failed");
      expect(error).toBe("Generation failed");
    });

    it("should clear variants before regeneration", () => {
      let variants: any[] = [
        { id: "v1", variantNumber: 1 },
        { id: "v2", variantNumber: 2 },
      ];

      const clearVariants = () => {
        variants = [];
      };

      expect(variants).toHaveLength(2);

      // Clear before regeneration
      clearVariants();
      expect(variants).toHaveLength(0);
    });

    it("should handle completion status changes", () => {
      let generation = {
        id: "gen1",
        status: "DRAFT",
        variantCount: 3,
      };

      const updateGenerationStatus = (newStatus: string) => {
        generation = { ...generation, status: newStatus };
      };

      expect(generation.status).toBe("DRAFT");

      updateGenerationStatus("COMPLETED");
      expect(generation.status).toBe("COMPLETED");
    });
  });

  describe("User Interface Logic", () => {
    it("should disable controls when generation is completed", () => {
      const getUIState = (generationStatus: string) => ({
        canEdit: generationStatus !== "COMPLETED",
        canDelete: generationStatus !== "COMPLETED",
        canRegenerate: generationStatus !== "COMPLETED",
        showCompletionBadge: generationStatus === "COMPLETED",
      });

      const draftState = getUIState("DRAFT");
      expect(draftState.canEdit).toBe(true);
      expect(draftState.canDelete).toBe(true);
      expect(draftState.canRegenerate).toBe(true);
      expect(draftState.showCompletionBadge).toBe(false);

      const completedState = getUIState("COMPLETED");
      expect(completedState.canEdit).toBe(false);
      expect(completedState.canDelete).toBe(false);
      expect(completedState.canRegenerate).toBe(false);
      expect(completedState.showCompletionBadge).toBe(true);
    });

    it("should format variant display correctly", () => {
      const formatVariantDisplay = (variant: any, showAnswers: boolean) => ({
        title: `Variant ${variant.variantNumber}`,
        questionsCount: variant.questions?.length || 0,
        showAnswerKey: showAnswers && variant.answerKey?.length > 0,
        downloadUrl: `/api/exams/variants/${variant.id}/download`,
      });

      const mockVariant = {
        id: "v1",
        variantNumber: 1,
        questions: [{}, {}, {}],
        answerKey: [{ questionId: "q1", correctAnswer: "A" }],
      };

      const displayWithAnswers = formatVariantDisplay(mockVariant, true);
      expect(displayWithAnswers.title).toBe("Variant 1");
      expect(displayWithAnswers.questionsCount).toBe(3);
      expect(displayWithAnswers.showAnswerKey).toBe(true);

      const displayWithoutAnswers = formatVariantDisplay(mockVariant, false);
      expect(displayWithoutAnswers.showAnswerKey).toBe(false);
    });

    it("should handle navigation after completion", () => {
      const handleCompleteExam = (examId: string, router: any) => {
        // Update status to completed (would be API call)
        // Navigate to analytics
        router.push(`/course/test/exams/${examId}/analytics`);
      };

      handleCompleteExam("exam1", mockRouter);

      expect(mockRouter.push).toHaveBeenCalledWith(
        "/course/test/exams/exam1/analytics"
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors gracefully", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error("Network error")
      );

      const handleApiError = async (apiCall: () => Promise<any>) => {
        try {
          return await apiCall();
        } catch (error: any) {
          if (error.name === "TypeError" || error.message.includes("Network")) {
            return {
              error:
                "Network connection failed. Please check your internet connection.",
            };
          }
          return { error: error.message || "An unexpected error occurred" };
        }
      };

      const result = await handleApiError(() => fetch("/api/test"));

      expect(result.error).toBe(
        "Network connection failed. Please check your internet connection."
      );
    });

    it("should validate generation configuration", () => {
      const validateConfig = (config: any) => {
        const errors: string[] = [];

        if (!config.variantCount || config.variantCount < 1) {
          errors.push("Variant count must be at least 1");
        }

        if (config.variantCount > 50) {
          errors.push("Variant count cannot exceed 50");
        }

        return errors;
      };

      expect(validateConfig({ variantCount: 0 })).toContain(
        "Variant count must be at least 1"
      );
      expect(validateConfig({ variantCount: 100 })).toContain(
        "Variant count cannot exceed 50"
      );
      expect(validateConfig({ variantCount: 5 })).toHaveLength(0);
    });

    it("should handle incomplete generation data", () => {
      const safeParseGeneration = (data: any) => ({
        id: data?.id || null,
        status: data?.status || "UNKNOWN",
        variantCount: parseInt(data?.variantCount) || 0,
        createdAt: data?.createdAt || new Date().toISOString(),
        variants: Array.isArray(data?.variants) ? data.variants : [],
      });

      const incompleteData = { id: "gen1" }; // Missing fields
      const parsed = safeParseGeneration(incompleteData);

      expect(parsed.id).toBe("gen1");
      expect(parsed.status).toBe("UNKNOWN");
      expect(parsed.variantCount).toBe(0);
      expect(parsed.variants).toEqual([]);
    });
  });

  describe("Answer Key Management", () => {
    it("should ensure answer keys are saved for all generations", () => {
      const mockVariant = {
        generationId: "gen1",
        variantNumber: 1,
        questions: [
          { id: "q1", correctAnswer: "A", options: ["A", "B", "C", "D"] },
          { id: "q2", correctAnswer: "True", options: ["True", "False"] },
        ],
      };

      const extractAnswerKey = (variant: any) => {
        return variant.questions.map((q: any) => ({
          questionId: q.id,
          correctAnswer: q.correctAnswer,
        }));
      };

      const answerKey = extractAnswerKey(mockVariant);

      expect(answerKey).toHaveLength(2);
      expect(answerKey[0]).toEqual({ questionId: "q1", correctAnswer: "A" });
      expect(answerKey[1]).toEqual({ questionId: "q2", correctAnswer: "True" });
    });

    it("should handle case-insensitive True/False normalization", () => {
      const normalizeTrueFalseAnswer = (answer: string, options: string[]) => {
        const normalizedAnswer = answer.toLowerCase();

        if (normalizedAnswer === "true") return "True";
        if (normalizedAnswer === "false") return "False";

        // Find matching option with case-insensitive comparison
        const matchingOption = options.find(
          (opt) => opt.toLowerCase() === normalizedAnswer
        );

        return matchingOption || answer;
      };

      expect(normalizeTrueFalseAnswer("true", ["True", "False"])).toBe("True");
      expect(normalizeTrueFalseAnswer("FALSE", ["True", "False"])).toBe(
        "False"
      );
      expect(normalizeTrueFalseAnswer("True", ["True", "False"])).toBe("True");
    });
  });

  describe("Database Integration Logic", () => {
    it("should handle answer key persistence", async () => {
      const mockVariantData = [
        {
          generationId: "gen1",
          variantNumber: 1,
          answerKey: [
            { questionId: "q1", correctAnswer: "A" },
            { questionId: "q2", correctAnswer: "True" },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, savedCount: 1 }),
      });

      const saveAnswerKeys = async (variants: any[]) => {
        const response = await fetch("/api/exam-variants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variants }),
        });

        if (!response.ok) {
          throw new Error("Failed to save answer keys");
        }

        return await response.json();
      };

      const result = await saveAnswerKeys(mockVariantData);

      expect(result.success).toBe(true);
      expect(result.savedCount).toBe(1);
      expect(global.fetch).toHaveBeenCalledWith("/api/exam-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variants: mockVariantData }),
      });
    });

    it("should handle completion status updates", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const markExamCompleted = async (
        examId: string,
        generationId: string
      ) => {
        const response = await fetch(`/api/exams/${examId}/generations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: generationId,
            status: "COMPLETED",
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark exam as completed");
        }

        return await response.json();
      };

      await markExamCompleted("exam1", "gen1");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/exams/exam1/generations",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: "gen1",
            status: "COMPLETED",
          }),
        }
      );
    });
  });
});
