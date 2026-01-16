import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Question, QuestionType } from "../../../../../../types/course";
import { useExamContext } from "../providers/ExamContext";

interface QuestionItemProps {
  question: Question;
  questionIndex: number;
  globalQuestionNumber?: number; // Add global question number for cross-page numbering
  onHeightChange?: (height: number) => void;
}

export interface QuestionItemRef {
  getHeight: () => number;
  measureHeight: () => void;
}

/**
 * QuestionItem - A component that renders a single exam question with options
 *
 * Displays a question with its options, handles different question types (multiple choice,
 * true/false, short answer), and shows correct answers when enabled in the exam context.
 * Supports height measurement for layout calculations and includes proper accessibility attributes.
 *
 * @param props - The component props
 * @param props.question - Question data including text, type, options, and correct answer
 * @param props.questionIndex - Zero-based index for numbering (displays as index + 1)
 * @param props.onHeightChange - Callback fired when component height changes
 * @param ref - Forwarded ref providing access to height measurement methods
 *
 * @returns JSX element containing the formatted question display
 *
 * @example
 * ```tsx
 * const questionRef = useRef<QuestionItemRef>(null);
 *
 * <QuestionItem
 *   ref={questionRef}
 *   question={questionData}
 *   questionIndex={0}
 *   onHeightChange={(height) => console.log('Height:', height)}
 * />
 * ```
 */
const QuestionItem = forwardRef<QuestionItemRef, QuestionItemProps>(
  ({ question, questionIndex, globalQuestionNumber, onHeightChange }, ref) => {
    const { showAnswers } = useExamContext();
    const containerRef = useRef<HTMLDivElement>(null);

    const parsedOptions =
      typeof question.options === "string"
        ? JSON.parse(question.options)
        : question.options;

    /**
     * Measures the current height of the component and triggers onHeightChange callback
     * @returns The measured height in pixels
     */
    const measureHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.offsetHeight + 10;
        onHeightChange?.(height);
        return height;
      }
      return 0;
    };

    useImperativeHandle(ref, () => ({
      getHeight: () => {
        if (containerRef.current) {
          return containerRef.current.offsetHeight + 10;
        }
        return 0;
      },
      measureHeight,
    }));

    // Measure height when component mounts or when content changes
    useEffect(() => {
      // Use a small delay to ensure the component is fully rendered
      const timer = setTimeout(() => {
        measureHeight();
      }, 0);

      return () => clearTimeout(timer);
    }, [question, showAnswers, parsedOptions]);

    return (
      <div
        className="question-item"
        data-testid="question-item"
        ref={containerRef}
      >
        <div className="flex justify-between items-baseline">
          <p
            className="text-question whitespace-pre-wrap"
            data-testid="question-text"
          >
            {globalQuestionNumber || questionIndex + 1}. {question.text}
          </p>
          <span className="text-points" data-testid="question-points">
            ({question.points} point{question.points !== 1 ? "s" : ""}
            {typeof question.negativePoints === "number" && question.negativePoints < 0 && (
              <>
                , <span className="text-red-500">-{Math.abs(question.negativePoints)} points penalty</span>
              </>
            )}
            )
          </span>
        </div>

        {question.type === QuestionType.MULTIPLE_CHOICE &&
          Array.isArray(parsedOptions) && (
            <div className="mt-3 ml-6 space-y-2">
              {parsedOptions.map((option: string, optIndex: number) => (
                <div
                  key={optIndex}
                  className={`flex items-center p-2 rounded ${
                    showAnswers && option === question.correctAnswer
                      ? "bg-correct-answer"
                      : ""
                  }`}
                  data-testid="option-container"
                >
                  <span
                    className="text-option-label mr-2"
                    data-testid="option-label"
                  >
                    {String.fromCharCode(65 + optIndex)}.
                  </span>
                  <span className="text-option" data-testid="option-text">
                    {option}
                  </span>
                  {showAnswers && option === question.correctAnswer && (
                    <span
                      className="ml-2 text-correct-answer"
                      data-testid="correct-answer-indicator"
                    >
                      ✓ Correct Answer
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

        {question.type === QuestionType.TRUE_FALSE && (
          <div className="mt-3 ml-6 space-y-2">
            {Array.isArray(parsedOptions) && parsedOptions.length > 0 ? (
              // Use the actual options array (supports randomization)
              parsedOptions.map((option: string, optIndex: number) => {
                // For True/False, determine if this is the correct answer
                // Handle A/B format, direct text comparison, and edge cases
                let isCorrect = false;
                if (showAnswers && question.correctAnswer) {
                  const correctAnswer = question.correctAnswer
                    .toString()
                    .trim();

                  // Check if correctAnswer is A/B format
                  if (correctAnswer === "A" || correctAnswer === "B") {
                    // A/B format - check by index
                    const correctIndex = correctAnswer.charCodeAt(0) - 65; // A=0, B=1
                    isCorrect = optIndex === correctIndex;
                  } else {
                    // Direct text comparison (case-insensitive)
                    isCorrect =
                      option.toLowerCase().trim() ===
                      correctAnswer.toLowerCase();
                  }
                }

                return (
                  <div
                    key={optIndex}
                    className={`flex items-center p-2 rounded ${
                      isCorrect ? "bg-correct-answer" : ""
                    }`}
                    data-testid="option-container"
                  >
                    <span
                      className="text-option-label mr-2"
                      data-testid="option-label"
                    >
                      {String.fromCharCode(65 + optIndex)}.
                    </span>
                    <span className="text-option" data-testid="option-text">
                      {option}
                    </span>
                    {isCorrect && (
                      <span
                        className="ml-2 text-correct-answer"
                        data-testid="correct-answer-indicator"
                      >
                        ✓ Correct Answer
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              // Fallback to hardcoded options if no options array
              <>
                <div
                  className={`flex items-center p-2 rounded ${
                    showAnswers &&
                    (question.correctAnswer === "A" ||
                      question.correctAnswer?.toLowerCase().trim() === "true")
                      ? "bg-correct-answer"
                      : ""
                  }`}
                  data-testid="option-container"
                >
                  <span
                    className="text-option-label mr-2"
                    data-testid="option-label"
                  >
                    A.
                  </span>
                  <span className="text-option" data-testid="option-text">
                    True
                  </span>
                  {showAnswers &&
                    (question.correctAnswer === "A" ||
                      question.correctAnswer?.toLowerCase().trim() ===
                        "true") && (
                      <span
                        className="ml-2 text-correct-answer"
                        data-testid="correct-answer-indicator"
                      >
                        ✓ Correct Answer
                      </span>
                    )}
                </div>
                <div
                  className={`flex items-center p-2 rounded ${
                    showAnswers &&
                    (question.correctAnswer === "B" ||
                      question.correctAnswer?.toLowerCase().trim() === "false")
                      ? "bg-correct-answer"
                      : ""
                  }`}
                  data-testid="option-container"
                >
                  <span
                    className="text-option-label mr-2"
                    data-testid="option-label"
                  >
                    B.
                  </span>
                  <span className="text-option" data-testid="option-text">
                    False
                  </span>
                  {showAnswers &&
                    (question.correctAnswer === "B" ||
                      question.correctAnswer?.toLowerCase().trim() ===
                        "false") && (
                      <span
                        className="ml-2 text-correct-answer"
                        data-testid="correct-answer-indicator"
                      >
                        ✓ Correct Answer
                      </span>
                    )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

QuestionItem.displayName = "QuestionItem";

export default QuestionItem;
