import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import VariantGenerationModal from "./VariantGenerationModal";

interface ExamData {
  id: string;
  title: string;
  description: string;
  questions: any[];
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

interface GenerateVariantsButtonProps {
  exam: ExamData;
  courseId: string;
  className?: string;
}

/**
 * GenerateVariantsButton Component
 *
 * Opens a configuration modal for generating exam variants.
 * Shows "Generate Variants" or "View Variants" based on active database generations.
 * Handles the generation process and redirects to variations page when complete.
 */
export const GenerateVariantsButton: React.FC<GenerateVariantsButtonProps> = ({
  exam,
  courseId,
  className = "",
}) => {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [hasActiveVariants, setHasActiveVariants] = useState(false);
  const [activeGeneration, setActiveGeneration] = useState<any>(null);

  // Check for active variants on component mount and when exam changes
  useEffect(() => {
    checkActiveVariants();
  }, [exam.id]);

  const checkActiveVariants = async () => {
    try {
      const response = await fetch(`/api/exams/${exam.id}/generations`);
      if (response.ok) {
        const generations = await response.json();
        // Check for active (non-completed) generations
        const activeGenerations = generations.filter((gen: any) => gen.status !== "COMPLETED");
        setHasActiveVariants(activeGenerations.length > 0);
        setActiveGeneration(activeGenerations[0] || null);
      } else {
        setHasActiveVariants(false);
        setActiveGeneration(null);
      }
    } catch (error) {
      console.error("Error checking active variants:", error);
      setHasActiveVariants(false);
      setActiveGeneration(null);
    }
  };

  /**
   * Handles the generation of exam variants
   */
  const handleGenerateVariants = async (config: VariantGenerationConfig) => {
    try {
      // Save generation configuration to database
      const response = await fetch(`/api/exams/${exam.id}/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numberOfVariants: config.numberOfVariants,
          randomizeQuestionOrder: config.randomizeQuestions,
          randomizeOptionOrder: config.randomizeOptions,
          randomizeTrueFalse: config.randomizeTrueFalse,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate variants");
      }

      const result = await response.json();

      // Update button state
      setHasActiveVariants(true);
      setActiveGeneration(result);

      // Show success message
      toast.success(
        `Generated ${config.numberOfVariants} exam variant${
          config.numberOfVariants !== 1 ? "s" : ""
        }!`
      );

      // Navigate to variations page with generation ID
      const variationsUrl = `/course/${courseId}/exams/variations?examId=${exam.id}&generationId=${result.id}&generated=true`;
      router.push(variationsUrl);
    } catch (error) {
      console.error("Error generating variants:", error);
      throw error; // Re-throw to let modal handle the error state
    }
  };

  /**
   * Handles viewing existing variants
   */
  const handleViewVariants = async () => {
    try {
      if (activeGeneration) {
        // Navigate to variations page with the active generation ID
        const variationsUrl = `/course/${courseId}/exams/variations?examId=${exam.id}&generationId=${activeGeneration.id}`;
        router.push(variationsUrl);
      } else {
        // Fallback: just navigate to variations page
        const variationsUrl = `/course/${courseId}/exams/variations?examId=${exam.id}`;
        router.push(variationsUrl);
      }
    } catch (error) {
      console.error("Error loading variants:", error);
      toast.error("Failed to load variants");
    }
  };

  const handleOpenModal = () => {
    if (!exam.questions || exam.questions.length === 0) {
      toast.error(
        "This exam has no questions. Please add questions before generating variants."
      );
      return;
    }
    setShowModal(true);
  };

  const handleButtonClick = () => {
    if (hasActiveVariants) {
      handleViewVariants();
    } else {
      handleOpenModal();
    }
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={!exam.questions || exam.questions.length === 0}
        className={`${className} ${
          !exam.questions || exam.questions.length === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : hasActiveVariants
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-brand-navy hover:bg-navy-800 text-white"
        } px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
      >
        {hasActiveVariants ? (
          <>
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <span>View Variants</span>
          </>
        ) : (
          <>
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            <span>Generate Variants</span>
          </>
        )}
      </button>

      <VariantGenerationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerateVariants}
        examTitle={exam.title}
        totalQuestions={exam.questions?.length || 0}
      />
    </>
  );
};

export default GenerateVariantsButton;
