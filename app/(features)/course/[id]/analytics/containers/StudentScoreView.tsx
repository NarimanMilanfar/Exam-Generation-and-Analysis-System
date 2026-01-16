/**
 * StudentScoreList - Displays a summary table and statistics of student exam scores based on bi-point analysis results.
 * 
 * This component provides a comprehensive summary of student exam scores, including total students,
 * average score, highest score, lowest score, and performance categories. It also includes a table
 * of student scores with ranks, student IDs, points, questions, percentages, and performance categories.
 * 
 * @param {StudentScoreListProps} props - Component props containing analysis data
 * @param {BiPointAnalysisResult} props.analysisResult - The computed analysis results containing student performance data
 * 
 * @returns {JSX.Element} A React component displaying student score summary and performance statistics
 */

import React, { useState } from 'react';
import { BiPointAnalysisResult } from '../../../../../types/analysis';
import PercentileFilter, { PercentileRange } from '../../../../../components/analytics/PercentileFilter';
import { applyPercentileFilter, getFilterLabel } from '../../../../../lib/percentileFilter';
import type { StudentScore } from '../../../../../lib/percentileFilter';
import { getVariantName } from '../../../../../components/analytics/helpers';

interface StudentScoreListProps {
  analysisResult: BiPointAnalysisResult;
  onFilterChange?: (filter: PercentileRange | null) => void;
}

/**
 * Displays a summary table and statistics of student exam scores based on bi-point analysis results.
 *
 * @param analysisResult - The computed analysis results containing student performance data.
 * @param onFilterChange - Optional callback to notify parent component of filter changes.
 * @returns React component rendering a sortable list of student scores, ranks, and performance categories.
 */
export default function StudentScoreList({ analysisResult, onFilterChange }: StudentScoreListProps) {
  const [isAnonymized, setIsAnonymized] = useState(false);
  const [percentileFilter, setPercentileFilter] = useState<PercentileRange | null>(null);

  // Extract student scores from the analysis result
  const studentScores: StudentScore[] = analysisResult.metadata.studentResponses?.map((response, index) => ({
    studentId: response.studentId,
    displayStudentId: response.displayStudentId,
    name: response.name,
    totalScore: response.totalScore,
    maxPossibleScore: response.maxPossibleScore,
    percentage: response.maxPossibleScore > 0 ? (response.totalScore / response.maxPossibleScore) * 100 : 0,
    variantCode: String(getVariantName(response.variantCode)) || 'Unknown',
    questionsCorrect: response.questionResponses.filter(qr => qr.isCorrect).length,
    totalQuestions: response.questionResponses.length,
    anonymizedId: `S${String(index + 1).padStart(3, '0')}`,
  })) || [];

  // Handle filter change
  const handleFilterChange = (filter: PercentileRange | null) => {
    setPercentileFilter(filter);
    onFilterChange?.(filter);
  };

  // Apply percentile filter and calculate statistics
  const { filteredStudents: sortedScores, totalStudents, averageScore, highestScore, lowestScore } = 
    applyPercentileFilter(studentScores, percentileFilter);

  // Performance categories using UBCO letter grades
  const getPerformanceCategory = (percentage: number) => {
    switch (true) {
      case percentage >= 90:
        return { label: 'A+', color: 'text-green-600', bgColor: 'bg-green-100' };
      case percentage >= 85:
        return { label: 'A', color: 'text-green-600', bgColor: 'bg-green-100' };
      case percentage >= 80:
        return { label: 'A-', color: 'text-green-600', bgColor: 'bg-green-100' };
      case percentage >= 76:
        return { label: 'B+', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case percentage >= 72:
        return { label: 'B', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case percentage >= 68:
        return { label: 'B-', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case percentage >= 64:
        return { label: 'C+', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case percentage >= 60:
        return { label: 'C', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case percentage >= 50:
        return { label: 'C-', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case percentage < 50:
        return { label: 'F', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { label: 'F', color: 'text-red-600', bgColor: 'bg-red-100' };
    }
  };



  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Student Performance Summary
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Anonymize IDs</span>
            <button
              onClick={() => setIsAnonymized(!isAnonymized)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isAnonymized ? 'bg-blue-600' : 'bg-gray-200'}`}
              aria-label="Toggle anonymized IDs"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnonymized ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
        
        <PercentileFilter 
          onFilterChange={handleFilterChange}
          currentFilter={percentileFilter}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Total Students</div>
            <div className="text-2xl font-bold text-gray-900">{totalStudents}</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Average Score</div>
            <div className="text-2xl font-bold text-blue-600">{averageScore.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Highest Score</div>
            <div className="text-2xl font-bold text-green-600">{highestScore.toFixed(1)}%</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">Lowest Score</div>
            <div className="text-2xl font-bold text-red-600">{lowestScore.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rank
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Student ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Questions
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Percentage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Performance
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Variant
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedScores.map((student) => {
              const performance = getPerformanceCategory(student.percentage);
              return (
                <tr key={student.studentId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{student.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {isAnonymized 
                      ? student.anonymizedId 
                      : (student.displayStudentId || student.studentId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.totalScore} / {student.maxPossibleScore}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.questionsCorrect} / {student.totalQuestions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.percentage.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${performance.bgColor} ${performance.color}`}>
                      {performance.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.variantCode}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedScores.length === 0 && (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
          <p className="text-gray-500">No student data available</p>
        </div>
      )}
    </div>
  );
} 