import React, { useState, useMemo, useRef, useEffect } from "react";
import { Question } from "../../../../../../types/course";
import { ExamVariationConfig } from "../../../../../../lib/examVariations";
import VariationDisplay from "./VariationDisplay";
import VariationQuestion, { QuestionItemRef } from "./VariationQuestion";
import { ExamProvider, useExamContext } from "../providers/ExamContext";
import VariationHeader, { ExamHeaderRef } from "./VariationHeader";

interface QuestionListsPreviewProps {
  questionLists: Question[][];
  showAnswers?: boolean;
  title?: string;
  courseName?: string;
  variantConfig?: ExamVariationConfig;
}

// Constants for page layout (8.5" x 11" at 96 DPI)
// can add more page size later. into a better container.
const PAGE_HEIGHT = 1056; // 11 inches * 96 DPI
const PAGE_WIDTH = 816; // 8.5 inches * 96 DPI
const HEADER_HEIGHT = 120; // Estimated space for header
const AVAILABLE_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT;

/**
 * QuestionListsPreview - A comprehensive exam preview component
 *
 * Displays exam variants with pagination, navigation controls, and proper page sizing.
 * Handles multiple question variants, page breaks, and answer visibility.
 *
 * @param props - The component props
 *
 * @example
 * ```tsx
 * <QuestionListsPreview
 *   questionLists={[variant1Questions, variant2Questions]}
 *   showAnswers={false}
 *   title="Final Exam"
 *   courseName="Computer Science 101"
 *   variantConfig={{ seed: "exam-123" }}
 * />
 * ```
 */
const QuestionListsPreview: React.FC<QuestionListsPreviewProps> = ({
  questionLists,
  showAnswers = false,
  title = "Exam Preview",
  courseName,
  variantConfig,
}) => {
  return (
    <ExamProvider
      initialShowAnswers={showAnswers}
      initialSeed={variantConfig?.seed || "preview-default"}
    >
      <QuestionListsPreviewContent
        questionLists={questionLists}
        showAnswers={showAnswers}
        title={title}
        courseName={courseName}
        variantConfig={variantConfig}
      />
    </ExamProvider>
  );
};

/**
 * QuestionListsPreviewContent - Internal content component for exam preview
 *
 * Handles the actual rendering logic, pagination, height calculations, and navigation
 * for the exam preview. This is the main implementation wrapped by the provider.
 *
 * @param props - Same props as QuestionListsPreview
 */
