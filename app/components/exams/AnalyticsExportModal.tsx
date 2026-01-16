'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { BiPointAnalysisResult } from '../../types/analysis';
import { PercentileRange } from '../analytics/PercentileFilter';
import { getFilterLabel } from '../../lib/percentileFilter';

interface AnalyticsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  generationId: string;
  analysisResult: BiPointAnalysisResult | null;
  examTitle?: string;
  percentileFilter?: PercentileRange | null;
}

interface ExportOptions {
  includeOverallAnalytics: boolean;
  includeQuestionAnalysis: boolean;
  includeStudentMapping: boolean;
  includeStatisticalData: boolean;
  includeDifficultyDistribution: boolean;
  exportFormat: 'csv' | 'comprehensive';
}

export default function AnalyticsExportModal({
  isOpen,
  onClose,
  generationId,
  analysisResult,
  examTitle = 'exam',
  percentileFilter
}: AnalyticsExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeOverallAnalytics: true,
    includeQuestionAnalysis: true,
    includeStudentMapping: true,
    includeStatisticalData: true,
    includeDifficultyDistribution: true,
    exportFormat: 'comprehensive'
  });

  const handleExport = async () => {
    if (!generationId || !analysisResult) {
      toast.error('Analytics data not available');
      return;
    }

    try {
      setLoading(true);

      // Determine which exports to generate based on options
      const exports: Array<{type: string; filename: string}> = [];
      
      if (exportOptions.includeOverallAnalytics || exportOptions.includeQuestionAnalysis || 
          exportOptions.includeStatisticalData || exportOptions.includeDifficultyDistribution) {
        exports.push({
          type: 'global',
          filename: `exam-analytics-${examTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
        });
      }

      if (exportOptions.includeStudentMapping) {
        exports.push({
          type: 'student',
          filename: `student-mapping-${examTitle.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`
        });
      }

      if (exports.length === 0) {
        toast.error('Please select at least one export option');
        return;
      }

      // Generate and download each export
      for (const exportItem of exports) {
        let url = `/api/exam-generations/${generationId}/export?type=${exportItem.type}`;
        
        // For global exports, add filtering parameters based on user selection
        if (exportItem.type === 'global') {
          const params = new URLSearchParams();
          params.append('type', 'global');
          params.append('includeOverallAnalytics', exportOptions.includeOverallAnalytics.toString());
          params.append('includeQuestionAnalysis', exportOptions.includeQuestionAnalysis.toString());
          params.append('includeStatisticalData', exportOptions.includeStatisticalData.toString());
          params.append('includeDifficultyDistribution', exportOptions.includeDifficultyDistribution.toString());
          
          // Add percentile filter parameters if active
          if (percentileFilter) {
            params.append('percentileFrom', percentileFilter.from.toString());
            params.append('percentileTo', percentileFilter.to.toString());
          }
          
          url = `/api/exam-generations/${generationId}/export?${params.toString()}`;
        } else if (exportItem.type === 'student') {
          // Also add percentile filter to student export
          const params = new URLSearchParams();
          params.append('type', 'student');
          
          if (percentileFilter) {
            params.append('percentileFrom', percentileFilter.from.toString());
            params.append('percentileTo', percentileFilter.to.toString());
          }
          
          url = `/api/exam-generations/${generationId}/export?${params.toString()}`;
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to export ${exportItem.type} data`);
        }
        
        const csvContent = await response.text();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = downloadUrl;
        link.setAttribute('download', exportItem.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }

      toast.success(`Analytics exported successfully! ${exports.length} file(s) downloaded.`);
      onClose();
    } catch (error) {
      console.error('Error exporting analytics:', error);
      toast.error(`Export failed: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Export Analytics Data
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Export analytics data for <strong>{examTitle}</strong>. Choose which components to include in your export.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              Available Export Data:
            </h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Overall exam statistics and summary metrics</li>
              <li>• Detailed question-by-question analysis</li>
              <li>• Student performance mapping and rankings</li>
              <li>• Statistical significance and reliability data</li>
              <li>• Difficulty distribution and discrimination indices</li>
            </ul>
          </div>
        </div>

        {/* Percentile Filter Status */}
        {percentileFilter && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
              </svg>
              <div>
                <h4 className="font-medium text-blue-900">
                  Filtered Export Active
                </h4>
                <p className="text-sm text-blue-700">
                  Exporting filtered analytics for <strong>{getFilterLabel(percentileFilter)}</strong> of students
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Export Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Export Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeOverallAnalytics}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeOverallAnalytics: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">Overall Analytics</span>
                <p className="text-xs text-gray-500">Summary statistics, averages, and exam metadata</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeQuestionAnalysis}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeQuestionAnalysis: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">Question Analysis</span>
                <p className="text-xs text-gray-500">Per-question difficulty, discrimination, and point-biserial data</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeStudentMapping}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeStudentMapping: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">Student Performance Mapping</span>
                <p className="text-xs text-gray-500">Individual student scores, rankings, and variant assignments</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeStatisticalData}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeStatisticalData: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">Statistical Data</span>
                <p className="text-xs text-gray-500">Significance tests, reliability measures, and confidence intervals</p>
              </div>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeDifficultyDistribution}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeDifficultyDistribution: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium">Difficulty Distribution</span>
                <p className="text-xs text-gray-500">Question difficulty categories and distribution statistics</p>
              </div>
            </label>
          </div>
        </div>

        {/* Analytics Summary */}
        {analysisResult && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              Analytics Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Students Analyzed:</span>
                <p className="text-gray-600">{analysisResult.metadata.sampleSize}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Questions:</span>
                <p className="text-gray-600">{analysisResult.questionResults.length}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Average Difficulty:</span>
                <p className="text-gray-600">{(analysisResult.summary.averageDifficulty * 100).toFixed(1)}%</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Average Discrimination:</span>
                <p className="text-gray-600">{analysisResult.summary.averageDiscrimination.toFixed(3)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Analysis Date:</span>
                <p className="text-gray-600">{new Date(analysisResult.metadata.analysisDate).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Variants:</span>
                <p className="text-gray-600">{analysisResult.metadata.totalVariants}</p>
              </div>
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
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
            <span>{loading ? 'Exporting...' : 'Export Analytics'}</span>
          </button>
        </div>
      </div>
    </div>
  );
} 