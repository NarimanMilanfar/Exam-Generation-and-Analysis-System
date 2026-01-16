"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseLayout from "../../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../../components/layouts/SimpleLayout";
import { QuestionType } from "../../../../../../types/course";

// Type definition
interface QuestionConfig {
  id: string;
  questionNumber: number;
  type: QuestionType;
  selectionMode: "auto" | "manual"; // Changed from isRequired to selectionMode
  selectedQuestionId?: string;
  selectedQuestionData?: Question; // Store complete question data for persistence
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "";
  topic?: string;
  questionBankId?: string;
  questionBankName?: string; // Add question bank name field
  points?: number | "";
  negativePoints?: number | null;
  sectionId: string;
}

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic: string;
  questionBankId: string;
  questionBankName: string;
  points: number;
  negativePoints?: number | null;
}

interface QuestionBank {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface TemplateData {
  id?: string;
  name: string;
  description: string;
  color: string;
  sections: Array<{
    id: string;
    name: string;
    type: QuestionType;
    start: number;
    end: number;
  }>;
  questions: QuestionConfig[];
  totalQuestions: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

export default function TemplateQuestionPreviewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const mode = "create";

  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, router]);

  // Load the template data and related resources
  useEffect(() => {
    if (status !== "authenticated") return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Create mode: load from localStorage
        console.log("🔍 REVIEW: Create mode - loading from localStorage");
        const savedTemplate = localStorage.getItem(`templateDraft_${courseId}`);
        if (!savedTemplate) {
          toast.error("No template data found");
          router.push(`/course/${courseId}/templates/questionSelection`);
          return;
        }

        const parsedTemplate: TemplateData = JSON.parse(savedTemplate);
        setTemplateData(parsedTemplate);

        const response = await fetch(
          `/api/templates/question-filter?courseId=${courseId}`
        );
        if (!response.ok) throw new Error("Failed to fetch question banks");

        const filterData = await response.json();
        setQuestionBanks(filterData.questionBanks || []);

        // Fetch questions for manual selections
        if (parsedTemplate && parsedTemplate.questions.length > 0) {
          const requiredQuestionIds = parsedTemplate.questions
            .filter((q) => q.selectionMode === "manual" && q.selectedQuestionId)
            .map((q) => q.selectedQuestionId);

          for (const bank of filterData.questionBanks) {
            const bankResponse = await fetch(`/api/question-banks/${bank.id}`);
            if (bankResponse.ok) {
              const bankData = await bankResponse.json();
              const questions = (bankData.questions || []).filter(
                (q: Question) => requiredQuestionIds?.includes(q.id)
              );
              setAvailableQuestions((prev) => [...prev, ...questions]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading preview data:", error);
        toast.error("Failed to load preview data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [status, courseId, router]);

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

  const handleBack = () => {
    const queryParams = new URLSearchParams();
    if (isSidebarAccess) queryParams.set("sidebar", "true");

    router.push(
      `/course/${courseId}/templates/playground/questionSelection${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`
    );
  };

  // Solve the problem that templateData might be null: Add a non-null check
  const handleSaveTemplate = async () => {
    console.log("🔍 REVIEW: Save attempted, templateData:", templateData);

    if (!templateData) {
      console.error("🔍 REVIEW: templateData is null/undefined");
      toast.error("No template data to save");
      return;
    }

    if (!templateData.name) {
      console.error(
        "🔍 REVIEW: templateData.name is missing:",
        templateData.name
      );
      toast.error("Template name is missing");
      return;
    }

    if (!templateData.questions || templateData.questions.length === 0) {
      console.error(
        "🔍 REVIEW: templateData.questions is missing or empty:",
        templateData.questions
      );
      toast.error("Template questions are missing");
      return;
    }

    try {
      setSaving(true);

      const processedQuestions = templateData.questions.map((q) => {
        console.log("🔍 REVIEW: Original question data:", q);

        const processed = {
          id: q.id,
          questionNumber: q.questionNumber,
          type: q.type,
          isRequired: q.selectionMode === "manual", // Transform selectionMode back to isRequired
          selectedQuestionId: q.selectedQuestionId,
          difficulty: q.difficulty || null,
          topic: q.topic || null,
          questionBankId: q.questionBankId || null,
          points: q.points === "" ? null : q.points,
          negativePoints:
            q.negativePoints === null || q.negativePoints === undefined
              ? null
              : q.negativePoints,
          sectionId: q.sectionId,
        };

        console.log("🔍 REVIEW: Processed question for API:", processed);
        return processed;
      });

      const templateToSave = {
        title: templateData.name,
        description: templateData.description || null,
        courseId: courseId,
        questions: processedQuestions,
        color: templateData.color,
      };

      console.log(
        "🔍 REVIEW: Final payload being sent to API:",
        templateToSave
      );

      const url = "/api/templates";
      const method = "POST";

      console.log("🔍 REVIEW: Sending", method, "request to:", url);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateToSave),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to save template");
      }

      toast.success(
        mode === "create"
          ? "Template created successfully"
          : "Template updated successfully"
      );
      localStorage.removeItem(`templateDraft_${courseId}`);
      router.push(
        `/course/${courseId}/templates${isSidebarAccess ? "?sidebar=true" : ""}`
      );
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  };

  const getQuestionBankName = (bankId: string) => {
    const bank = questionBanks.find((b) => b.id === bankId);
    return bank?.name || "Unknown Bank";
  };

  // Solve the difficulty type comparison problem: Use type guards
  const isNonEmptyDifficulty = (
    difficulty?: string
  ): difficulty is "EASY" | "MEDIUM" | "HARD" => {
    return (
      difficulty === "EASY" || difficulty === "MEDIUM" || difficulty === "HARD"
    );
  };

  const renderQuestionCard = (question: QuestionConfig) => {
    const questionDetails =
      question.selectionMode === "manual" && question.selectedQuestionId
        ? availableQuestions.find((q) => q.id === question.selectedQuestionId)
        : null;

    return (
      <div
        key={question.id}
        className={`p-4 rounded-lg border mb-4 ${
          question.selectionMode === "manual"
            ? "border-blue-200 bg-blue-50"
            : "border-gray-200 bg-gray-50"
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">
              Q{question.questionNumber}
            </span>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                question.selectionMode === "manual"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {question.selectionMode === "manual"
                ? "Required"
                : "Auto-selected"}
            </span>
            <span className="text-xs ml-2 text-gray-500">
              {question.type === QuestionType.MULTIPLE_CHOICE
                ? "Multiple Choice"
                : "True/False"}
            </span>
          </div>
        </div>

        {question.selectionMode === "manual" && questionDetails ? (
          <div className="mb-3">
            <p className="text-sm text-gray-800">{questionDetails.text}</p>
          </div>
        ) : question.selectionMode === "auto" ? (
          <div className="mb-3 text-sm text-gray-600 italic">
            Random{" "}
            {question.type === QuestionType.MULTIPLE_CHOICE
              ? "multiple choice"
              : "true/false"}{" "}
            question
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {question.selectionMode === "manual" && questionDetails ? (
            <>
              <div>
                <span className="text-gray-500">Question Bank: </span>
                <span className="font-medium">
                  {getQuestionBankName(questionDetails.questionBankId)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Difficulty: </span>
                <span className="font-medium">
                  {questionDetails.difficulty}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Topic: </span>
                <span className="font-medium">{questionDetails.topic}</span>
              </div>
              <div>
                <span className="text-gray-500">Points: </span>
                <span className="font-medium">{questionDetails.points}</span>
              </div>
              {questionDetails.negativePoints !== undefined &&
                questionDetails.negativePoints !== null && (
                  <div>
                    <span className="text-gray-500">Negative Points: </span>
                    <span className="font-medium text-red-600">
                      {questionDetails.negativePoints}
                    </span>
                  </div>
                )}
            </>
          ) : (
            <>
              {question.questionBankId && (
                <div>
                  <span className="text-gray-500">Question Bank: </span>
                  <span className="font-medium">
                    {getQuestionBankName(question.questionBankId)}
                  </span>
                </div>
              )}
              {/* Solve the difficulty type comparison error: Use type guards */}
              {isNonEmptyDifficulty(question.difficulty) && (
                <div>
                  <span className="text-gray-500">Difficulty: </span>
                  <span className="font-medium">{question.difficulty}</span>
                </div>
              )}
              {question.topic && question.topic !== "" && (
                <div>
                  <span className="text-gray-500">Topic: </span>
                  <span className="font-medium">{question.topic}</span>
                </div>
              )}
              {question.points !== undefined && question.points !== "" && (
                <div>
                  <span className="text-gray-500">Points: </span>
                  <span className="font-medium">{question.points}</span>
                </div>
              )}
              {question.negativePoints !== undefined &&
                question.negativePoints !== null && (
                  <div>
                    <span className="text-gray-500">Negative Points: </span>
                    <span className="font-medium text-red-600">
                      {question.negativePoints}
                    </span>
                  </div>
                )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (status === "loading" || loading || !templateData) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={course}
        title="Preview Template"
        description="Loading preview..."
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="templates" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) return null;

  return (
    <>
      {isSidebarAccess ? (
        <SimpleLayout
          course={course}
          title="Preview Template"
          description="Review your question configuration"
        >
          {renderContent()}
        </SimpleLayout>
      ) : (
        <CourseLayout course={null} activeTab="templates">
          {renderContent()}
        </CourseLayout>
      )}
    </>
  );

  // Make sure templateData is not empty before rendering
  function renderContent() {
    if (!templateData) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium">
              1
            </div>
            <div className="ml-2 text-sm font-medium text-brand-navy">
              Define Structure
            </div>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-brand-navy"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium">
              2
            </div>
            <div className="ml-2 text-sm font-medium text-brand-navy">
              Question Configuration
            </div>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-brand-navy"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium">
              3
            </div>
            <div className="ml-2 text-sm font-medium text-brand-navy">
              Review & Save
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Preview Template</h1>
          <p className="text-gray-600 mt-2">
            Review your question configuration before saving
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3"
              style={{ backgroundColor: templateData.color }}
            ></div>
            <h3 className="font-medium text-gray-900">{templateData.name}</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {templateData.description}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Total Questions: {templateData.totalQuestions || 0}
          </p>
        </div>

        <div className="space-y-8 mb-8">
          {templateData.sections.map((section) => (
            <div
              key={section.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {section.name}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {section.type === QuestionType.MULTIPLE_CHOICE
                    ? "Multiple Choice"
                    : "True/False"}
                </p>
              </div>

              <div className="p-6">
                {templateData.questions
                  .filter((q) => q.sectionId === section.id)
                  .map((question) => renderQuestionCard(question))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-4">
          <button
            onClick={handleBack}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Configuration
          </button>
          <button
            onClick={handleSaveTemplate}
            className={`px-6 py-2 rounded-lg transition-colors font-medium flex items-center ${
              saving ||
              loading ||
              !templateData ||
              !templateData.name ||
              !templateData.questions?.length
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-brand-navy hover:bg-navy-800 text-white"
            }`}
            disabled={
              saving ||
              loading ||
              !templateData ||
              !templateData.name ||
              !templateData.questions?.length
            }
          >
            {saving ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 inline animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Saving...
              </>
            ) : loading ? (
              <>
                <svg
                  className="w-4 h-4 mr-2 inline animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Loading...
              </>
            ) : !templateData ||
              !templateData.name ||
              !templateData.questions?.length ? (
              "Data Required"
            ) : (
              <>
                <svg
                  className="w-4 h-4 mr-2 inline"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
    );
  }
}