const QuestionListsPreviewContent: React.FC<QuestionListsPreviewProps> = ({
  questionLists,
  showAnswers = false,
  title = "Exam Preview",
  courseName,
  variantConfig,
}) => {
  const { setSeed, setShowAnswers } = useExamContext();
  const [currentVariant, setCurrentVariant] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [questionHeights, setQuestionHeights] = useState<{
    [key: string]: number;
  }>({});
  const [headerHeight, setHeaderHeight] = useState(120); // Default header height
  const containerRef = useRef<HTMLDivElement>(null);
  const questionRefs = useRef<{ [key: string]: QuestionItemRef | null }>({});

  // Update seed in context when variantConfig changes
  useEffect(() => {
    if (variantConfig?.seed && variantConfig.seed !== "preview-default") {
      setSeed(variantConfig.seed);
    }
  }, [variantConfig?.seed, setSeed]);

  // Update showAnswers in context when prop changes
  useEffect(() => {
    setShowAnswers(showAnswers);
  }, [showAnswers, setShowAnswers]);

  // Handle height changes from QuestionItem components
  const handleQuestionHeightChange = (questionId: string, height: number) => {
    setQuestionHeights((prev) => ({
      ...prev,
      [questionId]: height + 20, // Add buffer space
    }));
  };

  // Handle header height changes
  const handleHeaderHeightChange = (height: number) => {
    setHeaderHeight(height);
  };

  // Create a measurement component for height calculation
  const QuestionHeightMeasurer: React.FC<{
    question: Question;
    questionIndex: number;
  }> = ({ question, questionIndex }) => {
    const questionRef = useRef<QuestionItemRef>(null);

    useEffect(() => {
      // Store the ref for later access
      questionRefs.current[question.id] = questionRef.current;
    }, [question.id]);

    return (
      <div
        style={{
          position: "absolute",
          visibility: "hidden",
          width: `${PAGE_WIDTH - 64}px`,
        }}
      >
        <VariationQuestion
          ref={questionRef}
          question={question}
          questionIndex={questionIndex}
          onHeightChange={(height) =>
            handleQuestionHeightChange(question.id, height)
          }
        />
      </div>
    );
  };

  // Create a measurement component for header height calculation
  const HeaderHeightMeasurer: React.FC = () => {
    const headerRef = useRef<ExamHeaderRef>(null);

    return (
      <div
        style={{
          position: "absolute",
          visibility: "hidden",
          width: `${PAGE_WIDTH - 64}px`,
        }}
      >
        <VariationHeader
          ref={headerRef}
          title={title}
          courseName={courseName}
          version={1}
          onHeightChange={handleHeaderHeightChange}
        />
      </div>
    );
  };

  // Calculate heights for all questions using the measurement component
  useEffect(() => {
    if (!questionLists || !Array.isArray(questionLists)) {
      setQuestionHeights({});
      return;
    }

    // Clear previous refs
    questionRefs.current = {};

    // The heights will be calculated by the QuestionHeightMeasurer components
    // and stored in questionHeights state via handleQuestionHeightChange
  }, [questionLists, showAnswers]);

  // Split each variant's questions into pages with question number tracking
  const variantPages = useMemo(() => {
    if (!questionLists || questionLists.length === 0) {
      return [];
    }

    return questionLists.map((variantQuestions) => {
      const pages: { questions: Question[]; startQuestionNumber: number }[] =
        [];
      let currentPageQuestions: Question[] = [];
      let currentHeight = 0;
      let isFirstPage = true;
      let questionNumber = 1; // Track global question number

      for (const question of variantQuestions) {
        const questionHeight = questionHeights[question.id] || 150;

        const availableHeightForCurrentPage = isFirstPage
          ? AVAILABLE_HEIGHT - headerHeight
          : AVAILABLE_HEIGHT;

        if (
          currentHeight + questionHeight > availableHeightForCurrentPage &&
          currentPageQuestions.length > 0
        ) {
          // Start new page
          const startNumber = questionNumber - currentPageQuestions.length;
          pages.push({
            questions: [...currentPageQuestions],
            startQuestionNumber: startNumber,
          });
          currentPageQuestions = [question];
          currentHeight = questionHeight;
          isFirstPage = false;
        } else {
          currentPageQuestions.push(question);
          currentHeight += questionHeight;
        }
        questionNumber++;
      }

      if (currentPageQuestions.length > 0) {
        const startNumber = questionNumber - currentPageQuestions.length;
        pages.push({
          questions: currentPageQuestions,
          startQuestionNumber: startNumber,
        });
      }

      return pages.length > 0
        ? pages
        : [{ questions: [], startQuestionNumber: 1 }];
    });
  }, [questionLists, questionHeights, headerHeight]);

  const currentVariantPages = variantPages[currentVariant] || [];
  const totalVariants = questionLists?.length || 0;
  const totalPagesInCurrentVariant = currentVariantPages.length;

  if (!questionLists || questionLists.length === 0) {
    return (
      <div
        className="flex items-center justify-center p-8 text-body"
        data-testid="empty-state"
      >
        No question lists to preview.
      </div>
    );
  }

  // Render hidden measurement components for height calculation
  const measurementComponents = questionLists.flatMap(
    (variantQuestions, variantIndex) =>
      variantQuestions.map((question, questionIndex) => (
        <QuestionHeightMeasurer
          key={`measure-v${variantIndex}-${question.id}-${questionIndex}`}
          question={question}
          questionIndex={questionIndex}
        />
      ))
  );

  const goToVariant = (variantIndex: number) => {
    if (variantIndex >= 0 && variantIndex < totalVariants) {
      setCurrentVariant(variantIndex);
      setCurrentPage(1); // Reset to first page of new variant
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPagesInCurrentVariant) {
      setCurrentPage(page);
    }
  };

  const nextVariant = () => goToVariant(currentVariant + 1);
  const prevVariant = () => goToVariant(currentVariant - 1);
  const nextPage = () => goToPage(currentPage + 1);
  const prevPage = () => goToPage(currentPage - 1);

  return (
    <div className="bg-gray-100 p-8 font-sans">
      {/* Hidden measurement components for height calculation */}
      <div style={{ position: "absolute", left: "-9999px", top: "-9999px" }}>
        {measurementComponents}
        <HeaderHeightMeasurer />
      </div>

      {/* Variant and Page Navigation */}
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-4">
          <button
            onClick={prevVariant}
            disabled={currentVariant === 0}
            className="px-3 py-1 text-sm bg-brand-navy text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-navy/90 transition-colors"
          >
            Previous Variant
          </button>
          <span className="text-sm text-gray-600">
            Variant {currentVariant + 1} of {totalVariants}
          </span>
          <button
            onClick={nextVariant}
            disabled={currentVariant === totalVariants - 1}
            className="px-3 py-1 text-sm bg-brand-navy text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-navy/90 transition-colors"
          >
            Next Variant
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Previous Page
          </button>
          <span className="text-sm text-gray-600">
            Page {currentPage} of {totalPagesInCurrentVariant}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPagesInCurrentVariant}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
          >
            Next Page
          </button>
        </div>
      </div>

      {/* Variant Document with strict 8.5x11 constraint */}
      <div className="flex justify-center">
        <div
          ref={containerRef}
          className="bg-white shadow-lg relative overflow-hidden"
          style={{
            width: `${PAGE_WIDTH}px`,
            height: `${PAGE_HEIGHT}px`,
            maxHeight: `${PAGE_HEIGHT}px`,
          }}
        >
          {currentVariantPages[currentPage - 1] ? (
            <div className="h-full overflow-hidden">
              <VariationDisplay
                questionList={currentVariantPages[currentPage - 1].questions}
                title={title}
                courseName={courseName}
                version={currentVariant + 1}
                showHeader={currentPage === 1}
                startQuestionNumber={
                  currentVariantPages[currentPage - 1].startQuestionNumber
                }
                onHeaderHeightChange={handleHeaderHeightChange}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No questions on this page.
            </div>
          )}

          {/* Page Number */}
          <div className="absolute bottom-4 right-4 text-sm text-gray-500">
            {currentPage}
          </div>
        </div>
      </div>

      {/* Page Break Indicator */}
      {currentPage < totalPagesInCurrentVariant && (
        <div className="text-center mt-4 text-sm text-gray-500">
          Page {currentPage} of {totalPagesInCurrentVariant} in Variant{" "}
          {currentVariant + 1}
        </div>
      )}

      {/* Variant Summary */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          Viewing Variant {currentVariant + 1} of {totalVariants}
        </p>
        <p>
          This variant has {totalPagesInCurrentVariant} page
          {totalPagesInCurrentVariant !== 1 ? "s" : ""}
        </p>
        <p>Page size: 8.5" × 11" (standard letter size)</p>
        <p>
          Header height: {headerHeight}px, Available for questions:{" "}
          {AVAILABLE_HEIGHT}px
        </p>
      </div>
    </div>
  );
};

export default QuestionListsPreview;
