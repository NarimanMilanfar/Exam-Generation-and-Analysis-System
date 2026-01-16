import React, { useRef, useEffect } from "react";
import { Question } from "../../../../../../types/course";
import VariationHeader, { ExamHeaderRef } from "./VariationHeader";
import VariationQuestion from "./VariationQuestion";
import { useExamContext } from "../providers/ExamContext";

interface ExamPageProps {
  questionList: Question[];
  title: string;
  courseName?: string;
  version: number;
  showHeader?: boolean;
  startQuestionNumber?: number; // Add starting question number for cross-page numbering
  onHeaderHeightChange?: (height: number) => void;
}

/**
 * ExamPage - A single page of an exam with questions
 *
 * Renders a page-sized container with exam header and questions.
 * Displays the seed in the top-right corner for variant identification.
 *
 * @param props - The component props
 *
 * @example
 * ```tsx
 * <ExamPage
 *   questionList={questions}
 *   title="Midterm Exam"
 *   courseName="Computer Science 101"
 *   version={1}
 *   showHeader={true}
 * />
 * ```
 */
const ExamPage: React.FC<ExamPageProps> = ({
  questionList,
  title,
  courseName,
  version,
  showHeader = true,
  startQuestionNumber = 1,
  onHeaderHeightChange,
}) => {
  const { seed } = useExamContext();
  const headerRef = useRef<ExamHeaderRef>(null);

  // Handle header height changes
  const handleHeaderHeightChange = (height: number) => {
    onHeaderHeightChange?.(height);
  };

  return (
    <div className="bg-white p-12 mb-8 shadow-lg rounded-md w-[210mm] min-h-[297mm] mx-auto relative">
      {/* Seed in top right corner */}
      {seed && seed !== "preview-default" && (
        <div className="absolute top-4 right-4 text-xs text-gray-500">
          {seed}
        </div>
      )}

      {/* Header only shown on first page */}
      {showHeader && (
        <VariationHeader
          ref={headerRef}
          title={title}
          courseName={courseName}
          version={version}
          onHeightChange={handleHeaderHeightChange}
        />
      )}

      <div className="space-y-6">
        {questionList.map((question, questionIndex) => (
          <VariationQuestion
            key={question.id}
            question={question}
            questionIndex={questionIndex}
            globalQuestionNumber={startQuestionNumber + questionIndex}
          />
        ))}
      </div>
    </div>
  );
};

export default ExamPage;
