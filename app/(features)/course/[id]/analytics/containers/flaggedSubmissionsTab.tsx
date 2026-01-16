import React, { useState, useEffect } from 'react';
import { BiPointAnalysisResult } from '../../../../../types/analysis';
import { 
  ProcessSubmissions, 
  getFlaggingSummary, 
  FlaggedSubmission, 
  FlaggingConfig 
} from '../../../../../lib/flaggingSusSubs';
import { getVariantName, getVariantCode } from '../../../../../components/analytics/helpers';



interface FlaggedSubmissionsTabProps {
  analysisResult: BiPointAnalysisResult;
  generationId: string;
  studentSimilarityMatrix?: Record<string, Record<string, number>>;
  variantSimilarityMatrix?: Record<string, Record<string, number>>;
  variantAnalysisResults?: BiPointAnalysisResult[]; // Add variant analysis results
  anonymizeIds?: boolean; // Add anonymization state from parent
  studentIndexMap?: Map<string, number>; // Add student index mapping from parent
  invertVariantSimilarity?: boolean; // Add invert variant similarity toggle
}


/*
* this is the tab that shows the flagged submissions.
* it is used to show the flagged submissions and the similarity metrics.
* it is also used to show the flagged submissions and the similarity metrics.
* it is also used to show the flagged submissions and the similarity metrics.
*/
export default function FlaggedSubmissionsTab({ 
  analysisResult, 
  generationId,
  studentSimilarityMatrix,
  variantSimilarityMatrix,
  variantAnalysisResults,
  anonymizeIds = false,
  studentIndexMap = new Map(),
  invertVariantSimilarity = false
}: FlaggedSubmissionsTabProps) {
  const [allFlaggedSubmissions, setAllFlaggedSubmissions] = useState<FlaggedSubmission[]>([]);
  const [filteredFlaggedSubmissions, setFilteredFlaggedSubmissions] = useState<FlaggedSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [minThreshold, setMinThreshold] = useState(0.5); // User-adjustable threshold

  useEffect(() => {
    setLoading(true); // Always set loading to true when processing starts
    if (studentSimilarityMatrix && variantSimilarityMatrix) {
      processFlaggedSubmissions();
    } else {
      fetchSimilarityData();
    }
  }, [studentSimilarityMatrix, variantSimilarityMatrix, variantAnalysisResults, analysisResult, invertVariantSimilarity]);

  // Filter results when threshold changes (no recalculation needed)
  useEffect(() => {
    const filtered = allFlaggedSubmissions.filter(submission => 
      submission.probability >= minThreshold
    );
    setFilteredFlaggedSubmissions(filtered);
  }, [allFlaggedSubmissions, minThreshold]);



  const fetchSimilarityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/exam-generations/${generationId}/analysis/integrity`);
      if (!response.ok) {
        throw new Error('Failed to fetch integrity analysis data');
      }

      const data = await response.json();
      processFlaggedSubmissions(data.studentSimilarity, data.variantSimilarity);
    } catch (err) {
      console.error('Error fetching similarity data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load flagged submissions');
    } finally {
      setLoading(false);
    }
  };

  // Configuration for the Wesolowsky formula (threshold is now handled by filtering)
  const getConfig = (): FlaggingConfig => ({
    highProbabilityThreshold: 0.8,
    mediumProbabilityThreshold: 0.7,
    lowProbabilityThreshold: 0.0, // Set to 0 to include all pairs in calculation
  });

  const processFlaggedSubmissions = (
    responseMatrix?: Record<string, Record<string, number>>,
    variantMatrix?: Record<string, Record<string, number>>
  ) => {
    const responseSimilarityMatrix = responseMatrix || studentSimilarityMatrix;
    const variantSimilarityMatrixData = variantMatrix || variantSimilarityMatrix;
    
    if (!responseSimilarityMatrix || !variantSimilarityMatrixData) {
      console.log('Missing similarity matrices');
      setLoading(false);
      return;
    }

    const config = getConfig();
    console.log('Processing with config:', config);

    // Use variant analysis results if available, otherwise fall back to main analysis result
    const variantBiserials = variantAnalysisResults || [analysisResult];

    const flagged = ProcessSubmissions(
      variantSimilarityMatrixData,
      responseSimilarityMatrix,
      analysisResult,
      variantBiserials,
      config,
      { invertVaraintSimularity: invertVariantSimilarity }
    );

    setAllFlaggedSubmissions(flagged);
    
    // Add a small delay to ensure loading screen is visible for fast operations
    setTimeout(() => {
      setLoading(false);
    }, 300);
  };

  const getDisplayName = (studentId: string) => {
    if (anonymizeIds) {
      const studentIndex = studentIndexMap.get(studentId) || 1;
      return `S${String(studentIndex).padStart(3, '0')}`;
    }
    
    // Extract student name from the ID format "Name (Variant)"
    const match = studentId.match(/^(.+?)\s*\((.+?)\)$/);
    return match ? match[1] : studentId;
  };

  const getVariantDisplay = (variantCode: string) => {
    return getVariantName(variantCode);
  };

  const getProbabilityColor = (probability: number) => {
    if (probability >= 0.8) return 'bg-red-100 text-red-800 border-red-200';
    if (probability >= 0.7) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (probability >= 0.5) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };



  const summary = getFlaggingSummary(filteredFlaggedSubmissions);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-gray-600 transition ease-in-out duration-150">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing submissions for potential academic integrity issues...
          </div>
          <p className="mt-2 text-sm text-gray-500">This may take a few moments depending on the number of submissions.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading flagged submissions</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Threshold Control */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Threshold</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Probability Threshold: {(minThreshold * 100).toFixed(0)}%
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-medium text-gray-900 min-w-[60px]">
                {(minThreshold * 100).toFixed(0)}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Lower values show more pairs, higher values show only the most suspicious pairs.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{summary.totalFlagged}</div>
            <div className="text-sm text-gray-600">Total Flagged</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{summary.uniqueStudentsInvolved}</div>
            <div className="text-sm text-gray-600">Students Involved</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{(summary.averageProbability * 100).toFixed(1)}%</div>
            <div className="text-sm text-gray-600">Avg Probability</div>
          </div>
        </div>
      </div>

      {/* Flagged Submissions List */}
      <div className="bg-white rounded-lg border shadow-sm">
        {filteredFlaggedSubmissions.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-500">
              {`No flagged submissions found with threshold ≥ ${(minThreshold * 100).toFixed(0)}%. Try lowering the threshold to see more pairs.`}
            </div>
          </div>
        ) : (
                               <div className="divide-y divide-gray-200">
            {filteredFlaggedSubmissions.map((submission, index) => (
              <div key={index} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4 mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getProbabilityColor(submission.probability)}`}>
                        {(submission.probability * 100).toFixed(1)}% PROBABILITY
                      </span>
                      <span className="text-sm text-gray-600">
                        Response Similarity: {((submission.responseSimilarity || 0) * 100).toFixed(1)}%
                      </span>
                      <span className="text-sm text-gray-600">
                        Variant Similarity: {((submission.variantSimilarity || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {getDisplayName(submission.student1)}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Variant: {submission.student1Variant ? getVariantDisplay(submission.student1Variant) : 'Unknown'}</div>
                          {submission.student1Score && (
                            <div>Score: {submission.student1Score.toFixed(1)}%</div>
                          )}
                          {submission.student1GradeChange !== undefined && submission.student1GradeChange !== 0 && (
                            <div className={`font-medium ${submission.student1GradeChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Cross-grade Change: {submission.student1GradeChange > 0 ? '+' : ''}{submission.student1GradeChange.toFixed(1)}%
                            </div>
                          )}
                          <div>Biserial: {submission.student1Biserial?.toFixed(3) || 'N/A'}</div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {getDisplayName(submission.student2)}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>Variant: {submission.student2Variant ? getVariantDisplay(submission.student2Variant) : 'Unknown'}</div>
                          {submission.student2Score && (
                            <div>Score: {submission.student2Score.toFixed(1)}%</div>
                          )}
                          {submission.student2GradeChange !== undefined && submission.student2GradeChange !== 0 && (
                            <div className={`font-medium ${submission.student2GradeChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Cross-grade Change: {submission.student2GradeChange > 0 ? '+' : ''}{submission.student2GradeChange.toFixed(1)}%
                            </div>
                          )}
                          <div>Biserial: {submission.student2Biserial?.toFixed(3) || 'N/A'}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm text-gray-700">
                        <strong>Formula Components:</strong> Class Avg: {submission.classAverageScore?.toFixed(1)}% | 
                        Score Component: {(((submission.student1Score || 0) + (submission.student2Score || 0)) / (submission.classAverageScore || 1)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
