'use client';

import { useState, useEffect } from 'react';
import { BiPointAnalysisResult } from '../../types/analysis';

interface ExamGeneration {
  id: string;
  examId: string;
  examTitle: string;
  courseId: string;
  courseName: string;
  numberOfVariants: number;
  status: string;
  generatedAt: string;
  completedAt: string | null;
  hasResults?: boolean;
}

interface YearOverYearAnalysisProps {
  currentGenerationId: string;
  courseId: string;
}

interface ComparisonData {
  generation: ExamGeneration;
  analysis: BiPointAnalysisResult;
}

/**
 * Displays year-over-year comparison analysis for exam performance.
 * Allows instructors to compare current exam results with previous exams.
 * 
 * Implements UR2.18: Must be able to compare performance across exams and years.
 * 
 * @param currentGenerationId - The ID of the current exam generation being analyzed
 * @param courseId - The ID of the course containing the exams
 * @returns React component for year-over-year analysis
 */
export default function YearOverYearAnalysis({ currentGenerationId, courseId }: YearOverYearAnalysisProps) {
  const [availableGenerations, setAvailableGenerations] = useState<ExamGeneration[]>([]);
  const [selectedGenerations, setSelectedGenerations] = useState<string[]>(['', '']);
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentExamData, setCurrentExamData] = useState<ComparisonData | null>(null);

  // Fetch available generations with results on component mount
  useEffect(() => {
    fetchAvailableGenerations();
    fetchCurrentExamData();
  }, [courseId, currentGenerationId]);

  const fetchAvailableGenerations = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/exam-generations?courseId=${courseId}&hasResults=true`);
      if (!response.ok) throw new Error('Failed to fetch available generations');

      const generations = await response.json();
      // Filter out the current generation since we'll show it separately
      const filteredGenerations = generations.filter((gen: ExamGeneration) => gen.id !== currentGenerationId);
      setAvailableGenerations(filteredGenerations);
    } catch (error) {
      console.error('Error fetching generations:', error);
      setError('Failed to load available exam generations');
    }
  };

  const fetchCurrentExamData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/exam-generations/${currentGenerationId}`);
      if (!response.ok) throw new Error('Failed to fetch current generation data');
      
      const generation = await response.json();
      
      const analysisResponse = await fetch(`/api/exam-generations/${currentGenerationId}/analysis`);
      if (!analysisResponse.ok) throw new Error('Failed to fetch current generation analysis');
      
      const analysis = await analysisResponse.json();
      
      setCurrentExamData({
        generation,
        analysis
      });
    } catch (error) {
      console.error('Error fetching current exam data:', error);
      setError('Failed to load current exam data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerationSelect = (generationId: string, index: number) => {
    const newSelected = [...selectedGenerations];
    newSelected[index] = generationId;
    setSelectedGenerations(newSelected);
  };

  const loadComparisonData = async () => {
    const validSelections = selectedGenerations.filter(Boolean);
    if (validSelections.length === 0) return;

    setLoading(true);
    setError(null);
    setComparisonData([]);

    try {
      const dataPromises = validSelections.map(async (generationId) => {
        const response = await fetch(`/api/exam-generations/${generationId}/analysis`);
        if (!response.ok) throw new Error(`Failed to load analysis for generation ${generationId}`);

        const analysis = await response.json();
        const generation = availableGenerations.find(g => g.id === generationId);

        if (!generation) {
          throw new Error(`Generation ${generationId} not found in available generations`);
        }

        return {
          generation,
          analysis
        };
      });

      const data = await Promise.all(dataPromises);
      setComparisonData(data);
    } catch (error) {
      console.error('Error loading comparison data:', error);
      setError('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const getMetricValue = (analysis: BiPointAnalysisResult | undefined, metric: string): number => {
    if (!analysis || !analysis.summary) return 0;
    
    switch (metric) {
      case 'averageScore':
        // Calculate average score directly from student responses like StudentScoreView does
        if (analysis.metadata?.studentResponses?.length) {
          const scores = analysis.metadata.studentResponses.map(response => 
            response.maxPossibleScore > 0 ? (response.totalScore / response.maxPossibleScore) * 100 : 0
          );
          return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length / 100 : 0;
        }
        // Fallback to scoreDistribution mean if available
        return analysis.summary.scoreDistribution?.mean || 0;
      case 'difficultyIndex':
        return analysis.summary.averageDifficulty || 0;
      case 'discriminationIndex':
        return analysis.summary.averageDiscrimination || 0;
      case 'reliability':
        return analysis.summary.reliabilityMetrics?.cronbachsAlpha || 0;
      default:
        return 0;
    }
  };

  const formatMetric = (value: number, metric: string): string => {
    switch (metric) {
      case 'averageScore':
        // The value is already between 0 and 1, so multiply by 100 to get percentage
        return `${(value * 100).toFixed(1)}%`;
      case 'difficultyIndex':
      case 'discriminationIndex':
      case 'reliability':
        return value.toFixed(3);
      default:
        return value.toFixed(2);
    }
  };

  const getMetricColor = (value: number, metric: string): string => {
    switch (metric) {
      case 'averageScore':
        return value >= 0.7 ? 'text-green-600' : value >= 0.5 ? 'text-yellow-600' : 'text-red-600';
      case 'difficultyIndex':
        return value >= 0.3 && value <= 0.7 ? 'text-green-600' : 'text-yellow-600';
      case 'discriminationIndex':
        return value >= 0.3 ? 'text-green-600' : value >= 0.2 ? 'text-yellow-600' : 'text-red-600';
      case 'reliability':
        return value >= 0.7 ? 'text-green-600' : value >= 0.6 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const metrics = [
    { key: 'averageScore', label: 'Average Score', description: 'Overall student performance' },
    { key: 'difficultyIndex', label: 'Difficulty Index', description: 'Question difficulty level' },
    { key: 'discriminationIndex', label: 'Discrimination Index', description: 'Question quality measure' },
    { key: 'reliability', label: 'Reliability (α)', description: 'Test consistency measure' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Year over Year Analysis</h2>
        <p className="text-gray-600">
          Compare exam performance across different years, terms, or sections to identify trends and patterns.
        </p>
      </div>

      {/* Generation Selection */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Exams for Comparison</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Current Exam */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Current Exam
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 bg-gray-50 rounded-md text-gray-700">
              {currentExamData?.generation?.examTitle || 'Loading...'}
            </div>
          </div>
          
          {/* Comparison Exams */}
          {[0, 1].map((index) => (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                {`Comparison ${index + 1}`}
              </label>
              <select
                value={selectedGenerations[index] || ''}
                onChange={(e) => handleGenerationSelect(e.target.value, index)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select an exam...</option>
                {Array.isArray(availableGenerations) && availableGenerations.map((generation) => (
                  <option key={generation.id} value={generation.id}>
                    {generation.examTitle} ({new Date(generation.generatedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <button
          onClick={loadComparisonData}
          disabled={selectedGenerations.filter(Boolean).length === 0 || loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
        >
          {loading ? 'Loading...' : 'Compare Exams'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Comparison Results */}
      {(comparisonData.length > 0 || currentExamData) && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric) => (
              <div key={metric.key} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">{metric.label}</h4>
                <div className="space-y-2">
                  {/* Current Exam */}
                  {currentExamData && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 truncate">
                        {currentExamData.generation.examTitle} (Current)
                      </span>
                      <span className={`text-sm font-medium ${getMetricColor(getMetricValue(currentExamData.analysis, metric.key), metric.key)}`}>
                        {formatMetric(getMetricValue(currentExamData.analysis, metric.key), metric.key)}
                      </span>
                    </div>
                  )}
                  
                  {/* Comparison Exams */}
                  {comparisonData.map((data, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 truncate">
                        {data.generation.examTitle}
                      </span>
                      <span className={`text-sm font-medium ${getMetricColor(getMetricValue(data.analysis, metric.key), metric.key)}`}>
                        {formatMetric(getMetricValue(data.analysis, metric.key), metric.key)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Comparison Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Detailed Comparison</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    {/* Current Exam */}
                    {currentExamData && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {currentExamData.generation.examTitle} (Current)
                      </th>
                    )}
                    {/* Comparison Exams */}
                    {comparisonData.map((data, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {data.generation.examTitle}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.map((metric) => (
                    <tr key={metric.key}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {metric.label}
                        <p className="text-xs text-gray-500">{metric.description}</p>
                      </td>
                      {/* Current Exam */}
                      {currentExamData && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${getMetricColor(getMetricValue(currentExamData.analysis, metric.key), metric.key)}`}>
                            {formatMetric(getMetricValue(currentExamData.analysis, metric.key), metric.key)}
                          </span>
                        </td>
                      )}
                      {/* Comparison Exams */}
                      {comparisonData.map((data, index) => (
                        <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`font-medium ${getMetricColor(getMetricValue(data.analysis, metric.key), metric.key)}`}>
                            {formatMetric(getMetricValue(data.analysis, metric.key), metric.key)}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                  
                  {/* Additional metrics */}
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Sample Size
                      <p className="text-xs text-gray-500">Number of students</p>
                    </td>
                    {/* Current Exam */}
                    {currentExamData && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currentExamData.analysis?.metadata?.sampleSize || 'N/A'}
                      </td>
                    )}
                    {/* Comparison Exams */}
                    {comparisonData.map((data, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.analysis?.metadata?.sampleSize || 'N/A'}
                      </td>
                    ))}
                  </tr>
                  
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      Questions
                      <p className="text-xs text-gray-500">Number of questions</p>
                    </td>
                    {/* Current Exam */}
                    {currentExamData && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {currentExamData.analysis?.questionResults?.length || 'N/A'}
                      </td>
                    )}
                    {/* Comparison Exams */}
                    {comparisonData.map((data, index) => (
                      <td key={index} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {data.analysis?.questionResults?.length || 'N/A'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Insights */}
          {comparisonData.length > 0 && currentExamData && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-blue-900 mb-4">Analysis Insights</h3>
              <div className="space-y-3 text-sm text-blue-800">
                <p>
                  <strong>Performance Trend:</strong> {
                    getMetricValue(currentExamData.analysis, 'averageScore') > getMetricValue(comparisonData[0].analysis, 'averageScore')
                      ? 'Improving student performance compared to previous exam.'
                      : 'Declining student performance compared to previous exam.'
                  }
                </p>
                <p>
                  <strong>Question Quality:</strong> {
                    getMetricValue(currentExamData.analysis, 'discriminationIndex') > getMetricValue(comparisonData[0].analysis, 'discriminationIndex')
                      ? 'Better question discrimination in current exam.'
                      : 'Lower question discrimination in current exam.'
                  }
                </p>
                <p>
                  <strong>Test Reliability:</strong> {
                    getMetricValue(currentExamData.analysis, 'reliability') > getMetricValue(comparisonData[0].analysis, 'reliability')
                      ? 'More consistent test results in current exam.'
                      : 'Less consistent test results in current exam.'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 