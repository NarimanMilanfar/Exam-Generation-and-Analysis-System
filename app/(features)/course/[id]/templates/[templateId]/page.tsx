"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";
import { QuestionType } from "../../../../../types/course";

// type definition
interface QuestionConfig {
  id: string;
  questionNumber: number;
  type: QuestionType;
  isRequired: boolean;
  selectedQuestionId?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "";
  topic?: string;
  questionBankId?: string;
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

interface TemplateData {
  id: string;
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

export default function TemplateViewPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const templateId = params.templateId as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [questionBanks, setQuestionBanks] = useState<
    { id: string; name: string }[]
  >([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // Load template data
  useEffect(() => {
    if (status !== "authenticated") return;

    const loadData = async () => {
      try {
        setLoading(true);

        // Get template details
        const templateResponse = await fetch(`/api/templates/${templateId}`);
        if (!templateResponse.ok) {
          throw new Error("Failed to fetch template details");
        }

        const templateData = await templateResponse.json();
        setTemplateData(templateData);

        // Get the list of question banks (for displaying the names of question banks)
        const banksResponse = await fetch(
          `/api/question-banks?courseId=${courseId}`
        );
        if (banksResponse.ok) {
          const banksData = await banksResponse.json();
          setQuestionBanks(banksData);
        }

        // Get details of the selected questions
        if (templateData.questions.length > 0) {
          const requiredQuestionIds = templateData.questions
            .filter((q) => q.isRequired && q.selectedQuestionId)
            .map((q) => q.selectedQuestionId);

          const uniqueBankIds = templateData.questions
            .map((q) => q.questionBankId)
            .filter((value, index, self) => self.indexOf(value) === index);

          for (const bankId of uniqueBankIds) {
            if (!bankId) continue;

            const bankResponse = await fetch(`/api/question-banks/${bankId}`);
            if (bankResponse.ok) {
              const bankData = await bankResponse.json();
              const questions = (bankData.questions || []).filter(
                (q: Question) => requiredQuestionIds.includes(q.id)
              );
              setAvailableQuestions((prev) => [...prev, ...questions]);
            }
          }
        }
      } catch (error) {
        console.error("Error loading template details:", error);
        toast.error("Failed to load template details");
        router.push(
          `/course/${courseId}/templates${
            isSidebarAccess ? "?sidebar=true" : ""
          }`
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [status, courseId, templateId, router, isSidebarAccess]);

  const handleBack = () => {
    router.push(
      `/course/${courseId}/templates${isSidebarAccess ? "?sidebar=true" : ""}`
    );
  };

  const handleEdit = () => {
    // Navigate to combined editor with templateId for editing
    const queryParams = new URLSearchParams();
    queryParams.set("templateId", templateId);
    if (isSidebarAccess) queryParams.set("sidebar", "true");

    router.push(
      `/course/${courseId}/templates/playground/edit?${queryParams.toString()}`
    );
  };

  const getQuestionBankName = (bankId: string) => {
    const bank = questionBanks.find((b) => b.id === bankId);
    return bank?.name || "Unknown Bank";
  };

  const renderQuestionCard = (question: QuestionConfig) => {
    const questionDetails =
      question.isRequired && question.selectedQuestionId
        ? availableQuestions.find((q) => q.id === question.selectedQuestionId)
        : null;

    return (
      <div
        key={question.id}
        className={`p-4 rounded-lg border mb-4 ${
          question.isRequired
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
                question.isRequired
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {question.isRequired ? "Required" : "Auto-selected"}
            </span>
            <span className="text-xs ml-2 text-gray-500">
              {question.type === QuestionType.MULTIPLE_CHOICE
                ? "Multiple Choice"
                : "True/False"}
            </span>
          </div>
        </div>

        {question.isRequired && questionDetails ? (
          <div className="mb-3">
            <p className="text-sm text-gray-800">{questionDetails.text}</p>
          </div>
        ) : !question.isRequired ? (
          <div className="mb-3 text-sm text-gray-600 italic">
            Random{" "}
            {question.type === QuestionType.MULTIPLE_CHOICE
              ? "multiple choice"
              : "true/false"}{" "}
            question
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {question.isRequired && questionDetails ? (
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
              {/* Only display Points if it has a value */}
              {questionDetails.points !== null &&
                questionDetails.points !== undefined && (
                  <div>
                    <span className="text-gray-500">Points: </span>
                    <span className="font-medium">
                      {questionDetails.points}
                    </span>
                  </div>
                )}
              {/* Display Negative Points if it has a non-zero value */}
              {questionDetails.negativePoints !== null &&
                questionDetails.negativePoints !== undefined &&
                questionDetails.negativePoints !== 0 && (
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
              {question.difficulty && (
                <div>
                  <span className="text-gray-500">Difficulty: </span>
                  <span className="font-medium">{question.difficulty}</span>
                </div>
              )}
              {question.topic && (
                <div>
                  <span className="text-gray-500">Topic: </span>
                  <span className="font-medium">{question.topic}</span>
                </div>
              )}
              {/* Only display Points if it has a value */}
              {question.points !== undefined &&
                question.points !== "" &&
                question.points !== null && (
                  <div>
                    <span className="text-gray-500">Points: </span>
                    <span className="font-medium">{question.points}</span>
                  </div>
                )}
              {/* Display Negative Points if it has a non-zero value */}
              {question.negativePoints !== null &&
                question.negativePoints !== undefined &&
                question.negativePoints !== 0 && (
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
        course={null}
        title="Template Details"
        description="Loading template..."
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
          course={null}
          title="Template Details"
          description="Review your exam template configuration"
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

  function renderContent() {
    if (!templateData) return null;

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {templateData.name}
          </h1>
          <p className="text-gray-600 mt-2">
            Review your exam template configuration
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
            Back to Templates
          </button>
          <button
            onClick={handleEdit}
            className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800 transition-colors font-medium flex items-center"
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
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Edit Template
          </button>
        </div>
      </div>
    );
  }
}
