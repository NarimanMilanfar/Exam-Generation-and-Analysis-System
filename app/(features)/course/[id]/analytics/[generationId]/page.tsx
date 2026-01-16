'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import CourseLayout from '../../../../../components/layouts/CourseLayout';
import SimpleLayout from '../../../../../components/layouts/SimpleLayout';
import BiPointAnalysisCharts from '../containers/AnalysisExamChartsView';
import SummaryAnalysisReport from '../containers/SummaryOptionAnalysisTab';
import ByVariantAnalysisReportTab from '../containers/ByVariantAnalysisReportTab';
import IntegrityAnalysisTab from '../containers/IntegrityAnalysisTab';
import AnalyticsExportModal from '../../../../../components/exams/AnalyticsExportModal';
import YearOverYearAnalysis from '../../../../../components/analytics/YearOverYearAnalysis';


import { PercentileRange } from '../../../../../components/analytics/PercentileFilter';
import { BiPointAnalysisResult } from '../../../../../types/analysis';

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
}





export default function BiPointAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const courseId = params.id as string;
  const generationId = params.generationId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [generation, setGeneration] = useState<ExamGeneration | null>(null);
  const [analysisResult, setAnalysisResult] = useState<BiPointAnalysisResult | null>(null);
  const [variantResults, setVariantResults] = useState<BiPointAnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'variants' | 'byVariant' | 'yearOverYear'>('overview');
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [percentileFilter, setPercentileFilter] = useState<PercentileRange | null>(null);

  // Check for sidebar access
  const isSidebarAccess = typeof window !== 'undefined' &&
    window.location.search.includes('sidebar=true');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/login');
      return;
    }

    fetchData();
  }, [status, session, courseId, generationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch course data
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (!courseResponse.ok) throw new Error('Failed to fetch course');
      const courseData = await courseResponse.json();
      setCourse(courseData);

      // Fetch generation data
      const generationResponse = await fetch(`/api/exam-generations/${generationId}`);
      if (!generationResponse.ok) throw new Error('Failed to fetch exam generation');
      const generationData = await generationResponse.json();
      setGeneration(generationData);

      // Check if generation has results
      if (!generationData.hasResults) {
        setError('No student results available for this exam generation. Please upload results first.');
        return;
      }

      // Perform bi-point analysis via API
      const analysisResponse = await fetch(`/api/exam-generations/${generationId}/analysis`);
      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        throw new Error(errorData.error || 'Failed to perform analysis');
      }
      const analysisResult = await analysisResponse.json();

      setAnalysisResult(analysisResult);

      // Fetch variant analysis from dedicated endpoint
      try {
        const variantResponse = await fetch(`/api/exam-generations/${generationId}/analysis/variants`);
        if (variantResponse.ok) {
          const variantAnalysis = await variantResponse.json();
          setVariantResults(variantAnalysis);
        } else {
          console.warn('Failed to fetch variant analysis, continuing with main analysis only');
          setVariantResults([]);
        }
      } catch (variantError) {
        console.warn('Error fetching variant analysis:', variantError);
        setVariantResults([]);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError(`Failed to load analysis data: ${error}`);
      toast.error('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };



  if (status === 'loading' || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={course}
        title="Bi-Point Analysis"
        description="Statistical analysis of exam performance"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={course} activeTab="analytics" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    const errorContent = (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <svg
            className="w-16 h-16 text-red-400 mx-auto mb-4"
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
          <h2 className="text-xl font-semibold text-red-800 mb-2">Analysis Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push(`/course/${courseId}/analytics`)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Analytics
          </button>
        </div>
      </div>
    );

    return isSidebarAccess ? (
      <SimpleLayout
        course={course}
        title="Bi-Point Analysis"
        description="Statistical analysis of exam performance"
      >
        {errorContent}
      </SimpleLayout>
    ) : (
      <CourseLayout course={course} activeTab="analytics">
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

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Bi-Point Analysis
              </h1>
              <p className="text-gray-600 mt-2">
                Statistical analysis for {generation?.examTitle}
              </p>
              {analysisResult && (
                <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                  <span>{analysisResult.metadata.sampleSize} students analyzed</span>
                  <span>•</span>
                  <span>{analysisResult.questionResults.length} questions</span>
                  <span>•</span>
                  <span>Generated on {new Date(analysisResult.metadata.analysisDate).toLocaleDateString()}</span>
                </div>
              )}

              {/* Statistical Testing Warnings */}
              {analysisResult && (() => {
                const questionsWithWarnings = analysisResult.questionResults.filter((q) =>
                  q.statisticalSignificance.warnings && q.statisticalSignificance.warnings.length > 0
                );

                // Only show the warning if sample size is less than 30
                if (questionsWithWarnings.length > 0 && analysisResult.metadata.sampleSize < 30) {
                  return (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center">
                        <svg className="h-4 w-4 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-blue-800">
                          Sample size ({analysisResult.metadata.sampleSize}) less than 30: Chi-squared test is a less accurate indicator
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsExportModalOpen(true)}
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Export Analytics</span>
              </button>
              <button
                onClick={() => router.push(`/course/${courseId}/analytics`)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>Back to Analytics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Overview Charts
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'detailed'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Summary Analysis
            </button>
            <button
              onClick={() => setActiveTab('variants')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'variants'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Variant Analysis ({variantResults.length})
            </button>
            <button
              onClick={() => setActiveTab('byVariant')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'byVariant'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Integrity Analysis
            </button>
                {/*to be implemetned*/}
            <button
              onClick={() => setActiveTab('yearOverYear')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'yearOverYear'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Year-over-Year
            </button>
          </nav>
        </div>

        {/* Content */}
        {analysisResult && (
          <div>
            {activeTab === 'overview' && (
              <BiPointAnalysisCharts 
                analysisResult={analysisResult}
                onPercentileFilterChange={setPercentileFilter}
              />
            )}
            {activeTab === 'detailed' && (
              <SummaryAnalysisReport analysisResult={analysisResult} />
            )}
            {activeTab === 'variants' && (
              <ByVariantAnalysisReportTab
                analysisResult={analysisResult}
                variantAnalysisResults={variantResults}
              />
            )}
            {activeTab === 'byVariant' && (
              <IntegrityAnalysisTab
                analysisResult={analysisResult}
                variantAnalysisResults={variantResults}
                generationId={generationId}
              />
            )}
            {activeTab === 'yearOverYear' && (
              <YearOverYearAnalysis
                currentGenerationId={generationId}
                courseId={courseId}
              />
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {isSidebarAccess ? (
        <SimpleLayout
          course={course}
          title="Bi-Point Analysis"
          description="Statistical analysis of exam performance"
        >
          {content}
        </SimpleLayout>
      ) : (
        <CourseLayout course={course} activeTab="analytics">
          {content}
        </CourseLayout>
      )}
      
      {/* Analytics Export Modal */}
      <AnalyticsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        generationId={generationId}
        analysisResult={analysisResult}
        examTitle={generation?.examTitle}
        percentileFilter={percentileFilter}
      />
    </>
  );
} 