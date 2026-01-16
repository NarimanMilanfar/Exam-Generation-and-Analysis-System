"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import CourseLayout from "../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../components/layouts/SimpleLayout";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";

interface QuestionBank {
  id: string;
  name: string;
  description: string;
  topic?: string;
  color: string;
  courseId: string;
  questionCount: number;
  totalPoints: number;
  questions: Question[];
  createdAt: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: string;
  points: number;
  difficulty?: string;
  topic?: string;
  questionBankId: string;
  createdAt: string;
  updatedAt: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

// Create Question Bank Modal Component
function CreateQuestionBankModal({
  isOpen,
  onClose,
  courseId,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  onSave: (questionBankData: {
    name: string;
    description: string;
    topic: string;
    color: string;
  }) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topic: "",
    color: "#3b82f6",
  });

  const colorOptions = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#ec4899", // pink
    "#6366f1", // indigo
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Please enter a question bank name");
      return;
    }

    onSave(formData);

    // Reset form
    setFormData({
      name: "",
      description: "",
      topic: "",
      color: "#3b82f6",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-brand-navy mb-4">
          Create Question Bank
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Bank Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              placeholder="e.g., Chapter 1 Questions"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              rows={3}
              placeholder="Optional description for this question bank"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic/Subject
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              placeholder="e.g., Algebra, History, Biology"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

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
              Create Question Bank
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Question Bank Modal Component
function EditQuestionBankModal({
  isOpen,
  onClose,
  questionBank,
  onSave,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  questionBank: QuestionBank | null;
  onSave: (questionBankData: {
    id: string;
    name: string;
    description: string;
    topic: string;
    color: string;
  }) => void;
  onDelete: (id: string) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topic: "",
    color: "#3b82f6",
  });

  const colorOptions = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#ec4899", // pink
    "#6366f1", // indigo
  ];

  useEffect(() => {
    if (questionBank) {
      setFormData({
        name: questionBank.name,
        description: questionBank.description || "",
        topic: questionBank.topic || "",
        color: questionBank.color,
      });
    }
  }, [questionBank]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionBank || !formData.name.trim()) {
      toast.error("Please enter a question bank name");
      return;
    }

    onSave({
      id: questionBank.id,
      ...formData,
    });
  };

  const handleDelete = () => {
    if (!questionBank) return;
    onDelete(questionBank.id);
    onClose();
  };

  if (!isOpen || !questionBank) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-brand-navy mb-4">
          Edit Question Bank
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Question Bank Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Topic/Subject
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) =>
                setFormData({ ...formData, topic: e.target.value })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
            >
              Delete
            </button>
            <div className="flex space-x-2">
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
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// Export Questions Modal Component
function ExportQuestionsModal({
  isOpen,
  onClose,
  questionBanks,
  courseId,
}: {
  isOpen: boolean;
  onClose: () => void;
  questionBanks: QuestionBank[];
  courseId: string;
}) {
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuestionBank, setSelectedQuestionBank] = useState<string>("all");
  const [draggedQuestion, setDraggedQuestion] = useState<Question | null>(null);
  const [includeAnswers, setIncludeAnswers] = useState(true);

  // Filter available questions based on search term and selected question bank
  const filteredAvailableQuestions = availableQuestions.filter(question => {
    const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      "";
    const matchesBank = selectedQuestionBank === "all" || question.questionBankId === selectedQuestionBank;
    return matchesSearch && matchesBank;
  });

  // Load all questions from question banks
  useEffect(() => {
    if (isOpen) {
      loadAllQuestions();
    }
  }, [isOpen, questionBanks]);

  const loadAllQuestions = () => {
    const allQuestions: Question[] = [];
    questionBanks.forEach(bank => {
      if (bank.questions) {
        allQuestions.push(...bank.questions);
      }
    });
    setAvailableQuestions(allQuestions);
  };

  const handleDragStart = (e: React.DragEvent, question: Question) => {
    setDraggedQuestion(question);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropToSelected = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedQuestion && !selectedQuestions.find(q => q.id === draggedQuestion.id)) {
      setSelectedQuestions([...selectedQuestions, draggedQuestion]);
      setAvailableQuestions(availableQuestions.filter(q => q.id !== draggedQuestion.id));
    }
    setDraggedQuestion(null);
  };

  const handleDropToAvailable = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedQuestion && !availableQuestions.find(q => q.id === draggedQuestion.id)) {
      setAvailableQuestions([...availableQuestions, draggedQuestion]);
      setSelectedQuestions(selectedQuestions.filter(q => q.id !== draggedQuestion.id));
    }
    setDraggedQuestion(null);
  };

  const moveQuestionToSelected = (question: Question) => {
    if (!selectedQuestions.find(q => q.id === question.id)) {
      setSelectedQuestions([...selectedQuestions, question]);
      setAvailableQuestions(availableQuestions.filter(q => q.id !== question.id));
    }
  };

  const moveQuestionToAvailable = (question: Question) => {
    if (!availableQuestions.find(q => q.id === question.id)) {
      setAvailableQuestions([...availableQuestions, question]);
      setSelectedQuestions(selectedQuestions.filter(q => q.id !== question.id));
    }
  };

  const selectAllQuestions = () => {
    const questionsToMove = filteredAvailableQuestions.filter(
      q => !selectedQuestions.find(selected => selected.id === q.id)
    );
    setSelectedQuestions([...selectedQuestions, ...questionsToMove]);
    setAvailableQuestions(availableQuestions.filter(
      q => !questionsToMove.find(moved => moved.id === q.id)
    ));
  };

  const clearSelectedQuestions = () => {
    setAvailableQuestions([...availableQuestions, ...selectedQuestions]);
    setSelectedQuestions([]);
  };

  const generateDOCX = async () => {
    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question to export");
      return;
    }

    setLoading(true);
    try {
      const children: any[] = [];

      // Header
      children.push(
        new Paragraph({
          text: "Selected Questions Export",
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: `Generated: ${new Date().toLocaleDateString()}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: "" }), // Empty line
        new Paragraph({
          text: `Total Questions: ${selectedQuestions.length}`,
        }),
        new Paragraph({
          text: `Total Points: ${selectedQuestions.reduce((sum, q) => sum + q.points, 0)}`,
        }),
        new Paragraph({ text: "" }) // Empty line
      );

      // Questions following the template format
      selectedQuestions.forEach((question, qIndex) => {
        // Question text with number
        children.push(
          new Paragraph({
            text: `${qIndex + 1}. ${question.text}`,
          })
        );

        // Options for multiple choice questions
        if (question.type === "MULTIPLE_CHOICE") {
          let options = question.options || [];
          
          options.forEach((option: string, optIndex: number) => {
            const label = String.fromCharCode(65 + optIndex); // A, B, C, D
            children.push(
              new Paragraph({
                text: `${label}. ${option}`,
              })
            );
          });

          // Find the correct answer letter
          const correctIndex = options.findIndex((opt: string) => opt === question.correctAnswer);
          const answerLetter = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";
          
          children.push(
            new Paragraph({
              text: includeAnswers ? `Answer: ${answerLetter}` : "Answer: _____",
            })
          );
        } else if (question.type === "TRUE_FALSE") {
          // For True/False questions, show the answer directly
          children.push(
            new Paragraph({
              text: includeAnswers ? `Answer: ${question.correctAnswer}` : "Answer: _____",
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

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: children,
          },
        ],
      });

      const docxBlob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Questions_Export_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Questions exported successfully!");
      onClose();
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error("Failed to generate DOCX file");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">Export Questions</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Export Options */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={includeAnswers}
                onChange={(e) => setIncludeAnswers(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium">Include answer key</span>
            </label>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search questions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
            <select
              value={selectedQuestionBank}
              onChange={(e) => setSelectedQuestionBank(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="all">All Question Banks</option>
              {questionBanks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={selectAllQuestions}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            >
              Select All Filtered
            </button>
            <button
              onClick={clearSelectedQuestions}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Clear Selected
            </button>
            <span className="text-sm text-gray-600">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
            </span>
          </div>
        </div>

        {/* Drag and Drop Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Available Questions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Available Questions</h3>
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[400px] max-h-[400px] overflow-y-auto"
              onDragOver={handleDragOver}
              onDrop={handleDropToAvailable}
            >
              {filteredAvailableQuestions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No questions available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAvailableQuestions.map((question) => (
                    <div
                      key={question.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, question)}
                      onClick={() => moveQuestionToSelected(question)}
                      className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {question.text.length > 100 ? `${question.text.substring(0, 100)}...` : question.text}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{question.type.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{question.points} pts</span>
                            {question.topic && (
                              <>
                                <span>•</span>
                                <span>{question.topic}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestionToSelected(question);
                          }}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected Questions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Selected Questions</h3>
            <div
              className="border-2 border-dashed border-green-300 rounded-lg p-4 min-h-[400px] max-h-[400px] overflow-y-auto bg-green-50"
              onDragOver={handleDragOver}
              onDrop={handleDropToSelected}
            >
              {selectedQuestions.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>Drop questions here or click to select</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, question)}
                      onClick={() => moveQuestionToAvailable(question)}
                      className="p-3 bg-white border border-green-200 rounded-lg shadow-sm cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              {index + 1}
                            </span>
                            <p className="text-sm font-medium text-gray-900">
                              {question.text.length > 80 ? `${question.text.substring(0, 80)}...` : question.text}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{question.type.replace("_", " ")}</span>
                            <span>•</span>
                            <span>{question.points} pts</span>
                            {question.topic && (
                              <>
                                <span>•</span>
                                <span>{question.topic}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveQuestionToAvailable(question);
                          }}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generateDOCX}
            disabled={loading || selectedQuestions.length === 0}
            className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating..." : "Export to DOCX"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CourseQuestionBanksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [editingQuestionBank, setEditingQuestionBank] =
    useState<QuestionBank | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionBankToDelete, setQuestionBankToDelete] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchQuestionBanks();
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, router]);

  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/question-banks?courseId=${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch question banks");
      const data = await response.json();
      setQuestionBanks(data);
    } catch (error) {
      console.error("Error fetching question banks:", error);
      toast.error("Failed to load question banks");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");
      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  const handleCreateQuestionBank = async (questionBankData: {
    name: string;
    description: string;
    topic: string;
    color: string;
  }) => {
    try {
      const response = await fetch("/api/question-banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...questionBankData,
          courseId,
        }),
      });

      if (!response.ok) throw new Error("Failed to create question bank");

      toast.success("Question bank created successfully!");
      setIsCreateModalOpen(false);
      fetchQuestionBanks();
    } catch (error) {
      console.error("Error creating question bank:", error);
      toast.error("Failed to create question bank");
    }
  };

  const handleEditQuestionBank = (questionBank: QuestionBank) => {
    setEditingQuestionBank(questionBank);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (questionBankData: {
    id: string;
    name: string;
    description: string;
    topic: string;
    color: string;
  }) => {
    try {
      const response = await fetch(
        `/api/question-banks/${questionBankData.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: questionBankData.name,
            description: questionBankData.description,
            topic: questionBankData.topic,
            color: questionBankData.color,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update question bank");

      toast.success("Question bank updated successfully!");
      setIsEditModalOpen(false);
      setEditingQuestionBank(null);
      fetchQuestionBanks();
    } catch (error) {
      console.error("Error updating question bank:", error);
      toast.error("Failed to update question bank");
    }
  };

  const handleDeleteQuestionBank = async () => {
    if (!questionBankToDelete) return;

    try {
      const response = await fetch(
        `/api/question-banks/${questionBankToDelete}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) throw new Error("Failed to delete question bank");

      toast.success("Question bank deleted successfully!");
      fetchQuestionBanks();
    } catch (error) {
      console.error("Error deleting question bank:", error);
      toast.error("Failed to delete question bank");
    } finally {
      setDeleteModalOpen(false);
      setQuestionBankToDelete(null);
    }
  };

  const openDeleteModal = (id: string) => {
    setQuestionBankToDelete(id);
    setDeleteModalOpen(true);
  };

  const handleViewQuestionBank = (questionBankId: string) => {
    const url = `/course/${courseId}/question-bank/${questionBankId}${
      isSidebarAccess ? "?sidebar=true" : ""
    }`;
    router.push(url);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingQuestionBank(null);
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Question Banks"
        description="Organize your questions by topic"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="questions" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    return null;
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

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Question Banks</h1>
            <p className="text-gray-600 mt-2">
              Organize your questions by topic or subject area
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
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
              <span>Export Questions</span>
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-brand-navy text-white px-6 py-3 rounded-lg hover:bg-navy-800 transition-colors font-medium flex items-center space-x-2"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Create Question Bank</span>
            </button>
          </div>
        </div>

        {/* Question Banks Grid */}
        {questionBanks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No question banks yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first question bank to start organizing your questions
              by topic.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
            >
              Create Your First Question Bank
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questionBanks.map((questionBank) => (
              <div
                key={questionBank.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex flex-col h-full"
              >
                <div className="p-6 flex flex-col h-full">
                  {/* Header with edit icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: questionBank.color }}
                      ></div>
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {questionBank.name}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleEditQuestionBank(questionBank)}
                      className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
                      title="Edit Question Bank"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Content area - grows to fill space */}
                  <div className="flex-1 flex flex-col">
                    {/* Fixed height area for description */}
                    <div className="h-12 mb-4">
                      {questionBank.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {questionBank.description}
                        </p>
                      )}
                    </div>

                    {/* Topic badge area */}
                    <div className="mb-4 h-6 flex items-start">
                      {questionBank.topic && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {questionBank.topic}
                        </span>
                      )}
                    </div>

                    {/* Stats area */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{questionBank.questionCount} questions</span>
                      <span>{questionBank.totalPoints} points</span>
                    </div>
                  </div>

                  {/* Button area - always at bottom */}
                  <div className="mt-auto">
                    <button
                      onClick={() => handleViewQuestionBank(questionBank.id)}
                      className="w-full bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors text-sm font-medium"
                    >
                      View Questions
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateQuestionBankModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        courseId={courseId}
        onSave={handleCreateQuestionBank}
      />

      <EditQuestionBankModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        questionBank={editingQuestionBank}
        onSave={handleSaveEdit}
        onDelete={openDeleteModal}
      />

      <ExportQuestionsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        questionBanks={questionBanks}
        courseId={courseId}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteQuestionBank}
        title="Delete Question Bank"
        message="Are you sure you want to delete this question bank? All questions in this bank will also be deleted. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Question Banks"
      description="Organize your questions by topic"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="questions">
      {content}
    </CourseLayout>
  );
}
