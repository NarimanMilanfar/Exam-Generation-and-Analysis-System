"use client";

import React, { useState } from "react";

interface Question {
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options?: string[];
  correctAnswer: string;
  points: number;
  negativePoints?: number | null;
  topic?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}

interface DocxUploaderModalProps {
  courseId: string;
  questionBankId: string;
  onClose: (success?: boolean) => void;
  onUploadSuccess: () => void;
}

export default function DocxUploaderModal({
  courseId,
  questionBankId,
  onClose,
  onUploadSuccess,
}: DocxUploaderModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedQuestion, setEditedQuestion] = useState<Question | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files ? e.target.files[0] : null;
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith(".docx")) {
      setError("Please select a DOCX file");
      return;
    }
    setFile(selectedFile);
    setError(null);

    // Auto-parse the DOCX file immediately after selection
    if (selectedFile) {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("questionBankId", questionBankId);

      fetch(`/api/question-banks/${questionBankId}/docx-upload`, {
        method: "POST",
        body: formData,
      })
        .then(async (res) => {
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Upload failed");
          }
          return res.json();
        })
        .then((data) => {
          if (!data.questions || data.questions.length === 0) {
            throw new Error("No questions were parsed from the file");
          }

          setQuestions(data.questions);
          setSuccess(true);
        })
        .catch((e: any) => {
          setError(e.message || "Error occurred while parsing the file");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  };

  const saveToDatabase = async () => {
    if (questions.length === 0) {
      setError("No questions to save");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/question-banks/${questionBankId}/docx-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "save",
            questions: questions.map((q) => ({
              text: q.text,
              type: q.type,
              options: q.options,
              correctAnswer: q.correctAnswer,
              points: q.points || 1,
              negativePoints: q.negativePoints ?? undefined,
              questionBankId: questionBankId,
            })),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Save failed");
      }

      const data = await res.json();
      onUploadSuccess();
      onClose(true);
    } catch (e: any) {
      setError(e.message || "Error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditedQuestion({ ...questions[index] });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editedQuestion) return;

    const newQuestions = [...questions];
    newQuestions[editingIndex] = editedQuestion;
    setQuestions(newQuestions);
    cancelEdit();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditedQuestion(null);
  };

  const handleQuestionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editedQuestion) return;
    setEditedQuestion({ ...editedQuestion, text: e.target.value });
  };

  const handleOptionChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    optionIndex: number
  ) => {
    if (!editedQuestion || !editedQuestion.options) return;
    const newOptions = [...editedQuestion.options];
    newOptions[optionIndex] = e.target.value;
    setEditedQuestion({ ...editedQuestion, options: newOptions });
  };

  const handleCorrectAnswerChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    if (!editedQuestion) return;
    setEditedQuestion({ ...editedQuestion, correctAnswer: e.target.value });
  };

  const addOption = () => {
    if (!editedQuestion || !editedQuestion.options) return;
    if (editedQuestion.options.length >= 6) {
      setError("Maximum 6 options allowed");
      return;
    }
    setEditedQuestion({
      ...editedQuestion,
      options: [...editedQuestion.options, ""],
    });
  };

  const removeOption = (optionIndex: number) => {
    if (!editedQuestion || !editedQuestion.options) return;
    if (editedQuestion.options.length <= 2) {
      setError("Minimum 2 options required");
      return;
    }
    const newOptions = editedQuestion.options.filter(
      (_, i) => i !== optionIndex
    );
    setEditedQuestion({
      ...editedQuestion,
      options: newOptions,
      correctAnswer: newOptions.includes(editedQuestion.correctAnswer)
        ? editedQuestion.correctAnswer
        : "",
    });
  };

  const deleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#002144] text-white px-6 py-4">
          <h2 className="text-lg font-semibold">
            Bulk Upload Questions from DOCX
          </h2>
          <button
            onClick={() => onClose()}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close modal"
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

        <div className="p-6 max-h-[80vh] overflow-auto">
          {/* File Upload Section */}
          {!success && (
            <div className="mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Choose DOCX file to upload
                      </span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        accept=".docx"
                        className="sr-only"
                        onChange={handleFileChange}
                      />
                      <span className="mt-2 block text-sm text-gray-500">
                        Supports .docx files up to 10MB
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {file && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Selected file:{" "}
                    <span className="font-medium">{file.name}</span>
                  </p>
                  {loading && (
                    <div className="mt-2 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm text-blue-600">
                        Processing file...
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Removed Parse Questions button */}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Questions Display */}
          {success && questions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Parsed Questions ({questions.length})
                </h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSuccess(false);
                      setQuestions([]);
                      setFile(null);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Upload Another File
                  </button>
                  <button
                    onClick={saveToDatabase}
                    disabled={loading}
                    className="bg-[#002144] hover:bg-[#003366] text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Saving..." : "Save All Questions"}
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    {editingIndex === index ? (
                      // Edit Mode
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Question Text
                          </label>
                          <textarea
                            value={editedQuestion?.text || ""}
                            onChange={handleQuestionChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                            rows={3}
                          />
                        </div>

                        {editedQuestion?.type === "MULTIPLE_CHOICE" &&
                          editedQuestion.options && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Options
                              </label>
                              <div className="space-y-2">
                                {editedQuestion.options.map(
                                  (option, optIndex) => (
                                    <div
                                      key={optIndex}
                                      className="flex items-center space-x-2"
                                    >
                                      <span className="w-6 text-sm font-medium text-gray-600">
                                        {String.fromCharCode(65 + optIndex)}.
                                      </span>
                                      <input
                                        type="text"
                                        value={option}
                                        onChange={(e) =>
                                          handleOptionChange(e, optIndex)
                                        }
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                                      />
                                      <button
                                        onClick={() => removeOption(optIndex)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>
                              <button
                                onClick={addOption}
                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
                              >
                                + Add Option
                              </button>
                            </div>
                          )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer
                          </label>
                          {editedQuestion?.type === "MULTIPLE_CHOICE" ? (
                            <select
                              value={editedQuestion.correctAnswer}
                              onChange={handleCorrectAnswerChange}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                            >
                              <option value="">Select correct answer</option>
                              {editedQuestion.options?.map(
                                (option, optIndex) => (
                                  <option key={optIndex} value={option}>
                                    {String.fromCharCode(65 + optIndex)}.{" "}
                                    {option}
                                  </option>
                                )
                              )}
                            </select>
                          ) : (
                            <select
                              value={editedQuestion?.correctAnswer || ""}
                              onChange={handleCorrectAnswerChange}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                            >
                              <option value="">Select correct answer</option>
                              <option value="TRUE">True</option>
                              <option value="FALSE">False</option>
                            </select>
                          )}
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="bg-brand-navy text-white px-2 py-1 rounded-full text-sm font-medium">
                              Q{index + 1}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-sm font-medium ${
                                question.type === "MULTIPLE_CHOICE"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {question.type.replace("_", " ")}
                            </span>
                            {question.negativePoints &&
                              question.negativePoints < 0 && (
                                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                                  Enable Negative Marking
                                </span>
                              )}
                            <span className="text-gray-500 text-sm">
                              {question.points} point
                              {question.points !== 1 ? "s" : ""}
                              {question.negativePoints &&
                                question.negativePoints < 0 && (
                                  <span className="ml-2 text-red-600">
                                    ({question.negativePoints} points)
                                  </span>
                                )}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => startEditing(index)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteQuestion(index)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        <p className="text-gray-900 font-medium mb-2">
                          {question.text}
                        </p>

                        {question.type === "MULTIPLE_CHOICE" &&
                          question.options && (
                            <div className="ml-4 space-y-1">
                              {question.options.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={`text-sm ${
                                    option === question.correctAnswer
                                      ? "text-green-700 font-medium"
                                      : "text-gray-600"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}. {option}
                                  {option === question.correctAnswer && " ✓"}
                                </div>
                              ))}
                            </div>
                          )}

                        {question.type === "TRUE_FALSE" && (
                          <div className="ml-4">
                            <span className="text-sm text-green-700 font-medium">
                              Correct Answer: {question.correctAnswer}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Template Download Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">
                  Need help formatting your questions?
                </h4>
                <p className="text-sm text-gray-500">
                  Download our template to see the correct format
                </p>
              </div>
              <button
                onClick={() => {
                  // Open format guide in new tab
                  window.open("/templates/question-format-guide.txt", "_blank");
                }}
                className="bg-[#002144] hover:bg-[#003366] text-white px-4 py-2 rounded-lg transition-colors"
              >
                View Format Guide
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
