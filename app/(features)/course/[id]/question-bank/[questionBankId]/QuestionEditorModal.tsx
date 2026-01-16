"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: string;
  points: number;
  difficulty?: string; // EASY, MEDIUM, HARD
  topic?: string;
  courseId: string | null;
  questionBankId: string;
  createdAt?: string;
  updatedAt?: string;
  negativePoints?: number | null; 
}

interface QuestionBankOption {
  id: string;
  name: string;
  color: string;
}

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  courseId: string;
  questionBankId: string;
  initialQuestion?: Question | null;
  onSave: (questionData: Question | Omit<Question, "id">) => void;
  title?: string;
  saveButtonText?: string;
}

export default function QuestionEditorModal({
  isOpen,
  onClose,
  mode,
  courseId,
  questionBankId,
  initialQuestion,
  onSave,
  title = mode === "add" ? "Add New Question" : "Edit Question",
  saveButtonText = mode === "add" ? "Add Question" : "Save Changes",
}: QuestionEditorModalProps) {
const [formData, setFormData] = useState<{
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
  points: number;
  negativePoints: number | null;
  difficulty: string;
  topic: string;
  questionBankId: string;
  enableNegative: boolean;
}>({
  text: "",
  type: "MULTIPLE_CHOICE",
  options: ["", "", "", ""],
  correctAnswer: "",
  points: 1,
  negativePoints: null,
  difficulty: "MEDIUM",
  topic: "",
  questionBankId: questionBankId,
  enableNegative: false,
});

  const [questionBanks, setQuestionBanks] = useState<QuestionBankOption[]>([]);
  const [loadingQuestionBanks, setLoadingQuestionBanks] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchQuestionBanks();
    }
  }, [isOpen, courseId]);

  useEffect(() => {
    if (initialQuestion) {
      const options = Array.isArray(initialQuestion.options) 
        ? [...initialQuestion.options] 
        : [];
      
      while (options.length < 4) {
        options.push("");
      }

      setFormData({
        text: initialQuestion.text,
        type: initialQuestion.type,
        options: options,
        correctAnswer: initialQuestion.correctAnswer,
        points: initialQuestion.points,
        negativePoints: initialQuestion.negativePoints ?? null,
        difficulty: initialQuestion.difficulty || "MEDIUM",
        topic: initialQuestion.topic || "",
        questionBankId: initialQuestion.questionBankId,
        enableNegative: initialQuestion.negativePoints !== null,
      });
    } else {
      setFormData({
        text: "",
        type: "MULTIPLE_CHOICE",
        options: ["", "", "", ""],
        correctAnswer: "",
        points: 1,
        negativePoints: null,
        difficulty: "MEDIUM",
        topic: "",
        questionBankId: questionBankId,
        enableNegative: false,
      });
    }
  }, [initialQuestion, questionBankId, isOpen]);

  const fetchQuestionBanks = async () => {
    try {
      setLoadingQuestionBanks(true);
      const response = await fetch(`/api/question-banks?courseId=${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch question banks");
      const data = await response.json();
      setQuestionBanks(
        data.map((qb: any) => ({
          id: qb.id,
          name: qb.name,
          color: qb.color,
        }))
      );
    } catch (error) {
      console.error("Error fetching question banks:", error);
      toast.error("Failed to load question banks");
    } finally {
      setLoadingQuestionBanks(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "points" ? parseInt(value) || 1 : value,
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData((prev) => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 1) {
      toast.error("At least one option is required");
      return;
    }
    
    const newOptions = [...formData.options];
    newOptions.splice(index, 1);
    
    setFormData(prev => {
      // If we're removing the correct answer, reset it
      const correctAnswer = prev.correctAnswer === prev.options[index] ? "" : prev.correctAnswer;
      return { ...prev, options: newOptions, correctAnswer };
    });
  };

  const validateForm = () => {
    if (!formData.text.trim()) {
      toast.error("Please enter the question text");
      return false;
    }

    if (formData.type === "MULTIPLE_CHOICE") {
      const filledOptions = formData.options.filter(opt => opt.trim() !== "");
      
      if (filledOptions.length < 2) {
        toast.error("At least two options are required");
        return false;
      }

      // Check for duplicate options
      const uniqueOptions = new Set(filledOptions.map(opt => opt.toLowerCase().trim()));
      if (uniqueOptions.size !== filledOptions.length) {
        toast.error("Options cannot be duplicate");
        return false;
      }

      if (!formData.correctAnswer) {
        toast.error("Please select the correct answer");
        return false;
      }

      if (!filledOptions.includes(formData.correctAnswer)) {
        toast.error("Correct answer must be one of the provided options");
        return false;
      }
    } else if (formData.type === "TRUE_FALSE") {
      if (!["True", "False"].includes(formData.correctAnswer)) {
        toast.error("Please select either True or False as the correct answer");
        return false;
      }
    }

    if (formData.points <= 0) {
      toast.error("Points must be a positive number");
      return false;
    }

    if (formData.enableNegative && formData.negativePoints && formData.negativePoints >= 0) {
      toast.error("Negative points must be a negative number");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const questionData = {
      ...(initialQuestion ? { id: initialQuestion.id } : {}),
      text: formData.text,
      type: formData.type,
      options: formData.type === "MULTIPLE_CHOICE" 
        ? formData.options.filter(opt => opt.trim() !== "")
        : [],
      correctAnswer: formData.correctAnswer,
      points: formData.points,
      difficulty: formData.difficulty,
      topic: formData.topic,
      courseId,
      questionBankId: formData.questionBankId,
      negativePoints: formData.enableNegative ? formData.negativePoints : null,
    };

    onSave(questionData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-brand-navy mb-4">{title}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Text *
            </label>
            <textarea
              name="text"
              value={formData.text}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              rows={3}
              placeholder="Enter your question"
              required
            />
          </div>

          {/* Question Type and Points */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Type
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={(e) => {
                  handleInputChange(e);
                  // Reset correct answer when type changes
                  setFormData(prev => ({ ...prev, correctAnswer: "" }));
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                <option value="TRUE_FALSE">True/False</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Points *
              </label>
              <input
                type="number"
                name="points"
                min="1"
                value={formData.points}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              />
            </div>
          </div>

          {/* Negative Points */}
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              id="enableNegative"
              checked={formData.enableNegative}
              onChange={(e) =>
                setFormData({ ...formData, enableNegative: e.target.checked })
              }
            />
            <label htmlFor="enableNegative" className="text-sm text-gray-700">
              Enable Negative Marking
            </label>
          </div>
          {formData.enableNegative && (
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Negative Points
              </label>
              <input
                type="number"
                step="0.1"
                max="0"
                name="negativePoints"
                value={formData.negativePoints ?? ""}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  setFormData({
                    ...formData,
                    negativePoints: isNaN(parsed) ? null : parsed,
                  });
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="e.g. -1"
              />
            </div>
          )}

          {/* Difficulty and Topic */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic
              </label>
              <input
                type="text"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                placeholder="e.g., Algebra, History, etc."
              />
            </div>
          </div>

          {/* Question Bank Selection (only for edit mode) */}
          {initialQuestion && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Question Bank
              </label>
              <select
                name="questionBankId"
                value={formData.questionBankId}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                disabled={loadingQuestionBanks}
              >
                {loadingQuestionBanks ? (
                  <option>Loading question banks...</option>
                ) : (
                  questionBanks.map((qb) => (
                    <option key={qb.id} value={qb.id}>
                      {qb.name}
                    </option>
                  ))
                )}
              </select>
              {formData.questionBankId !== questionBankId && (
                <p className="text-sm text-orange-600 mt-1">
                  ⚠️ This question will be moved to a different question bank when saved.
                </p>
              )}
            </div>
          )}

          {/* Answer Options - Multiple Choice */}
          {formData.type === "MULTIPLE_CHOICE" && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Answer Options *
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={addOption}
                    className="text-sm text-brand-navy hover:text-navy-800 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Option
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600 w-6">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                    />
                    <input
                      type="radio"
                      name="correctAnswer"
                      value={option}
                      checked={formData.correctAnswer === option}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          correctAnswer: e.target.value,
                        })
                      }
                      className="text-brand-navy"
                      disabled={!option.trim()}
                    />
                    {formData.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700 p-1 transition-colors"
                        title="Remove option"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select the radio button next to the correct answer.
              </p>
            </div>
          )}

          {/* True/False Options */}
          {formData.type === "TRUE_FALSE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer *
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value="True"
                    checked={formData.correctAnswer === "True"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        correctAnswer: e.target.value,
                      })
                    }
                    className="text-brand-navy mr-2"
                  />
                  True
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    value="False"
                    checked={formData.correctAnswer === "False"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        correctAnswer: e.target.value,
                      })
                    }
                    className="text-brand-navy mr-2"
                  />
                  False
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800"
            >
              {saveButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}