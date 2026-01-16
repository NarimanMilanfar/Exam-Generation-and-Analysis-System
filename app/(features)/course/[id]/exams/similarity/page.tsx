"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";

// Similarity display thresholds for UI color coding and labels
const SIMILARITY_DISPLAY_THRESHOLDS = {
  HIGH: 0.8,     // Red: High similarity (concerning)
  MEDIUM: 0.6,   // Yellow: Medium similarity (moderate concern)
  // Below MEDIUM is considered LOW (Green: Good randomization)
} as const;

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface SimilarityAnalysis {
  examId: string;
  examTitle: string;
  generationId?: string;
  totalVariants: number;
  questionSimilarity: {
    questionId: string;
    questionText: string;
    positionSimilarity: number;
    averagePosition: number;
    positionVariance: number;
    positions: number[];
  }[];
  optionSimilarity: {
    questionId: string;
    questionText: string;
    optionSimilarity: number;
    averagePermutation: number[];
    permutationVariance: number;
    permutations: number[][];
  }[];
  overallSimilarity: {
    questionOrderSimilarity: number;
    optionOrderSimilarity: number;
    combinedSimilarity: number;
  };
  flags: {
    type: "HIGH_SIMILARITY" | "LOW_RANDOMIZATION" | "IDENTICAL_VARIANTS";
    severity: "WARNING" | "ERROR";
    message: string;
    details: string;
  }[];
  recommendations: string[];
}

function SimilarityContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const examId = searchParams.get("examId");
  const generationId = searchParams.get("generationId");
  const isSidebarAccess = searchParams.get("sidebar") === "true";

  const [course, setCourse] = useState<Course | null>(null);
  const [analysis, setAnalysis] = useState<SimilarityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (courseId && examId) {
      fetchCourse();
      fetchSimilarityAnalysis();
    } else {
      router.push(`/course/${courseId}/exams`);
    }
  }, [courseId, examId, session, status]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        toast.error("Failed to load course");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course");
    }
  };

  const fetchSimilarityAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (generationId) {
        params.append("generationId", generationId);
      }

      const response = await fetch(`/api/exams/${examId}/similarity?${params}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch similarity analysis");
      }

      const analysisData = await response.json();
      setAnalysis(analysisData);
    } catch (error) {
      console.error("Error fetching similarity analysis:", error);
      setError(error instanceof Error ? error.message : "Failed to load similarity analysis");
      toast.error("Failed to load similarity analysis");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Similarity Analysis"
        description="Analyze exam variant similarity patterns"
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

  if (error || !analysis) {
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
          Unable to Load Similarity Analysis
        </h3>
        <p className="text-gray-600 mb-4">
          {error || "The similarity analysis could not be generated."}
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
        title="Similarity Analysis"
        description="Analyze exam variant similarity patterns"
      >
        {errorContent}
      </SimpleLayout>
    ) : (
      <CourseLayout course={course} activeTab="exams">
        {errorContent}
      </CourseLayout>
    );
  }

  const getSimilarityColor = (similarity: number) => {
    if (similarity > SIMILARITY_DISPLAY_THRESHOLDS.HIGH) return "text-red-600 bg-red-100";
    if (similarity > SIMILARITY_DISPLAY_THRESHOLDS.MEDIUM) return "text-yellow-600 bg-yellow-100";
    return "text-green-600 bg-green-100";
  };

  const getSeverityColor = (severity: string) => {
    return severity === "ERROR" ? "text-red-600 bg-red-100" : "text-yellow-600 bg-yellow-100";
  };

  const content = (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Similarity Analysis: {analysis.examTitle}
            </h1>
            <p className="text-gray-600 mt-1">
              Analyze randomization effectiveness across {analysis.totalVariants} exam variants
            </p>
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
            {generationId && (
              <button
                onClick={() => {
                  const variationsUrl = `/course/${courseId}/exams/variations?examId=${examId}&generationId=${generationId}${
                    isSidebarAccess ? "&sidebar=true" : ""
                  }`;
                  router.push(variationsUrl);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Back to Variations
              </button>
            )}
          </div>
        </div>

        {/* Overall Similarity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Question Order Similarity</h3>
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-gray-900">
                {(analysis.overallSimilarity.questionOrderSimilarity * 100).toFixed(1)}%
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(analysis.overallSimilarity.questionOrderSimilarity)}`}>
                {analysis.overallSimilarity.questionOrderSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.HIGH ? "High" : 
                 analysis.overallSimilarity.questionOrderSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.MEDIUM ? "Medium" : "Low"}
              </span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Option Order Similarity</h3>
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-gray-900">
                {(analysis.overallSimilarity.optionOrderSimilarity * 100).toFixed(1)}%
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(analysis.overallSimilarity.optionOrderSimilarity)}`}>
                {analysis.overallSimilarity.optionOrderSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.HIGH ? "High" : 
                 analysis.overallSimilarity.optionOrderSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.MEDIUM ? "Medium" : "Low"}
              </span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Combined Similarity</h3>
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-gray-900">
                {(analysis.overallSimilarity.combinedSimilarity * 100).toFixed(1)}%
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(analysis.overallSimilarity.combinedSimilarity)}`}>
                {analysis.overallSimilarity.combinedSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.HIGH ? "High" : 
                 analysis.overallSimilarity.combinedSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.MEDIUM ? "Medium" : "Low"}
              </span>
            </div>
          </div>
        </div>

        {/* Flags and Recommendations */}
        {analysis.flags.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Statistical Flags</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {analysis.flags.map((flag, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      flag.severity === "ERROR" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(flag.severity)}`}>
                        {flag.severity}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{flag.message}</h4>
                        <p className="text-gray-600 text-sm mt-1">{flag.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Actionable Recommendations</h2>
            <p className="text-gray-600 text-sm mt-1">
              Specific steps to improve your exam variant randomization
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* Critical Issues Section */}
              {analysis.flags.some(flag => flag.severity === "ERROR") && (
                <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Critical Issues Detected</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>Your exam has critical randomization issues that compromise exam security.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Primary Recommendations */}
              <div className="space-y-4">
                {/* Question Order Recommendations */}
                {analysis.overallSimilarity.questionOrderSimilarity > 0.8 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-blue-900">Improve Question Order Randomization</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Questions appear in very similar positions across variants ({(analysis.overallSimilarity.questionOrderSimilarity * 100).toFixed(1)}% similarity).
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-blue-800">
                              Enable "Randomize Question Order" in variant generation settings
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-blue-800">
                              Increase number of variants to {Math.max(analysis.totalVariants + 2, 5)} for better distribution
                            </span>
                          </div>
                          {analysis.questionSimilarity.filter(q => q.positionSimilarity > 0.9).length > 0 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-sm text-blue-800">
                                {analysis.questionSimilarity.filter(q => q.positionSimilarity > 0.9).length} questions appear in identical positions across variants
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Option Order Recommendations */}
                {analysis.overallSimilarity.optionOrderSimilarity > 0.8 && analysis.optionSimilarity.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-purple-900">Improve Answer Option Randomization</h4>
                        <p className="text-sm text-purple-700 mt-1">
                          Answer options appear in very similar orders ({(analysis.overallSimilarity.optionOrderSimilarity * 100).toFixed(1)}% similarity).
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span className="text-sm text-purple-800">
                              Enable "Randomize Answer Options" in variant generation settings
                            </span>
                          </div>
                          {analysis.optionSimilarity.filter(o => o.optionSimilarity > 0.9).length > 0 && (
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-sm text-purple-800">
                                {analysis.optionSimilarity.filter(o => o.optionSimilarity > 0.9).length} questions have identical option orders
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Positive Feedback */}
                {analysis.overallSimilarity.combinedSimilarity <= 0.6 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-green-900">Excellent Randomization</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Your exam variants show good randomization patterns (Combined similarity: {(analysis.overallSimilarity.combinedSimilarity * 100).toFixed(1)}%).
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-800">
                              Continue using current randomization settings
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm text-green-800">
                              Consider this configuration as a template for future exams
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Moderate Issues */}
                {analysis.overallSimilarity.combinedSimilarity > 0.6 && analysis.overallSimilarity.combinedSimilarity <= 0.8 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.98-.833-2.75 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-900">Moderate Randomization Concerns</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          There's room for improvement in your randomization (Combined similarity: {(analysis.overallSimilarity.combinedSimilarity * 100).toFixed(1)}%).
                        </p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-yellow-800">
                              Consider regenerating with stronger randomization settings
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <span className="text-sm text-yellow-800">
                              Review individual question analysis below for specific issues
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistical Context */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Statistical Context</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Variants Analyzed:</span> {analysis.totalVariants}
                  </div>
                  <div>
                    <span className="font-medium">Questions per Variant:</span> {analysis.questionSimilarity.length}
                  </div>
                  <div>
                    <span className="font-medium">Multiple Choice Questions:</span> {analysis.optionSimilarity.length}
                  </div>
                  <div>
                    <span className="font-medium">Randomization Quality:</span>{' '}
                    <span className={`font-medium ${
                      analysis.overallSimilarity.combinedSimilarity <= 0.6 ? 'text-green-600' :
                      analysis.overallSimilarity.combinedSimilarity <= 0.8 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {analysis.overallSimilarity.combinedSimilarity <= 0.6 ? 'Excellent' :
                       analysis.overallSimilarity.combinedSimilarity <= 0.8 ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Per-Question Position Similarity Matrix */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Question Position Analysis</h2>
            <p className="text-gray-600 text-sm mt-1">
              Shows how consistently each question appears in the same position across variants
            </p>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Question</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Similarity Score</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Avg Position</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Position Range</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-900">Positions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analysis.questionSimilarity.map((question) => (
                    <tr key={question.questionId} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {question.questionText}
                        </div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(question.positionSimilarity)}`}>
                          {(question.positionSimilarity * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4 text-sm text-gray-600">
                        {(question.averagePosition + 1).toFixed(1)}
                      </td>
                      <td className="text-center py-3 px-4 text-sm text-gray-600">
                        {Math.min(...question.positions) + 1} - {Math.max(...question.positions) + 1}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex flex-wrap gap-1 justify-center">
                          {question.positions.map((pos, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {pos + 1}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Option Order Similarity */}
        {analysis.optionSimilarity.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Answer Option Analysis</h2>
              <p className="text-gray-600 text-sm mt-1">
                Shows how consistently answer options appear in the same order across variants
              </p>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Question</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Option Similarity</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Variance</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {analysis.optionSimilarity.map((option) => (
                      <tr key={option.questionId} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {option.questionText}
                          </div>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSimilarityColor(option.optionSimilarity)}`}>
                            {(option.optionSimilarity * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-sm text-gray-600">
                          {option.permutationVariance.toFixed(2)}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            option.optionSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.HIGH ? "text-red-600 bg-red-100" :
                            option.optionSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.MEDIUM ? "text-yellow-600 bg-yellow-100" :
                            "text-green-600 bg-green-100"
                          }`}>
                            {option.optionSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.HIGH ? "Needs Attention" :
                             option.optionSimilarity > SIMILARITY_DISPLAY_THRESHOLDS.MEDIUM ? "Moderate" : "Well Randomized"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Similarity Analysis"
      description="Analyze exam variant similarity patterns"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="exams">
      {content}
    </CourseLayout>
  );
}

export default function SimilarityPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
            <p className="mt-4 text-gray-600">Loading similarity analysis...</p>
          </div>
        </div>
      }
    >
      <SimilarityContent />
    </Suspense>
  );
} 