"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import JSZip from "jszip";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";
import VariationsPreview from "./display/VariationsPreview";
import VariantGenerationModal from "../../../../../components/exams/VariantGenerationModal";
import { Question, QuestionType } from "../../../../../types/course";
import {
  generateExamVariations,
  ExamVariationConfig,
  ExamVariationResult,
  ExamVariant,
  recreateVariant,
} from "../../../../../lib/examVariations";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface ExamData {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  createdAt: string;
  termId?: string;
  term?: {
    term: string;
    year: number;
  } | null;
}

interface VariantGenerationConfig {
  numberOfVariants: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  randomizeTrueFalse: boolean;
}

// Download & Complete Exam Generation Modal Component
function DownloadAndCompleteModal({
  isOpen,
  onClose,
  onComplete,
  examTitle,
  onDownload,
}: {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  examTitle: string;
  onDownload: (format: "pdf" | "docx") => Promise<void>;
}) {
  const [stage, setStage] = useState<"download" | "confirm">("download");
  const [downloadingFormat, setDownloadingFormat] = useState<
    "pdf" | "docx" | null
  >(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStage("download");
      setDownloadingFormat(null);
      setHasDownloaded(false);
    }
  }, [isOpen]);

  const handleDownload = async (format: "pdf" | "docx") => {
    setDownloadingFormat(format);
    try {
      await onDownload(format);
      setHasDownloaded(true);
      setStage("confirm");
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          {stage === "download" && (
            <>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Download & Complete Exam Generation
                  </h3>
                  <p className="text-gray-600">{examTitle}</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1">
                      Required: Download First
                    </h4>
                    <p className="text-blue-700 text-sm">
                      You must download the exam variants before completing the
                      generation. Choose your preferred format below.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <button
                  onClick={() => handleDownload("pdf")}
                  disabled={downloadingFormat !== null}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>
                    {downloadingFormat === "pdf"
                      ? "Creating PDF..."
                      : "Download as PDF"}
                  </span>
                </button>

                <button
                  onClick={() => handleDownload("docx")}
                  disabled={downloadingFormat !== null}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>
                    {downloadingFormat === "docx"
                      ? "Creating DOCX..."
                      : "Download as DOCX"}
                  </span>
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  disabled={downloadingFormat !== null}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}

          {stage === "confirm" && (
            <>
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Complete Exam Generation
                  </h3>
                  <p className="text-gray-600">{examTitle}</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 text-green-700">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="font-medium">
                    Download completed successfully!
                  </span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <svg
                    className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  <div>
                    <h4 className="font-medium text-amber-800 mb-1">
                      Important: Next Steps
                    </h4>
                    <div className="text-amber-700 text-sm space-y-1">
                      <p>
                        • This will mark the exam generation as complete and
                        move it to Analytics
                      </p>
                      <p>
                        • You will be able to upload student results and view
                        performance data
                      </p>
                      <p>
                        • You can generate new variants of this exam by clicking
                        "Generate Variants" again
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>Complete Generation</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Switch Toggle Component for Show Answers
function AnswersToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">Show Answers:</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-navy focus:ring-offset-2 ${
          checked ? "bg-brand-navy" : "bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function ExamVariationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const examId = searchParams.get("examId");
  const generationId = searchParams.get("generationId");
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [showAnswers, setShowAnswers] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState<ExamVariant[]>([]);
  const [exam, setExam] = useState<ExamData | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState<any>(null);

  // Modal states
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditConfigModal, setShowEditConfigModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Track if variants have been loaded to prevent duplicate toasts
  const variantsLoadedRef = useRef(false);
  // Add a ref to track if we're currently loading variants
  const isLoadingVariantsRef = useRef(false);

  // Variant configuration from generation data
  const [variantConfig, setVariantConfig] = useState<any>({
    numberOfVariants: 3,
    randomizeQuestionOrder: true,
    randomizeOptionOrder: true,
    randomizeTrueFalseOptions: true,
  });

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (courseId && examId) {
      fetchCourse();
      fetchExam();
      if (generationId) {
        fetchGeneration();
      }
    } else {
      router.push(`/course/${courseId}/exams`);
    }
  }, [courseId, examId, session, status]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        toast.error("Failed to load course");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course");
    }
  };

  const fetchExam = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/exams/${examId}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Exam ${examId} not found, redirecting`);
          router.push("/not-found");
          return;
        } else if (response.status === 500) {
            router.push("/error");
            return;
      } else if (response.status === 403) {
        toast.error("You do not have permission to view this exam.");
        setError("Permission denied.");
        return;
      } else {
        toast.error(`Failed to fetch exam (${response.status})`);
        setError(`Unexpected error (${response.status})`);
        return;
      }
    }

      const examData = await response.json();

      // Process the exam data
      const processedExam: ExamData = {
        id: examData.id,
        title: examData.name || examData.title || "Untitled Exam",
        description: examData.description || "",
        questions: examData.questions || [],
        totalPoints:
          examData.questions?.reduce(
            (sum: number, q: any) => sum + q.points,
            0
          ) || 0,
        createdAt: examData.createdAt,
        termId: examData.termId,
        term: examData.term,
      };

      setExam(processedExam);
    } catch (error) {
      console.error("Error fetching exam:", error);
      setError("Failed to load exam data. Please try again.");
      toast.error("Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

  const fetchGeneration = async () => {
    try {
      const response = await fetch(`/api/exams/${examId}/generations`);
      if (response.ok) {
        const generations = await response.json();

        // Find the specific generation or get the most recent one
        let targetGeneration: any = null;
        if (generationId) {
          targetGeneration = generations.find(
            (g: any) => g.id === generationId
          );
        }
        if (!targetGeneration && generations.length > 0) {
          targetGeneration = generations[0]; // Most recent
        }

        if (targetGeneration) {
          setGeneration(targetGeneration);
          setVariantConfig({
            numberOfVariants: targetGeneration.numberOfVariants,
            randomizeQuestionOrder: targetGeneration.randomizeQuestionOrder,
            randomizeOptionOrder: targetGeneration.randomizeOptionOrder,
            randomizeTrueFalseOptions: targetGeneration.randomizeTrueFalse,
          });
        }
      } else {
        console.error("Failed to fetch generation data");
      }
    } catch (error) {
      console.error("Error fetching generation:", error);
    }
  };

  /**
   * Saves answer keys for each variant to the database
   */
  const saveAnswerKeysToDatabase = async (
    generationId: string,
    variants: ExamVariant[],
    startIndex: number = 0
  ) => {
    try {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];

        // Create answer key with A/B/C/D format (including True/False as A/B)
        const answerKey = variant.questions.map((question, qIndex) => {
          let correctOption = question.correctAnswer;

          if (question.type === QuestionType.TRUE_FALSE) {
            // Convert True/False to A/B format with null safety
            const options = question.options || ["True", "False"];
            const correctAnswer = question.correctAnswer || "";
            const correctIndex = options.findIndex(
              (opt) => opt.toLowerCase() === correctAnswer.toLowerCase()
            );
            // Fallback logic if still not found
            if (correctIndex === -1) {
              // Handle common variations
              const normalizedAnswer = correctAnswer.toLowerCase().trim();
              if (normalizedAnswer === "true" || normalizedAnswer === "1") {
                correctOption = "A"; // First option is typically True
              } else if (
                normalizedAnswer === "false" ||
                normalizedAnswer === "0"
              ) {
                correctOption = "B"; // Second option is typically False
              } else {
                correctOption = "A"; // Default fallback
              }
            } else {
              correctOption = String.fromCharCode(65 + correctIndex); // A or B
            }
          } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
            // Find the correct option letter (A, B, C, D)
            const options =
              typeof question.options === "string"
                ? JSON.parse(question.options)
                : question.options || [];
            const correctIndex = options.findIndex(
              (opt: string) => opt === question.correctAnswer
            );
            correctOption =
              correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";
          }

          return {
            questionId: question.id,
            questionNumber: qIndex + 1,
            correctAnswer: correctOption,
            originalAnswer: question.correctAnswer,
          };
        });

        // Save variant with answer key to database
        await fetch(`/api/exam-variants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generationId: generationId,
            variantNumber: startIndex + i + 1,
            variantCode: `${generationId.slice(-8)}-V${startIndex + i + 1}`,
            examId: examId,
            answerKey: JSON.stringify(answerKey),
            questionOrder: JSON.stringify(variant.metadata.questionOrder),
            answerOrder: JSON.stringify(variant.metadata.optionPermutations),
          }),
        });
      }
    } catch (error) {
      console.error("Error saving answer keys:", error);
      // Don't throw error to not break the flow, just log it
    }
  };

  /**
   * Loads generated variants - always generate using database config, ignore database variants
   */
  const loadGeneratedVariants = async () => {
    if (!courseId || !examId || variantsLoadedRef.current) return;

    setIsGenerating(true);
    isLoadingVariantsRef.current = true;
    try {
      let config;
      let shouldShowToast = false;

      // Load from generation data (database)
      if (generation) {
        config = {
          numberOfVariants: generation.numberOfVariants,
          randomizeQuestionOrder: generation.randomizeQuestionOrder,
          randomizeOptionOrder: generation.randomizeOptionOrder,
          randomizeTrueFalseOptions: generation.randomizeTrueFalse,
        };
      }
      // Fallback to URL parameters (for new generations)
      else {
        const urlSearchParams = new URLSearchParams(window.location.search);
        config = {
          numberOfVariants: parseInt(urlSearchParams.get("variants") || "3"),
          randomizeQuestionOrder:
            urlSearchParams.get("randomizeQuestions") === "true",
          randomizeOptionOrder:
            urlSearchParams.get("randomizeOptions") === "true",
          randomizeTrueFalseOptions:
            urlSearchParams.get("randomizeTrueFalse") === "true",
        };
        shouldShowToast = urlSearchParams.get("generated") === "true";
      }

      setVariantConfig(config);

      // Always generate variants using the configuration - this ensures consistency
      if (exam?.questions) {
        // Use generation ID as seed to ensure consistency
        const seed = generation?.id || `exam_${examId}_${Date.now()}`;
        const result = generateExamVariations(exam.questions, {
          maxVariations: config.numberOfVariants,
          randomizeQuestionOrder: config.randomizeQuestionOrder,
          randomizeOptionOrder: config.randomizeOptionOrder,
          randomizeTrueFalseOptions: config.randomizeTrueFalseOptions,
          seed: seed,
          enforceMaxVariations: true, // CRITICAL: Always generate the requested number of variants
        });

        setVariants(result.variants);
        console.log(
          `Generated ${result.variants.length} variants with config:`,
          config
        );

        // Save answer keys to database for ALL generations (new and edited)
        if (generation) {
          await saveAnswerKeysToDatabase(generation.id, result.variants);
        }

        // Mark as loaded and show toast only for new generations
        variantsLoadedRef.current = true;
        if (shouldShowToast) {
          toast.success(`Generated ${result.variants.length} exam variants!`);
        }

        // Remove URL parameters to prevent re-triggering on refresh
        const url = new URL(window.location.href);
        url.searchParams.delete("generated");
        url.searchParams.delete("variants");
        url.searchParams.delete("randomizeQuestions");
        url.searchParams.delete("randomizeOptions");
        url.searchParams.delete("randomizeTrueFalse");
        window.history.replaceState({}, "", url.toString());
      }
    } catch (error) {
      console.error("Error loading variants:", error);
      toast.error("Failed to load variants");
    } finally {
      setIsGenerating(false);
      isLoadingVariantsRef.current = false;
    }
  };

  /**
   * Handles editing configuration and regenerating variants
   */
  const handleEditConfig = async (newConfig: VariantGenerationConfig) => {
    setIsRegenerating(true);
    setShowEditConfigModal(false);

    try {
      // Check if generation is completed
      if (generation?.status === "COMPLETED") {
        toast.error("Cannot modify configuration of completed exam generation");
        return;
      }

      // CRITICAL: Map modal config keys to examVariations function parameter names
      const config = {
        numberOfVariants: newConfig.numberOfVariants,
        randomizeQuestionOrder: newConfig.randomizeQuestions, // Modal: randomizeQuestions -> Function: randomizeQuestionOrder
        randomizeOptionOrder: newConfig.randomizeOptions, // Modal: randomizeOptions -> Function: randomizeOptionOrder
        randomizeTrueFalseOptions: newConfig.randomizeTrueFalse, // Modal: randomizeTrueFalse -> Function: randomizeTrueFalseOptions
      };

      // Update the generation in database with new configuration FIRST
      if (generation && examId) {
        const updateResponse = await fetch(`/api/exams/${examId}/generations`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generationId: generation.id,
            numberOfVariants: config.numberOfVariants,
            randomizeQuestionOrder: config.randomizeQuestionOrder,
            randomizeOptionOrder: config.randomizeOptionOrder,
            randomizeTrueFalse: config.randomizeTrueFalseOptions,
          }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || "Failed to update configuration");
        }

        const updatedGeneration = await updateResponse.json();
        setGeneration(updatedGeneration);
      }

      // ROBUST FIX: Preserve existing variants and their results
      const currentVariantCount = variants.length;
      const newVariantCount = config.numberOfVariants;

      if (newVariantCount === currentVariantCount) {
        // No change in count, just update config
        setVariantConfig(config);
        return;
      } else if (newVariantCount < currentVariantCount) {
        // Reducing variants: Keep first N variants, remove the rest
        const preservedVariants = variants.slice(0, newVariantCount);
        setVariants(preservedVariants);
        setVariantConfig(config);
        
        // Delete excess variants from database
        for (let i = newVariantCount; i < currentVariantCount; i++) {
          await fetch(`/api/exam-variants?generationId=${generation.id}&variantNumber=${i + 1}`, {
            method: 'DELETE',
          }).catch(console.error);
        }
      } else {
        // Increasing variants: Keep existing, generate new ones
        if (exam?.questions) {
          const seed = generation?.id || `exam_${examId}_${Date.now()}`;
          const result = generateExamVariations(exam.questions, {
            maxVariations: newVariantCount,
            randomizeQuestionOrder: config.randomizeQuestionOrder,
            randomizeOptionOrder: config.randomizeOptionOrder,
            randomizeTrueFalseOptions: config.randomizeTrueFalseOptions,
            seed: seed,
            enforceMaxVariations: true,
          });

          // Keep existing variants, add new ones
          const preservedVariants = variants.slice(0, currentVariantCount);
          const newVariants = result.variants.slice(currentVariantCount);
          const allVariants = [...preservedVariants, ...newVariants];
          
          setVariants(allVariants);
          setVariantConfig(config);

          // Only save new variants to database
          if (generation && newVariants.length > 0) {
            await saveAnswerKeysToDatabase(generation.id, newVariants, currentVariantCount);
          }
        }
      }

      console.log(
        `Updated to ${config.numberOfVariants} variants with new config:`,
        config
      );
      toast.success(
        `Updated to ${config.numberOfVariants} exam variants with new configuration!`
      );
    } catch (error) {
      console.error("Error regenerating variants:", error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to regenerate variants");
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  /**
   * Load variants when the page loads - check URL params or generation data
   */
  useEffect(() => {
    if (!exam || variantsLoadedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const hasGeneratedParam = urlParams.get("generated") === "true";
    const hasGenerationId = generationId !== null;

    // Load variants if either:
    // 1. URL indicates variants were just generated, OR
    // 2. There's a generationId (viewing existing variants from database)
    if (hasGeneratedParam || hasGenerationId) {
      loadGeneratedVariants();
    }
  }, [exam, examId, generation]);

  // Generate PDF for a single variant with better page handling
  const generateVariantPDF = (
    variant: ExamVariant,
    variantIndex: number,
    includeAnswers: boolean = showAnswers
  ) => {
    const pdf = new jsPDF();
    let yPosition = 20;
    const lineHeight = 8;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const contentHeight = pageHeight - 2 * margin;

    // Helper function to add text with automatic page breaks
    const addText = (
      text: string,
      fontSize: number = 12,
      isBold: boolean = false
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");

      const lines = pdf.splitTextToSize(
        text,
        pdf.internal.pageSize.width - 2 * margin
      );

      for (let i = 0; i < lines.length; i++) {
        if (yPosition > contentHeight) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }
    };

    // Add space with page break check
    const addSpace = (space: number = 5) => {
      if (yPosition + space > contentHeight) {
        pdf.addPage();
        yPosition = margin;
      } else {
        yPosition += space;
      }
    };

    // Header
    addText(`${exam?.title}`, 16, true);
    addText(`Variant ${variantIndex + 1}`, 14, true);
    addSpace(10);
    addText("Instructions:", 12, true);
    addText("• Choose the best answer for each question.", 12);
    addText(
      "• Questions with negative marking will show point penalties - incorrect answers will result in point deduction.",
      12
    );
    addSpace(15);

    // Questions
    variant.questions.forEach((question, qIndex) => {
      // Check if we have enough space for the question + at least 2 options
      const estimatedSpaceNeeded = lineHeight * 6; // Question + some options
      if (yPosition + estimatedSpaceNeeded > contentHeight) {
        pdf.addPage();
        yPosition = margin;
      }

      let questionText = `${qIndex + 1}. ${question.text}`;

      // Build score info
      const scoreParts: string[] = [];

      if (question.points) {
        scoreParts.push(
          `${question.points} point${question.points !== 1 ? "s" : ""}`
        );
      }

      if (question.negativePoints && question.negativePoints < 0) {
        scoreParts.push(`${question.negativePoints} points penalty`);
      }

      if (scoreParts.length > 0) {
        questionText += ` (${scoreParts.join(", ")})`;
      }

      addText(questionText, 12, true);
      addSpace(5);

      if (
        question.type === QuestionType.MULTIPLE_CHOICE ||
        question.type === QuestionType.TRUE_FALSE
      ) {
        let options;

        if (question.type === QuestionType.TRUE_FALSE) {
          // Use the actual randomized True/False options from the variant
          options = question.options || ["True", "False"];
        } else {
          options =
            typeof question.options === "string"
              ? JSON.parse(question.options)
              : question.options || [];
        }

        options.forEach((option: string, optIndex: number) => {
          const label = String.fromCharCode(65 + optIndex);
          const isCorrect = includeAnswers && option === question.correctAnswer;
          let optionText = `   ${label}. ${option}`;

          if (isCorrect) {
            optionText += " ✓ [CORRECT]";
          }

          addText(optionText, 11, isCorrect);
        });
      }

      addSpace(12);
    });

    // Answer key
    if (includeAnswers) {
      addSpace(15);
      addText("ANSWER KEY", 14, true);
      addSpace(10);

      variant.questions.forEach((question, qIndex) => {
        addText(`${qIndex + 1}. ${question.correctAnswer}`, 11);
      });
    }

    return pdf;
  };

  // Generate DOCX for a single variant
  const generateVariantDOCX = (
    variant: ExamVariant,
    variantIndex: number,
    includeAnswers: boolean = showAnswers
  ) => {
    const children: any[] = [];

    // Header
    children.push(
      new Paragraph({
        text: `${exam?.title}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Variant ${variantIndex + 1}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({ text: "" }), // Empty line
      new Paragraph({
        children: [
          new TextRun({
            text: "Instructions:",
            bold: true,
          }),
        ],
      }),
      new Paragraph({
        text: "• Choose the best answer for each question.",
      }),
      new Paragraph({
        text: "• Questions with negative marking will show point penalties - incorrect answers will result in point deduction.",
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Questions following the template format
    variant.questions.forEach((question, qIndex) => {
      let questionText = `${qIndex + 1}. ${question.text}`;

      // Build score info
      const scoreParts: string[] = [];

      if (question.points) {
        scoreParts.push(
          `${question.points} point${question.points !== 1 ? "s" : ""}`
        );
      }

      if (question.negativePoints && question.negativePoints < 0) {
        scoreParts.push(`${question.negativePoints} points penalty`);
      }

      if (scoreParts.length > 0) {
        questionText += ` (${scoreParts.join(", ")})`;
      }

      children.push(
        new Paragraph({
          text: questionText,
        })
      );

      // Options for multiple choice questions
      if (question.type === QuestionType.MULTIPLE_CHOICE) {
        let options =
          typeof question.options === "string"
            ? JSON.parse(question.options)
            : question.options || [];

        options.forEach((option: string, optIndex: number) => {
          const label = String.fromCharCode(65 + optIndex); // A, B, C, D
          children.push(
            new Paragraph({
              text: `${label}. ${option}`,
            })
          );
        });

        // Find the correct answer letter
        const correctIndex = options.findIndex(
          (opt: string) => opt === question.correctAnswer
        );
        const answerLetter =
          correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";

        children.push(
          new Paragraph({
            text: includeAnswers ? `Answer: ${answerLetter}` : "Answer: _____",
          })
        );
      } else if (question.type === QuestionType.TRUE_FALSE) {
        // For True/False questions, show the answer directly
        children.push(
          new Paragraph({
            text: includeAnswers
              ? `Answer: ${question.correctAnswer}`
              : "Answer: _____",
          })
        );
      }

      // Points line
      children.push(
        new Paragraph({
          text: `Point: ${question.points || 1}`,
        })
      );

      // Empty line after each question
      children.push(new Paragraph({ text: "" }));
    });

    return new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
  };

  // Generate Answer Sheet PDF for all variants
  const generateAnswerSheetPDF = () => {
    const pdf = new jsPDF();
    let yPosition = 20;
    const lineHeight = 8;
    const pageHeight = pdf.internal.pageSize.height;
    const margin = 20;
    const contentHeight = pageHeight - 2 * margin;

    // Helper function to add text with automatic page breaks
    const addText = (
      text: string,
      fontSize: number = 12,
      isBold: boolean = false
    ) => {
      pdf.setFontSize(fontSize);
      pdf.setFont("helvetica", isBold ? "bold" : "normal");

      const lines = pdf.splitTextToSize(
        text,
        pdf.internal.pageSize.width - 2 * margin
      );

      for (let i = 0; i < lines.length; i++) {
        if (yPosition > contentHeight) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }
    };

    // Add space with page break check
    const addSpace = (space: number = 5) => {
      if (yPosition + space > contentHeight) {
        pdf.addPage();
        yPosition = margin;
      } else {
        yPosition += space;
      }
    };

    // Header
    addText(`${exam?.title} - ANSWER SHEET FOR ALL VARIANTS`, 16, true);
    addText(`Generated: ${new Date().toLocaleString()}`, 12);
    addSpace(15);
    addText("Instructions for Grading:", 14, true);
    addText(
      "• Each variant has different question order and/or answer option order",
      11
    );
    addText(
      "• Match student's variant number to the corresponding answer key below",
      11
    );
    addText("• True/False questions are shown as A (True) or B (False)", 11);
    addText(
      "• (NM) indicates Negative Marking - wrong answers receive penalty points",
      11
    );
    addSpace(20);

    // Answer keys for each variant
    variants.forEach((variant, variantIndex) => {
      // Check if we need a new page for this variant
      const estimatedSpaceNeeded = lineHeight * (variant.questions.length + 6);
      if (yPosition + estimatedSpaceNeeded > contentHeight) {
        pdf.addPage();
        yPosition = margin;
      }

      addText(`VARIANT ${variantIndex + 1} ANSWER KEY`, 14, true);
      addSpace(8);

      variant.questions.forEach((question, qIndex) => {
        let correctOption = question.correctAnswer;

        if (question.type === QuestionType.TRUE_FALSE) {
          // Convert True/False to A/B format with null safety
          const options = question.options || ["True", "False"];
          const correctAnswer = question.correctAnswer || "";
          const correctIndex = options.findIndex(
            (opt) => opt.toLowerCase() === correctAnswer.toLowerCase()
          );
          // Fallback logic if still not found
          if (correctIndex === -1) {
            // Handle common variations
            const normalizedAnswer = correctAnswer.toLowerCase().trim();
            if (normalizedAnswer === "true" || normalizedAnswer === "1") {
              correctOption = "A"; // First option is typically True
            } else if (
              normalizedAnswer === "false" ||
              normalizedAnswer === "0"
            ) {
              correctOption = "B"; // Second option is typically False
            } else {
              correctOption = "A"; // Default fallback
            }
          } else {
            correctOption = String.fromCharCode(65 + correctIndex); // A or B
          }
        } else if (question.type === QuestionType.MULTIPLE_CHOICE) {
          // Find the correct option letter (A, B, C, D)
          const options =
            typeof question.options === "string"
              ? JSON.parse(question.options)
              : question.options || [];
          const correctIndex = options.findIndex(
            (opt: string) => opt === question.correctAnswer
          );
          correctOption =
            correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";
        }

        // Add negative marking indicator if applicable
        let answerText = `${qIndex + 1}. ${correctOption}`;
        if (question.negativePoints && question.negativePoints < 0) {
          answerText += ` (${question.negativePoints} points NM)`;
        }

        addText(answerText, 11);
      });

      addSpace(20);
    });

    return pdf;
  };

  // Create and trigger ZIP download
  const createZipDownload = async (
    format: "pdf" | "docx",
    includeAnswers: boolean = false
  ) => {
    const zip = new JSZip();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");

    // Add each variant as a separate file
    for (let i = 0; i < variants.length; i++) {
      const variant = variants[i];

      if (format === "pdf") {
        const pdf = generateVariantPDF(variant, i, includeAnswers);
        const pdfBlob = pdf.output("blob");
        const filename = `${exam?.title}_Variant_${i + 1}.pdf`;
        zip.file(filename, pdfBlob);
      } else {
        const doc = generateVariantDOCX(variant, i, includeAnswers);
        const docxBlob = await Packer.toBlob(doc);
        const filename = `${exam?.title}_Variant_${i + 1}.docx`;
        zip.file(filename, docxBlob);
      }
    }

    // Add answer sheet PDF for grading
    const answerSheetPDF = generateAnswerSheetPDF();
    const answerSheetBlob = answerSheetPDF.output("blob");
    zip.file(`${exam?.title}_ANSWER_SHEET_ALL_VARIANTS.pdf`, answerSheetBlob);

    // Add a summary file
    const summaryContent =
      `Exam: ${exam?.title}\n` +
      `Total Variants: ${variants.length}\n` +
      `Questions per Variant: ${
        variants.length > 0 ? variants[0].questions.length : 0
      }\n` +
      `Generated: ${new Date().toLocaleString()}\n\n` +
      `Configuration Used:\n` +
      `- Question Order: ${
        variantConfig.randomizeQuestionOrder ? "Randomized" : "Fixed"
      }\n` +
      `- Answer Options: ${
        variantConfig.randomizeOptionOrder ? "Randomized" : "Fixed"
      }\n` +
      `- True/False: ${
        variantConfig.randomizeTrueFalseOptions ? "Randomized" : "Fixed"
      }\n` +
      `- Show Answers: ${showAnswers ? "Yes" : "No"}\n` +
      `- Format: ${format.toUpperCase()}\n`;

    zip.file("README.txt", summaryContent);

    // Generate and download zip
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      exam?.title
    }_All_Variants_${format.toUpperCase()}_${timestamp}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle download functionality (for use in DownloadAndCompleteModal)
  const handleDownload = async (format: "pdf" | "docx") => {
    try {
      toast.loading(`Preparing ${format.toUpperCase()} download...`);

      if (!exam || variants.length === 0) {
        throw new Error("No variants to download");
      }

      // Simulate processing time for UX
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create and trigger ZIP download without answers (clean student version)
      await createZipDownload(format, false);

      toast.dismiss();
      toast.success(
        `All variants downloaded as ${format.toUpperCase()} in ZIP file!`
      );
    } catch (error) {
      console.error("Download error:", error);
      toast.dismiss();
      toast.error("Download failed. Please try again.");
      throw error; // Re-throw so the modal can handle it
    }
  };

  // Handle complete exam generation
  const handleCompleteExam = async () => {
    setShowCompleteModal(false);

    try {
      if (!examId || !generation) {
        console.error("No exam ID or generation data available");
        toast.error("Missing generation data. Cannot complete exam.");
        return;
      }

      // Update the generation status in database
      const response = await fetch(`/api/exams/${examId}/generations`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          generationId: generation.id,
          status: "COMPLETED",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to complete exam generation");
      }

      toast.success("Exam generation completed! Exam moved to Analytics.");

      // Navigate to analytics page to see the completed exam
      const analyticsUrl = `/course/${courseId}/analytics${
        isSidebarAccess ? "?sidebar=true" : ""
      }`;
      router.push(analyticsUrl);
    } catch (error) {
      console.error("Complete exam error:", error);
      toast.error("Failed to complete exam generation.");
    }
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Exam Variations"
        description="Generate and preview exam variations"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="exams" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !exam) {
    const errorContent = (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-12 h-12 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Unable to Load Exam
        </h3>
        <p className="text-gray-600 mb-4">
          {error || "The exam you're looking for could not be found."}
        </p>
        <button
          onClick={() => {
            const examsUrl = `/course/${courseId}/exams${
              isSidebarAccess ? "?sidebar=true" : ""
            }`;
            router.push(examsUrl);
          }}
          className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
        >
          Back to Exams
        </button>
      </div>
    );

    return isSidebarAccess ? (
      <SimpleLayout
        course={course}
        title="Exam Variations"
        description="Generate and preview exam variations"
      >
        {errorContent}
      </SimpleLayout>
    ) : (
      <CourseLayout course={course} activeTab="exams">
        {errorContent}
      </CourseLayout>
    );
  }

  const content = (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: "#363636", color: "#fff" },
          success: {
            duration: 2000,
            style: { background: "#4aed88", color: "#fff" },
          },
          error: {
            duration: 3000,
            style: { background: "#ff4b4b", color: "#fff" },
          },
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Exam Variations: {exam.title}
            </h1>
            <p className="text-gray-600 mt-1">
              Generate and preview different versions of your exam
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const examUrl = `/course/${courseId}/exams/view?examId=${examId}${
                  isSidebarAccess ? "&sidebar=true" : ""
                }`;
                router.push(examUrl);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Exam
            </button>

            {variants.length > 0 && (
              <>
                {/* Edit Config Button */}
                <button
                  onClick={() => setShowEditConfigModal(true)}
                  disabled={
                    isRegenerating || generation?.status === "COMPLETED"
                  }
                  className={`${
                    generation?.status === "COMPLETED"
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-700"
                  } disabled:bg-orange-400 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2`}
                  title={
                    generation?.status === "COMPLETED"
                      ? "Cannot edit completed exam generation"
                      : "Edit configuration"
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>
                    {isRegenerating ? "Regenerating..." : "Edit Config"}
                  </span>
                </button>

                {/* Similarity Report Button */}
                <button
                  onClick={() => {
                    // Use current generation ID from state (updated after config changes)
                    const currentGenerationId = generation?.id || generationId;
                    const similarityUrl = `/course/${courseId}/exams/similarity?examId=${examId}&generationId=${currentGenerationId}${
                      isSidebarAccess ? "&sidebar=true" : ""
                    }`;
                    router.push(similarityUrl);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  <span>Similarity Report</span>
                </button>

                {/* Download & Complete Button */}
                <button
                  onClick={() => setShowCompleteModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Download & Complete</span>
                </button>
              </>
            )}

            {(isGenerating || isLoadingVariantsRef.current) &&
              variants.length === 0 && (
                <div className="text-sm text-gray-600 flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-navy"></div>
                  <span>Loading variants...</span>
                </div>
              )}

            {variants.length === 0 &&
              !isGenerating &&
              !isLoadingVariantsRef.current && (
                <div className="text-sm text-gray-600">
                  No variants generated yet. Use the "Generate Variants" button
                  from the exam view page.
                </div>
              )}
          </div>
        </div>

        {/* Stats - Fixed to show per-variant numbers */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              {variants.length > 0
                ? "Generated Variants"
                : "Available Questions"}
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {variants.length > 0 ? variants.length : exam.questions.length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Questions per Variant
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {variants.length > 0
                ? variants[0].questions.length
                : exam.questions.length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Multiple Choice per Variant
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {variants.length > 0
                ? variants[0].questions.filter(
                    (q) => q.type === QuestionType.MULTIPLE_CHOICE
                  ).length
                : exam.questions.filter(
                    (q) => q.type === QuestionType.MULTIPLE_CHOICE
                  ).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              True/False per Variant
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {variants.length > 0
                ? variants[0].questions.filter(
                    (q) => q.type === QuestionType.TRUE_FALSE
                  ).length
                : exam.questions.filter(
                    (q) => q.type === QuestionType.TRUE_FALSE
                  ).length}
            </p>
          </div>
        </div>

        {/* Variant Configuration Display */}
        {variants.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Configuration Used
              </h3>
              {generation?.status === "COMPLETED" && (
                <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full flex items-center space-x-1">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Completed & Locked</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm items-center">
              <div>
                <span className="font-medium text-gray-700">
                  Variants Generated:
                </span>
                <div className="text-gray-600">
                  {variantConfig.numberOfVariants}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  Question Order:
                </span>
                <div className="text-gray-600">
                  {variantConfig.randomizeQuestionOrder
                    ? "Randomized"
                    : "Fixed"}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">
                  Answer Options:
                </span>
                <div className="text-gray-600">
                  {variantConfig.randomizeOptionOrder ? "Randomized" : "Fixed"}
                </div>
              </div>
              <div>
                <span className="font-medium text-gray-700">True/False:</span>
                <div className="text-gray-600">
                  {variantConfig.randomizeTrueFalseOptions
                    ? "Randomized"
                    : "Fixed"}
                </div>
              </div>
              <div className="flex justify-end">
                <AnswersToggleSwitch
                  checked={showAnswers}
                  onChange={setShowAnswers}
                />
              </div>
            </div>
          </div>
        )}

        {/* Preview Component */}
        <VariationsPreview
          questionLists={
            variants.length > 0
              ? variants.map((variant) => variant.questions)
              : exam.questions.length > 0
              ? [exam.questions]
              : []
          }
          showAnswers={showAnswers}
          title={exam.title}
          courseName={exam.description}
          variantConfig={variantConfig}
        />
      </div>

      {/* Modals */}
      <DownloadAndCompleteModal
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onComplete={handleCompleteExam}
        examTitle={exam.title}
        onDownload={handleDownload}
      />

      <VariantGenerationModal
        isOpen={showEditConfigModal}
        onClose={() => setShowEditConfigModal(false)}
        onGenerate={handleEditConfig}
        examTitle={exam.title}
        totalQuestions={exam.questions?.length || 0}
        initialConfig={{
          numberOfVariants: variantConfig.numberOfVariants,
          randomizeQuestions: variantConfig.randomizeQuestionOrder,
          randomizeOptions: variantConfig.randomizeOptionOrder,
          randomizeTrueFalse: variantConfig.randomizeTrueFalseOptions,
        }}
      />
    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Exam Variations"
      description="Generate and preview exam variations"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="exams">
      {content}
    </CourseLayout>
  );
}

export default function ExamVariationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ExamVariationsContent />
    </Suspense>
  );
}
