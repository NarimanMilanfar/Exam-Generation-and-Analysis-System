"use client";

import { useState, useEffect } from "react";
import { QuestionType } from "../../../../../../../types/course";

// Type definition
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic: string;
  questionBankId: string;
  questionBankName: string;
  points: number;
  options: string[] | string | null; // Can be array (from API) or string (JSON)
  correctAnswer: string;
}

interface QuestionBank {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface QuestionSelectorModalProps {
  isOpen: boolean;
  questionType: QuestionType;
  availableQuestions: Question[];
  questionBanks: QuestionBank[];
  availableDifficulties: string[];
  availableTags: string[];
  availablePoints: number[];
  onSelectQuestion: (question: Question) => void;
  onClose: () => void;
}

export default function QuestionSelectorModal({
  isOpen,
  questionType,
  availableQuestions,
  questionBanks,
  availableDifficulties,
  availableTags: availableTopics,
  availablePoints,
  onSelectQuestion,
  onClose,
}: QuestionSelectorModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedPoints, setSelectedPoints] = useState<number | "">("");
  const [selectedQuestionBankId, setSelectedQuestionBankId] = useState("");
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);

  // Helper function to parse question options
  const parseOptions = (options: string[] | string | null): string[] => {
    if (!options) return [];
    if (Array.isArray(options)) return options; // Already parsed by API
    try {
      return JSON.parse(options); // Parse JSON string
    } catch {
      return [];
    }
  };

  useEffect(() => {
    let result = [...availableQuestions];

    // 1. Filtering problem types（MSQ/TF）
    result = result.filter((q) => q.type === questionType);

    // 2. Question bank filtering
    if (selectedQuestionBankId) {
      result = result.filter(
        (q) => q.questionBankId === selectedQuestionBankId
      );
    }

    // 3. Search keyword filtering
    const query = searchQuery.toLowerCase();
    if (query) {
      result = result.filter(
        (q) =>
          q.text.toLowerCase().includes(query) ||
          q.topic.toLowerCase().includes(query)
      );
    }

    // 4. Difficulty filtering
    if (selectedDifficulty) {
      result = result.filter((q) => q.difficulty === selectedDifficulty);
    }

    // 5. Topic Filtering
    if (selectedTopic) {
      result = result.filter((q) => q.topic === selectedTopic);
    }

    // 6. Score filtering
    if (selectedPoints !== "") {
      result = result.filter((q) => q.points === selectedPoints);
    }

    // 7. Deduplication processing
    const uniqueQuestions = result.reduce<Question[]>((acc, current) => {
      const exists = acc.find((item) => item.id === current.id);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    setFilteredQuestions(uniqueQuestions);
  }, [
    availableQuestions,
    questionType,
    searchQuery,
    selectedDifficulty,
    selectedTopic,
    selectedPoints,
    selectedQuestionBankId,
  ]);

  // reset filter
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedDifficulty("");
    setSelectedTopic("");
    setSelectedPoints("");
    setSelectedQuestionBankId("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            Select a{" "}
            {questionType === QuestionType.MULTIPLE_CHOICE
              ? "Multiple Choice"
              : "True/False"}{" "}
            Question
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search and filter areas */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search questions or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          {/* Show Answers Toggle */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showAnswers ? "bg-green-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showAnswers ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="ml-3 text-sm font-medium text-gray-700">
                Show Answers
              </span>
            </div>
          </div>

          {/* Filter Options - Clearly display Topic filtering */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {" "}
            {/* Changed to 3 columns for better spacing */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question Bank
              </label>
              <select
                value={selectedQuestionBankId}
                onChange={(e) => setSelectedQuestionBankId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="">All Question Banks</option>
                {questionBanks.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="">All Difficulties</option>
                {availableDifficulties.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="">All Topics</option>
                {availableTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points
              </label>
              <select
                value={selectedPoints}
                onChange={(e) =>
                  setSelectedPoints(
                    e.target.value === "" ? "" : parseInt(e.target.value)
                  )
                }
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
              >
                <option value="">All Points</option>
                {availablePoints.map((point) => (
                  <option key={point} value={point}>
                    {point}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {searchQuery ||
          selectedDifficulty ||
          selectedTopic ||
          selectedPoints !== "" ||
          selectedQuestionBankId ? (
            <button
              onClick={resetFilters}
              className="mt-3 text-sm text-brand-navy hover:text-navy-800"
            >
              Reset all filters
            </button>
          ) : null}
        </div>

        {/* Question List - Display Topic */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredQuestions.length > 0 ? (
            <div className="space-y-4">
              {filteredQuestions.map((question) => (
                <div
                  key={question.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-brand-navy hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onSelectQuestion(question)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">
                      {question.text}
                    </h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                      {question.type === QuestionType.MULTIPLE_CHOICE
                        ? "MC"
                        : "T/F"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {question.difficulty}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {question.topic}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      {question.points} pts
                    </span>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    From:{" "}
                    {questionBanks.find((b) => b.id === question.questionBankId)
                      ?.name || question.questionBankName}
                  </div>

                  {/* Show options and correct answer when toggle is on */}
                  {showAnswers && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      {question.type === QuestionType.MULTIPLE_CHOICE ? (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">
                            Options:
                          </p>
                          <div className="space-y-1">
                            {parseOptions(question.options).map(
                              (option, index) => (
                                <div
                                  key={index}
                                  className={`text-sm px-2 py-1 rounded ${
                                    option === question.correctAnswer
                                      ? "bg-green-100 text-green-800 font-medium border border-green-200"
                                      : "bg-gray-50 text-gray-700"
                                  }`}
                                >
                                  {String.fromCharCode(65 + index)}. {option}
                                  {option === question.correctAnswer && (
                                    <span className="ml-2 text-xs font-semibold text-green-600">
                                      ✓ CORRECT
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">
                            Answer:
                          </p>
                          <div className="bg-green-100 text-green-800 font-medium border border-green-200 text-sm px-2 py-1 rounded">
                            {question.correctAnswer} ✓
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No questions found
              </h4>
              <p className="text-gray-600">
                Try adjusting your search criteria
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
