/**
 * IntegrityAnalysisTab - Exam Integrity Analysis Component
 * 
 * This component displays similarity matrices for exam integrity analysis,
 * showing both student-to-student similarity and variant-to-variant similarity.
 * 
 * Features:
 * - Student similarity matrix showing option choice patterns
 * - Variant similarity matrix showing question/option order differences
 * - Interactive matrix visualization with color coding
 * - Detailed breakdown of similarity calculations
 * 
 * @param {IntegrityAnalysisProps} props - Component props containing analysis data
 * @param {BiPointAnalysisResult} props.analysisResult - Overall exam analysis results
 * @param {string} props.generationId - Exam generation ID for API calls
 * 
 * @returns {JSX.Element} Integrity analysis interface with similarity matrices
 */
import React, { useState, useEffect } from "react";
import { BiPointAnalysisResult } from "../../../../../types/analysis";
import { getVariantName  } from "../../../../../components/analytics/helpers";
import FlaggedSubmissionsTab from "./flaggedSubmissionsTab";

interface IntegrityAnalysisProps {
  analysisResult: BiPointAnalysisResult;
  variantAnalysisResults: BiPointAnalysisResult[];
  generationId: string;
}

interface SimilarityMatrix {
  [key: string]: { [key: string]: number };
}

interface IntegrityAnalysisData {
  studentSimilarity: SimilarityMatrix;
  variantSimilarity: SimilarityMatrix;
}

