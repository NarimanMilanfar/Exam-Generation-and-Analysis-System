"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";
import { Question, Course, Exam } from "../../../../../types/mcqlist";
import { safeParseOptions } from "../../../../../lib/mcqlist";
import GenerateVariantsButton from "../../../../../components/exams/GenerateVariantsButton";

// Custom interface for the exam data from API
interface ExamData {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  createdAt: string;
  termId?: string;
  term?: {
    term: string;
    year: number;
  } | null;
  section?: string;
}

function ExamViewContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const examId = searchParams.get("examId");
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [exam, setExam] = useState<ExamData | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return; // Wait for session to load

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (examId && courseId) {
      fetchExamData();
      fetchCourse();
    } else {
      router.push(`/course/${courseId}/exams`);
    }
  }, [examId, courseId, session, status]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        toast.error("Failed to load course");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course");
    }
  };

  const fetchExamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/exams/${examId}`);

      if (!response.ok) {
        if (response.status === 404) {
          console.log(`Exam ${examId} not found, redirecting to exams page`);
          router.push("/not-found");
          return;
        } else if (response.status === 500) {
          router.push("/error");
          return;
        } else if (response.status === 403) {
          toast.error("You do not have permission to view this exam.");
          setError("Permission denied.");
          return;
        } else {
          toast.error(`Failed to fetch exam (${response.status})`);
          setError(`Unexpected error (${response.status})`);
          return;
        }
      }

      const examData = await response.json();

      // Process questions with safe option parsing
      const processedQuestions =
        examData.questions?.map((q: any) => ({
          ...q,
          options: safeParseOptions(q.options),
          negativePoints: q.negativePoints ?? null,
        })) || [];

      const processedExam: ExamData = {
        id: examData.id,
        title: examData.name || examData.title || "Untitled Exam",
        description: examData.description || "",
        questions: processedQuestions,
        totalPoints: processedQuestions.reduce(
          (sum: number, q: Question) => sum + q.points,
          0
        ),
        createdAt: examData.createdAt,
        termId: examData.termId,
        term: examData.term,
        section: examData.section,
      };

      setExam(processedExam);
    } catch (error) {
      console.error("Error fetching exam:", error);
      setError("Failed to load exam data. Please try again.");
      toast.error("Failed to load exam data");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Exam Details"
        description="View exam information and questions"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="exams" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    return null;
  }

  if (error || !exam) {
    const errorContent = (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-12 h-12 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Unable to Load Exam
        </h3>
        <p className="text-gray-600 mb-4">
          {error || "The exam you're looking for could not be found."}
        </p>
        <button
          onClick={() => {
            const examsUrl = `/course/${courseId}/exams${
              isSidebarAccess ? "?sidebar=true" : ""
            }`;
            router.push(examsUrl);
          }}
          className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
        >
          Back to Exams
        </button>
      </div>
    );

    return isSidebarAccess ? (
      <SimpleLayout
        course={course}
        title="Exam Details"
        description="View exam information and questions"
      >
        {errorContent}
      </SimpleLayout>
    ) : (
      <CourseLayout course={course} activeTab="exams">
        {errorContent}
      </CourseLayout>
    );
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
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
              {exam.term && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {exam.term.term}, {exam.term.year}
                  {exam.section && `, Section ${exam.section}`}
                </span>
              )}
            </div>
            {exam.description && (
              <p className="text-gray-600 mt-2">{exam.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const examsUrl = `/course/${courseId}/exams${
                  isSidebarAccess ? "?sidebar=true" : ""
                }`;
                router.push(examsUrl);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Exams
            </button>
            <button
              onClick={() => {
                const editUrl = `/course/${courseId}/exams/playground?examId=${
                  exam.id
                }${isSidebarAccess ? "&sidebar=true" : ""}`;
                router.push(editUrl);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Edit Exam
            </button>
            <GenerateVariantsButton
              exam={exam}
              courseId={courseId}
              className="bg-brand-navy hover:bg-navy-800 text-white"
            />
          </div>
        </div>

        {/* Exam Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Exam Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-navy">
                {exam.questions.length}
              </div>
              <div className="text-sm text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-navy">
                {exam.totalPoints}
              </div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {
                  exam.questions.filter((q) => q.type === "MULTIPLE_CHOICE")
                    .length
                }
              </div>
              <div className="text-sm text-gray-600">Multiple Choice</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-teal-600">
                {exam.questions.filter((q) => q.type === "TRUE_FALSE").length}
              </div>
              <div className="text-sm text-gray-600">True/False</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {exam.questions.filter((q) => q.difficulty === "EASY").length}
              </div>
              <div className="text-sm text-gray-600">Easy Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {exam.questions.filter((q) => q.difficulty === "MEDIUM").length}
              </div>
              <div className="text-sm text-gray-600">Medium Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {exam.questions.filter((q) => q.difficulty === "HARD").length}
              </div>
              <div className="text-sm text-gray-600">Hard Questions</div>
            </div>
          </div>
        </div>

        {/* Question Type Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Question Distribution
          </h2>

          {/* Question Type Distribution */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-700 mb-3">By Type</h3>
            <div className="space-y-3">
              {["MULTIPLE_CHOICE", "TRUE_FALSE"].map((type) => {
                const count = exam.questions.filter(
                  (q) => q.type === type
                ).length;
                const percentage =
                  count > 0 ? (count / exam.questions.length) * 100 : 0;

                if (count === 0) return null;

                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          type === "MULTIPLE_CHOICE"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {type.replace("_", " ")}
                      </span>
                      <span className="text-gray-700">{count} questions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            type === "MULTIPLE_CHOICE"
                              ? "bg-blue-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty Distribution */}
          <div>
            <h3 className="text-md font-medium text-gray-700 mb-3">
              By Difficulty
            </h3>
            <div className="space-y-3">
              {["EASY", "MEDIUM", "HARD"].map((difficulty) => {
                const count = exam.questions.filter(
                  (q) => q.difficulty === difficulty
                ).length;
                const percentage =
                  count > 0 ? (count / exam.questions.length) * 100 : 0;

                if (count === 0) return null;

                return (
                  <div
                    key={difficulty}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          difficulty === "EASY"
                            ? "bg-green-100 text-green-800"
                            : difficulty === "MEDIUM"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {difficulty}
                      </span>
                      <span className="text-gray-700">{count} questions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            difficulty === "EASY"
                              ? "bg-green-500"
                              : difficulty === "MEDIUM"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600 w-12">
                        {Math.round(percentage)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Exam Questions ({exam.questions.length})
            </h2>
          </div>
          <div className="p-6">
            {exam.questions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No questions in this exam yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {exam.questions.map((question: Question, index: number) => (
                  <div
                    key={question.id}
                    className="border border-gray-200 rounded-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3 flex-wrap gap-y-2">
                          <span className="bg-brand-navy text-white px-3 py-1 rounded-full text-sm font-medium">
                            Question {index + 1}
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
                          {question.negativePoints !== undefined && question.negativePoints !== null &&
                            question.negativePoints < 0 && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
                                Enable Negative Marking
                              </span>
                            )}
                          <span className="text-gray-500 text-sm">
                            {question.points} point
                            {question.points !== 1 ? "s" : ""}
                          </span>
                          {typeof question.negativePoints === "number" && question.negativePoints !== undefined && question.negativePoints !== null &&
                            question.negativePoints < 0 && (
                              <span className="text-red-600 text-sm ml-3">
                                ({question.negativePoints} points)
                              </span>
                            )}
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Exam Details"
      description="View exam information and questions"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="exams">
      {content}
    </CourseLayout>
  );
}

export default function ExamViewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ExamViewContent />
    </Suspense>
  );
}
