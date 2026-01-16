"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../components/layouts/SimpleLayout";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";

import ResultUploader from "./ResultUploader";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface ExamGeneration {
  id: string;
  examId: string;
  examTitle: string;
  generatedAt: string;
  variantsCount: number;
  hasResults: boolean;
  studentsCount?: number;
  averageScore?: number;
  completionRate?: number;
  status: "waiting_for_results" | "has_results";
}

export default function CourseAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const targetExamId = searchParams.get("examId");
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [examGenerations, setExamGenerations] = useState<ExamGeneration[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGeneration, setSelectedGeneration] =
    useState<ExamGeneration | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedGenerationForUpload, setSelectedGenerationForUpload] = useState<ExamGeneration | null>(null);
  const [highlightedGenerationId, setHighlightedGenerationId] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchExamGenerations();
    }
  }, [courseId]);

  // Auto-open upload modal if examId is specified in URL
  useEffect(() => {
    if (targetExamId && examGenerations.length > 0) {
      const matchingGeneration = examGenerations.find(gen => gen.examId === targetExamId);
      
      if (matchingGeneration) {
        // Highlight the matching generation
        setHighlightedGenerationId(matchingGeneration.id);
        
        // Auto-open the upload modal if no results exist yet
        if (!matchingGeneration.hasResults) {
          setSelectedGenerationForUpload(matchingGeneration);
          setShowUploadModal(true);
        }
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setHighlightedGenerationId(null);
        }, 3000);
      }
    }
  }, [targetExamId, examGenerations]);

  const handleUploadClick = (generation: ExamGeneration) => {
    setSelectedGenerationForUpload(generation);
    setShowUploadModal(true);
  };

  const fetchCourse = async () => {
    try {
      setLoading(true);
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
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchExamGenerations = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/exam-generations?courseId=${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch generations");
      
      const generations = await response.json();
      
      const generationsWithResults = await Promise.all(
        generations.map(async (gen: any) => {
          const hasResults = await checkIfGenerationHasResults(gen.id);
          
          return {
            id: gen.id,
            examId: gen.examId,
            examTitle: gen.examTitle,
            generatedAt: gen.generatedAt,
            variantsCount: gen.numberOfVariants,
            hasResults,
            studentsCount: hasResults ? gen.studentsCount : undefined,
            averageScore: hasResults ? gen.averageScore : undefined,
            completionRate: hasResults ? gen.completionRate : undefined,
            status: hasResults ? "has_results" : "waiting_for_results"
          };
        })
      );
      
      setExamGenerations(generationsWithResults);
    } catch (error) {
      console.error("Error fetching exam generations:", error);
      toast.error("Failed to load exam generations");
    } finally {
      setLoading(false);
    }
  };

  const checkIfGenerationHasResults = async (generationId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/exam-generations/${generationId}/has-results`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.hasResults;
    } catch (error) {
      console.error("Error checking results:", error);
      return false;
    }
  };


  const handleViewResults = (generation: ExamGeneration) => {
    router.push(`/course/${courseId}/analytics/${generation.id}`);
  };

  const handleDeleteGeneration = (generation: ExamGeneration) => {
    setSelectedGeneration(generation);
    setShowDeleteModal(true);
  };

  const confirmDeleteGeneration = async () => {
    if (!selectedGeneration) return;

    try {
      const response = await fetch(
        `/api/exams/${selectedGeneration.examId}/generations`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            generationId: selectedGeneration.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete exam generation");
      }

      toast.success("Exam generation deleted successfully!");

      // Refresh the exam generations list
      await fetchExamGenerations();
    } catch (error) {
      console.error("Error deleting exam generation:", error);
      toast.error("Failed to delete exam generation. Please try again.");
    } finally {
      setShowDeleteModal(false);
      setSelectedGeneration(null);
    }
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Analytics"
        description="View course performance and insights"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="analytics" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    if (typeof window !== "undefined") router.push("/auth/login");
    return null;
  }

  const waitingForResults = examGenerations.filter((gen) => !gen.hasResults);
  const withResults = examGenerations.filter((gen) => gen.hasResults);

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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Track exam generations and student performance
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Total Generations
            </h3>
            <p className="text-2xl font-bold text-gray-900">
              {examGenerations.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Waiting for Results
            </h3>
            <p className="text-2xl font-bold text-orange-600">
              {waitingForResults.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">With Results</h3>
            <p className="text-2xl font-bold text-green-600">
              {withResults.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">
              Avg Pass Rate
            </h3>
            <p className="text-2xl font-bold text-blue-600">
              {withResults.length > 0
                ? Math.round(
                    withResults.reduce(
                      (acc, gen) => acc + (gen.completionRate || 0),
                      0
                    ) / withResults.length
                  )
                : 0}
              %
            </p>
          </div>
        </div>

        {/* Waiting for Results Section */}
        <div className="mb-8">
           <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Waiting for Results ({waitingForResults.length})
            </h2>
          </div>
          {waitingForResults.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500">No exams waiting for results</p>
              <p className="text-sm text-gray-400 mt-1">
                Complete exam generations will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {waitingForResults.map((generation) => (
                <div
                  key={generation.id}
                  className={`bg-white rounded-lg border p-6 transition-all duration-300 ${
                    highlightedGenerationId === generation.id
                      ? "border-green-400 bg-green-50 shadow-lg"
                      : "border-orange-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {generation.examTitle}
                        </h3>
                        <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                          Waiting for Results
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-x-4">
                        <span>
                          Generated: {new Date(generation.generatedAt).toLocaleString()}
                        </span>
                        <span>Variants: {generation.variantsCount}</span>
                        <span>ID: {generation.id}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          handleUploadClick(generation);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                          />
                        </svg>
                        <span>Upload Results</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGeneration(generation)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        title="Delete this exam generation"
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
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Available Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Results Available ({withResults.length})
          </h2>
          {withResults.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p className="text-gray-500">No results available yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Upload student results to see performance analytics
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {withResults.map((generation) => (
                <div
                  key={generation.id}
                  className={`bg-white rounded-lg border p-6 transition-all duration-300 ${
                    highlightedGenerationId === generation.id
                      ? "border-blue-400 bg-blue-50 shadow-lg"
                      : "border-green-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {generation.examTitle}
                        </h3>
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          Results Available
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-gray-600 space-x-4">
                        <span>
                          Generated:{" "}
                          {new Date(generation.generatedAt).toLocaleString()}
                        </span>
                        <span>Variants: {generation.variantsCount}</span>
                        <span>Students: {generation.studentsCount ?? 0}</span>
                        <span>Avg Score: {generation.averageScore ?? 0}%</span>
                        <span>Pass Rate: {generation.completionRate ?? 0}%</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewResults(generation)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                        <span>View Results</span>
                      </button>

                      <button
                        onClick={() => handleDeleteGeneration(generation)}
                        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
                        title="Delete this exam generation"
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
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Advanced Student Analytics - Future Feature */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8 mt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Advanced Student Analytics
              </h2>
              <p className="text-sm text-gray-600">
                Detailed student performance analysis and reporting features (UR2.17, UR2.18, UR2.22, UR2.25)
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
                Coming Soon
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => router.push(`/course/${courseId}/analytics/studentReport`)}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-3 rounded-lg transition-colors flex items-center space-x-2"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>Student Reports</span>
            </button>
            <button
              onClick={() => {
                toast("Item-level analysis coming soon!", {
                  icon: "⏳",
                  style: { background: "#3b82f6", color: "#fff" },
                });
              }}
              className="bg-green-100 hover:bg-green-200 text-green-700 px-4 py-3 rounded-lg transition-colors flex items-center space-x-2"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span>Item Analysis</span>
            </button>
            <button
              onClick={() => {
                toast("Performance comparison coming soon!", {
                  icon: "⏳",
                  style: { background: "#3b82f6", color: "#fff" },
                });
              }}
              className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-3 rounded-lg transition-colors flex items-center space-x-2"
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
                  d="M8 13v-1a4 4 0 014-4 4 4 0 014 4v1m0 0l-3 3m3-3l3 3m-3-3v-1a4 4 0 00-4-4 4 4 0 00-4 4v1"
                />
              </svg>
              <span>Year Comparison</span>
            </button>
            <button
              onClick={() => {
                toast("Collusion detection coming soon!", {
                  icon: "⏳",
                  style: { background: "#3b82f6", color: "#fff" },
                });
              }}
              className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-3 rounded-lg transition-colors flex items-center space-x-2"
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span>Suspicious Patterns</span>
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedGeneration(null);
        }}
        onConfirm={confirmDeleteGeneration}
        title="Delete Exam Generation"
        message={
          selectedGeneration
            ? `Are you sure you want to delete the exam generation "${selectedGeneration.examTitle}"? This will permanently delete all variants and answer keys. This action cannot be undone.`
            : ""
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />

      <ResultUploader
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setSelectedGenerationForUpload(null);
        }}
        generationId={selectedGenerationForUpload?.id}
        courseId={courseId}
        onSuccess={fetchExamGenerations}
        onStudentsChanged={fetchCourse}
      />

    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Analytics"
      description="View course performance and insights"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="analytics">
      {content}
    </CourseLayout>
  );
}