export default function IntegrityAnalysisTab({ 
  analysisResult, 
  variantAnalysisResults,
  generationId 
}: IntegrityAnalysisProps) {
  const [integrityData, setIntegrityData] = useState<IntegrityAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMatrix, setActiveMatrix] = useState<'student' | 'variant' | 'flagged'>('student');
  const [selectedCell, setSelectedCell] = useState<{row: string, col: string, value: number, type?: 'matrix' | 'histogram'} | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [maxSimilarityThreshold, setMaxSimilarityThreshold] = useState(1.0);
  const [viewMode, setViewMode] = useState<'matrix' | 'list' | 'histogram'>('histogram');
  const [sortBy, setSortBy] = useState<'similarity' | 'similarity-low' | 'name'>('similarity');
  const [anonymizeIds, setAnonymizeIds] = useState(false);
  const [studentIndexMap, setStudentIndexMap] = useState<Map<string, number>>(new Map());
  const [invertVariantSimilarity, setInvertVariantSimilarity] = useState(false);

  useEffect(() => {
    fetchIntegrityData();
  }, [generationId]);

  // Create consistent student index mapping when data loads
  useEffect(() => {
    if (integrityData?.studentSimilarity) {
      const students = Object.keys(integrityData.studentSimilarity);
      const newIndexMap = new Map<string, number>();
      students.forEach((studentId, index) => {
        newIndexMap.set(studentId, index + 1);
      });
      setStudentIndexMap(newIndexMap);
    }
  }, [integrityData]);

  const fetchIntegrityData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/exam-generations/${generationId}/analysis/integrity`);
      if (!response.ok) {
        throw new Error('Failed to fetch integrity analysis data');
      }

      const data = await response.json();
      setIntegrityData(data);
    } catch (err) {
      console.error('Error fetching integrity data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integrity analysis');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (value: number) => {
    if (value === 1) return 'bg-red-500'; // Perfect similarity (bad - potential cheating)
    if (value >= 0.8) return 'bg-red-400'; // High similarity (bad - suspicious)
    if (value >= 0.6) return 'bg-orange-400'; // Medium similarity (concerning)
    if (value >= 0.4) return 'bg-yellow-400'; // Low similarity (acceptable)
    if (value >= 0.2) return 'bg-green-400'; // Very low similarity (good)
    return 'bg-green-500'; // No similarity (excellent)
  };

  const getSimilarityColorHex = (value: number) => {
    if (value === 1) return '#ef4444'; // red-500
    if (value >= 0.8) return '#f87171'; // red-400
    if (value >= 0.6) return '#fb923c'; // orange-400
    if (value >= 0.4) return '#fbbf24'; // yellow-400
    if (value >= 0.2) return '#4ade80'; // green-400
    return '#22c55e'; // green-500
  };

  const handleCellClick = (rowKey: string, colKey: string, value: number, type: 'matrix' | 'histogram' = 'matrix') => {
    setSelectedCell({ row: rowKey, col: colKey, value, type });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCell(null);
  };

  // Helper function to get display name
  const getDisplayName = (key: string, type: 'student' | 'variant' | 'flagged') => {
    if (type === 'student') {
      const match = key.match(/^(.+?)\s*\((.+?)\)$/);
      if (match) {
        const studentName = match[1];
        const fullVariantCode = match[2];
        
        // Extract clean variant code using helper function
        const cleanVariantCode = fullVariantCode.includes('-') 
          ? fullVariantCode.split('-')[1] 
          : fullVariantCode;
        
        if (anonymizeIds) {
          // Use the same format as overview charts: S001, S002, etc.
          const studentIndex = studentIndexMap.get(key) || 1;
          const anonymousId = `S${String(studentIndex).padStart(3, '0')}`;
          return `${anonymousId} (${cleanVariantCode})`;
        }
        
        return `${studentName} (${cleanVariantCode})`;
      }
      return key;
          } else if (type === 'variant') {
        return String(getVariantName(key));
      }
    return key;
  };

  // Filter and sort matrix data
  const getFilteredMatrixData = (matrix: SimilarityMatrix, type: 'student' | 'variant') => {
    const entries: Array<{row: string, col: string, value: number, displayRow: string, displayCol: string}> = [];
    
    Object.keys(matrix).forEach(rowKey => {
      Object.keys(matrix[rowKey]).forEach(colKey => {
        const value = matrix[rowKey][colKey];
        if (value >= similarityThreshold && value <= maxSimilarityThreshold && rowKey !== colKey) { // Exclude diagonal
          entries.push({
            row: rowKey,
            col: colKey,
            value,
            displayRow: getDisplayName(rowKey, type),
            displayCol: getDisplayName(colKey, type)
          });
        }
      });
    });

    // Sort by similarity (highest first) or by name
    if (sortBy === 'similarity') {
      entries.sort((a, b) => b.value - a.value);
    } else if (sortBy === 'similarity-low') {
      entries.sort((a, b) => a.value - b.value);
    } else {
      entries.sort((a, b) => a.displayRow.localeCompare(b.displayRow));
    }

    return entries;
  };

  const renderListView = (matrix: SimilarityMatrix, title: string, type: 'student' | 'variant') => {
    const filteredData = getFilteredMatrixData(matrix, type);
    
    if (filteredData.length === 0) {
      return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <div className="text-gray-500 text-center py-8">
            No similarities found between {similarityThreshold} and {maxSimilarityThreshold}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredData.map((entry, index) => (
            <div 
              key={`${entry.row}-${entry.col}-${index}`}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => handleCellClick(entry.row, entry.col, entry.value)}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-4 h-4 rounded ${getSimilarityColor(entry.value)}`}></div>
                <div>
                  <div className="font-medium text-gray-900">{entry.displayRow}</div>
                  <div className="text-sm text-gray-500">compared to</div>
                  <div className="font-medium text-gray-900">{entry.displayCol}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {entry.value.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  {entry.value >= 0.8 ? 'High Risk' : 
                   entry.value >= 0.6 ? 'Concerning' : 
                   entry.value >= 0.4 ? 'Acceptable' : 'Good'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHistogram = (matrix: SimilarityMatrix, title: string, type: 'student' | 'variant') => {
    const keys = Object.keys(matrix);
    if (keys.length === 0) return <div className="text-gray-500">No data available</div>;

    // Collect all similarity scores and student pairs (excluding self-comparisons)
    const similarityScores: number[] = [];
    const studentPairs: Array<{student1: string, student2: string, similarity: number}> = [];
    const processedPairs = new Set<string>();
    
    Object.keys(matrix).forEach((rowKey) => {
      Object.keys(matrix[rowKey]).forEach((colKey) => {
        // Skip self-comparisons
        if (rowKey === colKey) return;
        
        // Create a unique key for this pair (order doesn't matter)
        const pairKey = [rowKey, colKey].sort().join('|');
        
        // Skip if we've already processed this pair
        if (processedPairs.has(pairKey)) return;
        processedPairs.add(pairKey);
        
        const similarity = matrix[rowKey][colKey];
        similarityScores.push(similarity);
        studentPairs.push({
          student1: rowKey,
          student2: colKey,
          similarity
        });
      });
    });

    if (similarityScores.length === 0) {
      return (
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
          <div className="text-gray-500 text-center py-8">No similarity data available</div>
        </div>
      );
    }

    // Create histogram bins (10 bins from 0 to 1)
    const binCount = 10;
    const binSize = 1 / binCount;
    const bins: Array<{min: number, max: number, count: number, color: string}> = [];
    
    for (let i = 0; i < binCount; i++) {
      const min = i * binSize;
      const max = (i + 1) * binSize;
      const count = similarityScores.filter(score => score >= min && score < (i === binCount - 1 ? max + 0.001 : max)).length;
      
      // Determine color based on the middle of the bin
      const midPoint = (min + max) / 2;
      const color = getSimilarityColorHex(midPoint);
      
      bins.push({ min, max, count, color });
    }

    // Calculate dimensions
    const width = 800;
    const height = 400;
    const padding = 80;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;
    
    const maxCount = Math.max(...bins.map(bin => bin.count));

    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        
        <div className="overflow-x-auto">
          <svg width={width} height={height} className="border border-gray-200 rounded">
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Axes */}
            <line 
              x1={padding} y1={padding} x2={padding} y2={height - padding} 
              stroke="#374151" strokeWidth="2"
            />
            <line 
              x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} 
              stroke="#374151" strokeWidth="2"
            />
            
            {/* Axis labels */}
            <text x={width / 2} y={height - 10} textAnchor="middle" className="text-xs fill-gray-600">
              Similarity Score
            </text>
            <text 
              x={10} y={height / 2} textAnchor="middle" 
              transform={`rotate(-90, 10, ${height / 2})`}
              className="text-xs fill-gray-600"
            >
              Number of Pairs
            </text>
            
            {/* Y-axis ticks and labels */}
            {[0, Math.ceil(maxCount * 0.25), Math.ceil(maxCount * 0.5), Math.ceil(maxCount * 0.75), maxCount].map(tick => {
              const y = height - padding - (tick / maxCount) * chartHeight;
              
              return (
                <g key={tick}>
                  <line x1={padding} y1={y} x2={padding - 5} y2={y} stroke="#374151" strokeWidth="1"/>
                  <text x={padding - 10} y={y + 3} textAnchor="end" className="text-xs fill-gray-600">{tick}</text>
                </g>
              );
            })}
            
            {/* X-axis ticks and labels */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(tick => {
              const x = padding + (tick * chartWidth);
              
              return (
                <g key={tick}>
                  <line x1={x} y1={height - padding} x2={x} y2={height - padding + 5} stroke="#374151" strokeWidth="1"/>
                  <text x={x} y={height - padding + 20} textAnchor="middle" className="text-xs fill-gray-600">{tick}</text>
                </g>
              );
            })}
            
                        {/* Histogram bars */}
            {bins.map((bin, index) => {
              const barWidth = chartWidth / binCount;
              const x = padding + (bin.min * chartWidth);
              const barHeight = maxCount > 0 ? (bin.count / maxCount) * chartHeight : 0;
              const y = height - padding - barHeight;
              
              // Calculate average grade for this bin
              const pairsInBin = studentPairs.filter(pair => 
                pair.similarity >= bin.min && pair.similarity < (index === binCount - 1 ? bin.max + 0.001 : bin.max)
              );
              
              const uniqueStudents = new Set<string>();
              const studentScores: number[] = [];
              
              pairsInBin.forEach(pair => {
                if (!uniqueStudents.has(pair.student1)) {
                  uniqueStudents.add(pair.student1);
                  const studentResponse = analysisResult.metadata.studentResponses?.find((r: any) => 
                    r.studentId === pair.student1
                  );
                  if (studentResponse) {
                    const percent = (studentResponse.totalScore / studentResponse.maxPossibleScore) * 100;
                    studentScores.push(percent);
                  }
                }
                if (!uniqueStudents.has(pair.student2)) {
                  uniqueStudents.add(pair.student2);
                  const studentResponse = analysisResult.metadata.studentResponses?.find((r: any) => 
                    r.studentId === pair.student2
                  );
                  if (studentResponse) {
                    const percent = (studentResponse.totalScore / studentResponse.maxPossibleScore) * 100;
                    studentScores.push(percent);
                  }
                }
              });
              
              const averageGrade = studentScores.length > 0 
                ? (studentScores.reduce((sum, score) => sum + score, 0) / studentScores.length).toFixed(1)
                : 'N/A';
              
              return (
                <g key={index}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth - 1}
                    height={barHeight}
                    fill={bin.color}
                    stroke="#fff"
                    strokeWidth="1"
                    className="hover:opacity-80 transition-opacity"
                  />
                  {/* Bar label */}
                  {bin.count > 0 && (
                    <text
                      x={x + barWidth / 2}
                      y={y - 5}
                      textAnchor="middle"
                      className="text-xs font-medium fill-gray-700"
                    >
                      {bin.count}
                    </text>
                  )}
                  <title>
                    {`Similarity Range: ${bin.min.toFixed(1)} - ${bin.max.toFixed(1)}`}
                    {`\nNumber of Pairs: ${bin.count}`}
                    {`\nUnique Students: ${uniqueStudents.size}`}
                    {`\nAverage Grade: ${averageGrade}%`}
                    {`\nRisk Level: ${bin.min >= 0.8 ? 'High' : bin.min >= 0.6 ? 'Medium' : bin.min >= 0.4 ? 'Low' : bin.min >= 0.2 ? 'Good' : 'Excellent'}`}
                  </title>
                </g>
              );
            })}
            
            {/* Legend */}
            <g transform={`translate(${width - 150}, 20)`}>
              <rect width="130" height="120" fill="white" stroke="#d1d5db" strokeWidth="1" rx="4"/>
              <text x="65" y="15" textAnchor="middle" className="text-xs font-medium fill-gray-700">Risk Level</text>
              
              {[
                { color: '#ef4444', label: 'High (≥0.8)', y: 30 },
                { color: '#fb923c', label: 'Medium (≥0.6)', y: 50 },
                { color: '#fbbf24', label: 'Low (≥0.4)', y: 70 },
                { color: '#4ade80', label: 'Good (≥0.2)', y: 90 },
                { color: '#22c55e', label: 'Excellent (<0.2)', y: 110 }
              ].map((item, i) => (
                <g key={i}>
                  <rect x="5" y={item.y - 4} width="8" height="8" fill={item.color} rx="1"/>
                  <text x="18" y={item.y + 3} className="text-xs fill-gray-600">{item.label}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <p><strong>How to read:</strong></p>
          <p>• X-axis: Similarity score ranges (0.0-1.0)</p>
          <p>• Y-axis: Number of student pairs with that similarity score</p>
          <p>• Bar color: Risk level based on similarity score</p>
          <p>• Bar height: Number of pairs in that similarity range computed from the full matrix</p>
          <p>• Click any bar to see detailed information about that range</p>
          <p>• <strong>Total pairs analyzed:</strong> {similarityScores.length}</p>
        </div>
      </div>
    );
  };

  const renderMatrix = (matrix: SimilarityMatrix, title: string, type: 'student' | 'variant') => {
    const keys = Object.keys(matrix);
    if (keys.length === 0) return <div className="text-gray-500">No data available</div>;

    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {type === 'student' ? 'Student (Variant)' : 'Variant'}
                </th>
                {keys.map(key => (
                  <th key={key} className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getDisplayName(key, type)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(rowKey => (
                <tr key={rowKey}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900 border-b">
                    {getDisplayName(rowKey, type)}
                  </td>
                  {keys.map(colKey => (
                    <td key={colKey} className="px-3 py-2 text-center border-b">
                      <button
                        onClick={() => handleCellClick(rowKey, colKey, matrix[rowKey][colKey])}
                        className={`inline-block w-8 h-8 rounded ${getSimilarityColor(matrix[rowKey][colKey])} flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg cursor-pointer transform`}
                      >
                        <span className="text-xs font-medium text-white">
                          {matrix[rowKey][colKey] === 1 ? '1' : matrix[rowKey][colKey].toFixed(2)}
                        </span>
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
            <span>Perfect (1.00) - High Risk</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-400 rounded mr-2"></div>
            <span>High (≥0.80) - Suspicious</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-400 rounded mr-2"></div>
            <span>Medium (≥0.60) - Concerning</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-400 rounded mr-2"></div>
            <span>Low (≥0.40) - Acceptable</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-400 rounded mr-2"></div>
            <span>Very Low (≥0.20) - Good</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span>None (&lt;0.20) - Excellent</span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading integrity analysis...</div>
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
            <h3 className="text-sm font-medium text-red-800">Error loading integrity analysis</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!integrityData) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No integrity analysis data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">Exam Integrity Analysis</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Anonymize IDs</span>
            <button
              onClick={() => setAnonymizeIds(!anonymizeIds)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                anonymizeIds ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  anonymizeIds ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Analyze the similarity between students and exam variants to detect potential integrity issues.
        </p>
      </div>

      {/* Matrix Selection Tabs */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveMatrix('student')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeMatrix === 'student'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Student Similarity Matrix
            </button>
            <button
              onClick={() => setActiveMatrix('variant')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeMatrix === 'variant'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Variant Similarity Matrix
            </button>
            <button
              onClick={() => setActiveMatrix('flagged')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeMatrix === 'flagged'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Flagged Submissions
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeMatrix === 'student' && integrityData.studentSimilarity && (
            <div>
              {/* Controls for student matrix */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">View Mode:</label>
                    <select
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as 'matrix' | 'list' | 'histogram')}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                    >
                      <option value="histogram">Histogram</option>
                      <option value="matrix">Full Matrix</option>
                      <option value="list">Filtered List</option>
                    </select>
                  </div>
                  
                  {viewMode === 'list' && (
                    <>
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Min Similarity:</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={similarityThreshold}
                          onChange={(e) => setSimilarityThreshold(parseFloat(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600">{similarityThreshold}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Max Similarity:</label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={maxSimilarityThreshold}
                          onChange={(e) => setMaxSimilarityThreshold(parseFloat(e.target.value))}
                          className="w-24"
                        />
                        <span className="text-sm text-gray-600">{maxSimilarityThreshold}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">Sort by:</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as 'similarity' | 'similarity-low' | 'name')}
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        >
                          <option value="similarity">Similarity (High to Low)</option>
                          <option value="similarity-low">Similarity (Low to High)</option>
                          <option value="name">Name (A-Z)</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Render appropriate view */}
              {viewMode === 'matrix' && renderMatrix(
                integrityData.studentSimilarity, 
                'Student Similarity Matrix - Option Choice Patterns', 
                'student'
              )}
              {viewMode === 'list' && renderListView(
                integrityData.studentSimilarity, 
                'High Similarity Pairs - Student Option Choices', 
                'student'
              )}
              {viewMode === 'histogram' && renderHistogram(
                integrityData.studentSimilarity, 
                'Student Similarity Distribution', 
                'student'
              )}
              
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Interpretation:</strong> This matrix shows how similar students' option choices are across all questions.</p>
                <p>• Values of 1.0 indicate identical answer patterns if varaints are different</p>
              </div>
            </div>
          )}

          {activeMatrix === 'variant' && integrityData.variantSimilarity && (
            <div>
              {renderMatrix(
                integrityData.variantSimilarity, 
                'Variant Similarity Matrix - Question & Option Order', 
                'variant'
              )}
              <div className="mt-4 text-sm text-gray-600">
                <p><strong>Interpretation:</strong> This matrix shows how similar exam variants are in terms of question order and option arrangements.</p>
                <p>• Values of 1.0 indicate identical question/option ordering</p>
                <p>• Lower values indicate more randomization between variants</p>
                <p>• Diagonal values are always 1.0 (variant compared to itself)</p>
              </div>
            </div>
          )}

          {activeMatrix === 'flagged' && integrityData && (
            <div>
              {/* Controls for flagged submissions */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Invert Variant Similarity:</label>
                    <button
                      onClick={() => setInvertVariantSimilarity(!invertVariantSimilarity)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        invertVariantSimilarity ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          invertVariantSimilarity ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-gray-600">
                      {invertVariantSimilarity ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Invert Variant Similarity:</strong> When enabled, treats students with different variants as more suspicious than those with similar variants.</p>
                </div>
              </div>

              <FlaggedSubmissionsTab
                analysisResult={analysisResult}
                generationId={generationId}
                studentSimilarityMatrix={integrityData.studentSimilarity}
                variantSimilarityMatrix={integrityData.variantSimilarity}
                variantAnalysisResults={variantAnalysisResults}
                anonymizeIds={anonymizeIds}
                studentIndexMap={studentIndexMap}
                invertVariantSimilarity={invertVariantSimilarity}
              />
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {analysisResult.metadata.totalStudents}
            </div>
            <div className="text-sm text-gray-600">Total Students</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {analysisResult.metadata.totalVariants}
            </div>
            <div className="text-sm text-gray-600">Exam Variants</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {analysisResult.questionResults.length}
            </div>
            <div className="text-sm text-gray-600">Questions Analyzed</div>
          </div>
        </div>
        
        {/* Variant Breakdown */}
        {analysisResult.metadata.studentResponses && (
          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Variant Breakdown</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(() => {
                const variantCounts = new Map<string, number>();
                analysisResult.metadata.studentResponses.forEach(response => {
                  const variantCode = response.variantCode;
                  const cleanVariantCode = variantCode.includes('-') 
                    ? variantCode.split('-')[1] 
                    : variantCode;
                  variantCounts.set(cleanVariantCode, (variantCounts.get(cleanVariantCode) || 0) + 1);
                });
                
                return Array.from(variantCounts.entries()).map(([variantCode, count]) => (
                  <div key={variantCode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{variantCode}</span>
                    <span className="text-sm text-gray-600">{count} students</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Modal for detailed similarity */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl p-6 ${selectedCell.type === 'histogram' ? 'max-w-4xl w-full max-h-[80vh] overflow-y-auto' : 'max-w-md w-full'}`}>
            {selectedCell.type === 'histogram' ? (
              // Histogram modal - show unique students
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Students in {selectedCell.row}: {selectedCell.col}
                </h3>
                <p className="text-gray-600 mb-4">
                  Similarity Range: {selectedCell.col} | Unique Students: {(window as any).histogramStudentsData?.length || 0}
                </p>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(window as any).histogramStudentsData?.map((studentId: string, index: number) => {
                    // Extract student info
                    const studentMatch = studentId.match(/^(.+?)\s*\((.+?)\)$/);
                    const studentName = studentMatch ? studentMatch[1] : studentId;
                    const studentVariant = studentMatch ? studentMatch[2] : 'Unknown';
                    
                    // Find student scores from analysis result
                    const studentResponse = analysisResult.metadata.studentResponses?.find((r: any) => 
                      r.studentId === studentId || r.studentId.includes(studentName)
                    );
                    
                    const studentScore = studentResponse?.totalScore || 0;
                    const studentMaxScore = studentResponse?.maxPossibleScore || 1;
                    const studentPercent = studentMaxScore > 0 ? ((studentScore / studentMaxScore) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="text-sm font-medium text-gray-500 w-8">
                            {index + 1}.
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {anonymizeIds ? `S${studentIndexMap.get(studentId) || '???'}` : studentName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Variant: {studentVariant}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {studentScore}/{studentMaxScore}
                          </div>
                          <div className="text-sm text-gray-500">
                            {studentPercent}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <button
                  onClick={closeModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              // Regular matrix modal
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Detailed Similarity: {getDisplayName(selectedCell.row, activeMatrix)} vs {getDisplayName(selectedCell.col, activeMatrix)}
                </h3>
                <p className="text-gray-600 mb-4">
                  Similarity Score: {selectedCell.value.toFixed(2)}
                </p>
                <div className="text-sm text-gray-500">
                  <p><strong>Interpretation:</strong> This score indicates the degree of similarity between the two items.</p>
                  <p>• 1.00: Perfect similarity (identical or very close)</p>
                  <p>• 0.80-0.99: High similarity (suspicious or concerning)</p>
                  <p>• 0.60-0.79: Medium similarity (concerning or acceptable)</p>
                  <p>• 0.40-0.59: Low similarity (acceptable or good)</p>
                  <p>• 0.20-0.39: Very low similarity (good or excellent)</p>
                  <p>• &lt;0.20: No similarity (excellent)</p>
                </div>
                <button
                  onClick={closeModal}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 