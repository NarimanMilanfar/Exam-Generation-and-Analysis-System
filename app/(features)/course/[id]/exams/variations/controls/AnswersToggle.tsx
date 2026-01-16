import React from "react";
import { useExamContext } from "../providers/ExamContext";

interface ExamToggleProps {
  className?: string;
  label?: string;
}

/**
 * ExamToggle - A toggle switch component for showing/hiding exam answers
 *
 * Renders a styled toggle switch that controls the showAnswers state in the exam context.
 *
 * @param props - The component props
 * @param props.className - Optional CSS classes
 * @param props.label - Toggle label text
 *
 * @example
 * ```tsx
 * <ExamToggle className="mb-4" label="Show Correct Answers" />
 * ```
 */
const ExamToggle: React.FC<ExamToggleProps> = ({
  className = "",
  label = "Show Answers",
}) => {
  const { showAnswers, toggleShowAnswers } = useExamContext();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={showAnswers}
          onChange={toggleShowAnswers}
          className="sr-only"
          data-testid="show-answers-toggle"
        />
        <div
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showAnswers ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showAnswers ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </div>
        <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
      </label>
    </div>
  );
};

export default ExamToggle;
