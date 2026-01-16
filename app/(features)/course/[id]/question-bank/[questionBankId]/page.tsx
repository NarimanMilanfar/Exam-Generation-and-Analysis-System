"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";
import ConfirmationModal from "../../../../../components/shared/ConfirmationModal";
import DocxUploaderModal from "./DocxUploaderModal";
import QuestionEditorModal from "./QuestionEditorModal";

// interface definition
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

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface QuestionBank {
  id: string;
  name: string;
  description: string;
  topic?: string;
  color: string;
  courseId: string;
  questions: Question[];
  totalPoints: number;
  questionCount: number;
  createdAt: string;
}

export default function QuestionBankDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const questionBankId = params.questionBankId as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [questionBank, setQuestionBank] = useState<QuestionBank | null>(null);
  const [filters, setFilters] = useState({
    keyword: "",
    type: "",
    difficulty: "",
  });
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditorModalOpen, setIsEditorModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [showDocxUploader, setShowDocxUploader] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add"); // New modal box mode status has been added

  useEffect(() => {
    if (status === "authenticated") {
      fetchQuestionBank();
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, questionBankId, router]);

  // Get details of the question bank
  const fetchQuestionBank = async () => {
    try {
      const response = await fetch(`/api/question-banks/${questionBankId}`);
      if (!response.ok) throw new Error("Failed to fetch question bank");
      const data = await response.json();

      const questionsWithParsedOptions = data.questions.map((q: any) => ({
        ...q,
        options:
          typeof q.options === "string" ? JSON.parse(q.options) : q.options,
        createdAt: new Date(q.createdAt).toISOString(),
        updatedAt: new Date(q.updatedAt).toISOString(),
      }));

      setQuestionBank({
        ...data,
        questions: questionsWithParsedOptions,
      });
      setQuestions(questionsWithParsedOptions);
      setFilteredQuestions(questionsWithParsedOptions);
    } catch (error) {
      console.error("Error fetching question bank:", error);
      toast.error("Failed to load question bank");
      router.push(
        `/course/${courseId}/question-bank${
          isSidebarAccess ? "?sidebar=true" : ""
        }`
      );
    }
  };

  // Get course information
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

  // Screen questions based on keywords, types and difficulty levels
  useEffect(() => {
    let filtered = questions;

    if (filters.keyword) {
      filtered = filtered.filter((question) =>
        question.text.toLowerCase().includes(filters.keyword.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter((question) => question.type === filters.type);
    }

    if (filters.difficulty) {
      filtered = filtered.filter((question) => question.difficulty === filters.difficulty);
    }

    setFilteredQuestions(filtered);
  }, [questions, filters]);

  // Open the "Add Question Mode" box
  const handleOpenAddModal = () => {
    setModalMode("add");
    setIsEditorModalOpen(true);
    setEditingQuestion(null);
  };

  // Open the "Edit Title Modal Box"
  const handleEditQuestion = (question: Question) => {
    setModalMode("edit");
    setIsEditorModalOpen(true);
    setEditingQuestion(question);
  };

  // Save the title (add or edit)
  const handleSaveQuestion = async (questionData: Question | Omit<Question, "id">) => {
    try {
      let response;
      
      if (modalMode === "add") {
        // add new question
        response = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionData),
        });
      } else {
        // edit question
        response = await fetch(`/api/questions/${(questionData as Question).id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(questionData),
        });
      }

      if (!response.ok) throw new Error(`Failed to ${modalMode} question`);

      toast.success(`Question ${modalMode === "add" ? "added" : "updated"} successfully!`);
      setIsEditorModalOpen(false);
      fetchQuestionBank(); // refresh question
    } catch (error) {
      console.error(`Error ${modalMode}ing question:`, error);
      toast.error(`Failed to ${modalMode} question`);
    }
  };

  // delete question
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;

    try {
      const response = await fetch(`/api/questions/${questionToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete question");

      toast.success("Question deleted successfully!");
      fetchQuestionBank(); // refresh question
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    } finally {
      setDeleteModalOpen(false);
      setQuestionToDelete(null);
    }
  };

  // Open the Delete confirmation mode box
  const openDeleteModal = (id: string) => {
    setQuestionToDelete(id);
    setDeleteModalOpen(true);
  };

  if (status === "loading") {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Question Bank"
        description="Manage your course questions"
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
        {/* Header with Question Bank Info */}
        {questionBank && (
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <button
                onClick={() => {
                  router.push(
                    `/course/${courseId}/question-bank${
                      isSidebarAccess ? "?sidebar=true" : ""
                    }`
                  );
                }}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Question Banks
              </button>
            </div>
            <div className="flex items-center space-x-4 mb-6">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: questionBank.color }}
              ></div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {questionBank.name}
                </h1>
                {questionBank.description && (
                  <p className="text-gray-600 mt-1">
                    {questionBank.description}
                  </p>
                )}
                {questionBank.topic && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-2">
                    {questionBank.topic}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Add Button */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search questions..."
              value={filters.keyword}
              onChange={(e) =>
                setFilters({ ...filters, keyword: e.target.value })
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy"
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="">All Types</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="TRUE_FALSE">True/False</option>
            </select>
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy"
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleOpenAddModal}
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
              <span>Add New Question</span>
            </button>
            <button
              onClick={() => setShowDocxUploader(true)}
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
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>Bulk Upload</span>
            </button>
          </div>
        </div>

        {/* Question Stats */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Question Bank Statistics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-navy">
                {filteredQuestions.length}
              </div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-navy">
                {filteredQuestions.reduce((sum, q) => sum + q.points, 0)}
              </div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-navy">
                {
                  filteredQuestions.filter((q) => q.type === "MULTIPLE_CHOICE")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Multiple Choice</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-navy">
                {
                  filteredQuestions.filter((q) => q.type === "TRUE_FALSE")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">True/False</div>
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Questions ({filteredQuestions.length})
            </h2>
          </div>
          <div className="p-6">
            {filteredQuestions.length === 0 ? (
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No questions found
                </h3>
                <p className="text-gray-600 mb-4">
                  {filters.keyword || filters.type || filters.difficulty
                    ? "Try adjusting your filters or search terms."
                    : "Get started by creating your first question."}
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
                >
                  Add Your First Question
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3 flex-wrap gap-y-2">
                          <span className="bg-brand-navy text-white px-3 py-1 rounded-full text-sm font-medium">
                            Q{index + 1}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              question.type === "MULTIPLE_CHOICE"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {question.type.replace("_", " ")}
                          </span>
                          {question.difficulty && (
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${
                                question.difficulty === "EASY"
                                  ? "bg-green-100 text-green-800"
                                  : question.difficulty === "MEDIUM"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {question.difficulty}
                            </span>
                          )}
                          {question.topic && (
                            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                              {question.topic}
                            </span>
                          )}

                          {question.negativePoints !== undefined && question.negativePoints !== null && question.negativePoints < 0 && (
                            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                              Enable Negative Marking
                            </span>
                          )}
                          <span className="text-gray-500 text-sm">
                            {question.points} point{question.points !== 1 ? "s" : ""}
                            {question.negativePoints !== undefined && question.negativePoints !== null && question.negativePoints < 0 && (
                              <span className="ml-2 text-red-600">
                                ({question.negativePoints} points)
                              </span>
                            )}
                          </span>
                 
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                          {question.text}
                        </h3>

                        {question.type === "MULTIPLE_CHOICE" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {question.options.map(
                              (option: string, optIndex: number) => (
                                <div
                                  key={optIndex}
                                  className={`p-3 rounded-lg border ${
                                    option === question.correctAnswer
                                      ? "bg-green-50 border-green-200 text-green-800"
                                      : "bg-gray-50 border-gray-200 text-gray-700"
                                  }`}
                                >
                                  <span className="font-medium">
                                    {String.fromCharCode(65 + optIndex)}.
                                  </span>{" "}
                                  {option}
                                  {option === question.correctAnswer && (
                                    <span className="ml-2 text-green-600 font-medium">
                                      ✓ Correct
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}

                        {question.type === "TRUE_FALSE" && (
                          <div className="flex space-x-4">
                            <div
                              className={`p-3 rounded-lg border ${
                                question.correctAnswer === "True"
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-gray-50 border-gray-200 text-gray-700"
                              }`}
                            >
                              True
                              {question.correctAnswer === "True" && (
                                <span className="ml-2 text-green-600 font-medium">
                                      ✓ Correct
                                    </span>
                              )}
                            </div>
                            <div
                              className={`p-3 rounded-lg border ${
                                question.correctAnswer === "False"
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-gray-50 border-gray-200 text-gray-700"
                              }`}
                            >
                              False
                              {question.correctAnswer === "False" && (
                                <span className="ml-2 text-green-600 font-medium">
                                      ✓ Correct
                                    </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEditQuestion(question)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Question"
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
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => openDeleteModal(question.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Question"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Replace the original Add and Edit modals with the new QuestionEditorModal. */}
      <QuestionEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => setIsEditorModalOpen(false)}
        mode={modalMode}
        initialQuestion={editingQuestion}
        courseId={courseId}
        questionBankId={questionBankId}
        onSave={handleSaveQuestion}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteQuestion}
        title="Delete Question"
        message="Are you sure you want to delete this question? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      {/* DOCX Uploader Modal */}
      {showDocxUploader && (
        <DocxUploaderModal
          courseId={courseId}
          questionBankId={questionBankId}
          onClose={() => setShowDocxUploader(false)}
          onUploadSuccess={() => {
            setShowDocxUploader(false);
            fetchQuestionBank(); // Refresh the question bank after successful upload
          }}
        />
      )}
    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title={questionBank?.name || "Question Bank"}
      description="Manage questions in this question bank"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="questions">
      {content}
    </CourseLayout>
  );
}