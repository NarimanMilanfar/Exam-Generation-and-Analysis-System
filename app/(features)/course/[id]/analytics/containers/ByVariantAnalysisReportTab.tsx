/**
 * ByVariantAnalysisReportTab - Side-by-Side Variant Comparison Component
 * 
 * This component provides a comprehensive side-by-side comparison of exam variants,
 * displaying performance metrics, question analysis, and navigation controls for
 * comparing multiple exam variants simultaneously.
 * 
 * Features:
 * - Side-by-side variant comparison with navigation controls
 * - Compact question analysis cards for each variant
 * - Performance metrics overview (difficulty, discrimination, point-biserial)
 * - Option analysis showing correct answers and distractors
 * - Responsive design with variant selection controls
 * 
 * @param {VariantAnalysisReportProps} props - Component props containing analysis data
 * @param {BiPointAnalysisResult} props.analysisResult - Overall exam analysis results
 * @param {BiPointAnalysisResult[]} props.variantAnalysisResults - Array of variant-specific analysis results
 * 
 * @returns {JSX.Element} A comprehensive variant comparison interface
 */
import React, { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";


// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

import {
  VariantAnalysisReportProps,
  QuestionAnalysisCardProps,
  BiPointAnalysisResult,
} from "../../../../../types/analysis";
import {
  getQualityIndicator,
  getVariantCode,
  getStudentCount,
  getAverageGrade,
  getPercentagePassed,
  sortVariantsByCode,
  getVariantName,
} from "../../../../../components/analytics/helpers";

// Compact question card for side-by-side view
function CompactQuestionCard({
  question,
  questionNumber,
  variantCode,
}: QuestionAnalysisCardProps) {

  const difficultyIndicator = getQualityIndicator(question.difficultyIndex, "difficulty");
  const discriminationIndicator = getQualityIndicator(question.discriminationIndex, "discrimination");
  const pointBiserialIndicator = getQualityIndicator(question.pointBiserialCorrelation, "pointBiserial");

  return (
    <div className="bg-white rounded-lg border shadow-sm p-4 mb-3">
      {/* Question Header */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-gray-900">
          Q{questionNumber}: {question.questionText.length > 50 
            ? question.questionText.substring(0, 50) + "..." 
            : question.questionText}
        </h5>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          {question.correctResponses}/{question.totalResponses}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Difficulty</div>
          <div className="text-sm font-bold text-gray-900">
            {(question.difficultyIndex * 100).toFixed(0)}%
          </div>
          <div className={`text-xs px-1 py-0.5 rounded ${difficultyIndicator.color}`}>
            {difficultyIndicator.label}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Discrimination</div>
          <div className="text-sm font-bold text-gray-900">
            {question.discriminationIndex.toFixed(3)}
          </div>
          <div className={`text-xs px-1 py-0.5 rounded ${discriminationIndicator.color}`}>
            {discriminationIndicator.label}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-1">Point-Biserial</div>
          <div className="text-sm font-bold text-gray-900">
            {question.pointBiserialCorrelation.toFixed(3)}
          </div>
          <div className={`text-xs px-1 py-0.5 rounded ${pointBiserialIndicator.color}`}>
            {pointBiserialIndicator.label}
          </div>
        </div>
      </div>

      {/* Detailed Option Statistics */}
      <div className="mt-3">
        <div className="text-xs text-gray-600 mb-2">Option Analysis</div>
        <div className="space-y-1">
          {/* Show correct option first if it exists */}
          {question.distractorAnalysis.correctOption && (
            <div className="flex items-center justify-between p-2 rounded text-xs bg-green-50 border border-green-200">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-green-700">
                  {question.distractorAnalysis.correctOption.option} ✓
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-600">
                  {question.distractorAnalysis.correctOption.frequency} students
                </span>
                <span className="text-gray-500 font-medium">
                  {question.distractorAnalysis.correctOption.percentage.toFixed(1)}%
                </span>
                <span className={`px-1 py-0.5 rounded ${
                  question.distractorAnalysis.correctOption.discriminationIndex > 0.3 ? "bg-green-100 text-green-700" :
                  question.distractorAnalysis.correctOption.discriminationIndex > 0.2 ? "bg-blue-100 text-blue-700" :
                  question.distractorAnalysis.correctOption.discriminationIndex > 0.1 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  D: {question.distractorAnalysis.correctOption.discriminationIndex.toFixed(3)}
                </span>
                <span className={`px-1 py-0.5 rounded ${
                  question.distractorAnalysis.correctOption.pointBiserialCorrelation > 0.3 ? "bg-green-100 text-green-700" :
                  question.distractorAnalysis.correctOption.pointBiserialCorrelation > 0.2 ? "bg-blue-100 text-blue-700" :
                  question.distractorAnalysis.correctOption.pointBiserialCorrelation > 0.1 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  PB: {question.distractorAnalysis.correctOption.pointBiserialCorrelation.toFixed(3)}
                </span>
              </div>
            </div>
          )}
          
          {/* Show all distractors */}
          {question.distractorAnalysis.distractors.map((distractor, index) => (
            <div
              key={distractor.option}
              className="flex items-center justify-between p-2 rounded text-xs bg-gray-50 border border-gray-200"
            >
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-700">
                  {distractor.option}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-gray-600">
                  {distractor.frequency} students
                </span>
                <span className="text-gray-500 font-medium">
                  {distractor.percentage.toFixed(1)}%
                </span>
                <span className={`px-1 py-0.5 rounded ${
                  distractor.discriminationIndex > 0.3 ? "bg-green-100 text-green-700" :
                  distractor.discriminationIndex > 0.2 ? "bg-blue-100 text-blue-700" :
                  distractor.discriminationIndex > 0.1 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  D: {distractor.discriminationIndex.toFixed(3)}
                </span>
                <span className={`px-1 py-0.5 rounded ${
                  distractor.pointBiserialCorrelation > 0.3 ? "bg-green-100 text-green-700" :
                  distractor.pointBiserialCorrelation > 0.2 ? "bg-blue-100 text-blue-700" :
                  distractor.pointBiserialCorrelation > 0.1 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  PB: {distractor.pointBiserialCorrelation.toFixed(3)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Reusable variant display component
function VariantDisplayCard({
  variant,
  variantIndex,
  position,
}: {
  variant: BiPointAnalysisResult;
  variantIndex: number;
  position: 'left' | 'right';
}) {

  return (
    <div
      key={`${position}-${variantIndex}`}
      className="bg-white rounded-lg border shadow-sm overflow-hidden"
    >
      {/* Variant Header */}
      <div className="brand-color text-white px-6 py-4">
        <h3 className="text-xl font-bold mb-2">
          Variant {getVariantName(getVariantCode(variant))}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold">{getStudentCount(variant)}</div>
            <div className="text-xs text-white-200">Students</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">
              {(variant.summary.averageDifficulty * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-white-200">Avg Difficulty</div>
          </div>
        </div>
      </div>

      {/* Variant Metrics Summary */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Avg Discrimination</div>
            <div className="text-lg font-bold text-gray-900">
              {variant.summary.averageDiscrimination.toFixed(3)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Avg Point-Biserial</div>
            <div className="text-lg font-bold text-gray-900">
              {variant.summary.averagePointBiserial.toFixed(3)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">Avg Grade</div>
            <div className="text-lg font-bold text-gray-900">
              {getAverageGrade(variant).toFixed(1)}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">% passed above 50%</div>
            <div className="text-lg font-bold text-gray-900">
              {getPercentagePassed(variant).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Questions ({variant.questionResults.length})
        </h4>
        <div className="space-y-2">
          {variant.questionResults.map((question, index) => (
            <CompactQuestionCard
              key={question.questionId}
              question={question}
              questionNumber={index + 1}
              variantCode={getVariantCode(variant)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ByVariantAnalysisReportTab({
  analysisResult,
  variantAnalysisResults,
}: VariantAnalysisReportProps) {
  const [leftVariantIndex, setLeftVariantIndex] = useState(0);
  const [rightVariantIndex, setRightVariantIndex] = useState(1);
  const [leftInputValue, setLeftInputValue] = useState('1');
  const [rightInputValue, setRightInputValue] = useState('2');
  
  // Sort variants by variant code in ascending order (V1, V2, V3, etc.)
  const sortedVariants = sortVariantsByCode(variantAnalysisResults);
  
  // Always show 2 variants for comparison
  const totalVariants = sortedVariants.length;
  


  const nextPage = () => {
    // Only move if we can show two variants and right variant isn't at the end
    if (rightVariantIndex < totalVariants - 1) {
      setLeftVariantIndex(leftVariantIndex + 1);
      setRightVariantIndex(rightVariantIndex + 1);
      // Update input values to match
      setLeftInputValue((leftVariantIndex + 2).toString());
      setRightInputValue((rightVariantIndex + 2).toString());
    }
  };

  const prevPage = () => {
    // Only move if left variant isn't at the beginning
    if (leftVariantIndex > 0) {
      setLeftVariantIndex(leftVariantIndex - 1);
      setRightVariantIndex(rightVariantIndex - 1);
      // Update input values to match
      setLeftInputValue(leftVariantIndex.toString());
      setRightInputValue((rightVariantIndex).toString());
    }
  };

  const handleLeftVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLeftInputValue(value); // Always update the input value
    
    if (value === '') return; // Don't update variant if empty
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalVariants) {
      setLeftVariantIndex(numValue - 1); // Convert to 0-based index
    }
  };

  const handleRightVariantChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRightInputValue(value); // Always update the input value
    
    if (value === '') return; // Don't update variant if empty
    
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= totalVariants) {
      setRightVariantIndex(numValue - 1); // Convert to 0-based index
    }
  };

  const handleLeftVariantBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Default to 1 if empty or non-numeric
    if (value === '' || isNaN(parseInt(value))) {
      setLeftVariantIndex(0); // 0-based index for variant 1
      setLeftInputValue('1'); // Update input value to show 1
      return;
    }
    
    const numValue = parseInt(value);
    
    // Clamp values: minimum 1, maximum totalVariants
    if (numValue < 1) {
      setLeftVariantIndex(0); // 0-based index for variant 1
      setLeftInputValue('1'); // Update input value to show 1
    } else if (numValue > totalVariants) {
      setLeftVariantIndex(totalVariants - 1); // 0-based index for last variant
      setLeftInputValue(totalVariants.toString()); // Update input value to show max
    } else {
      setLeftVariantIndex(numValue - 1); // Convert to 0-based index
      setLeftInputValue(numValue.toString()); // Update input value to show the number
    }
  };

  const handleRightVariantBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Default to 1 if empty or non-numeric
    if (value === '' || isNaN(parseInt(value))) {
      setRightVariantIndex(0); // 0-based index for variant 1
      setRightInputValue('1'); // Update input value to show 1
      return;
    }
    
    const numValue = parseInt(value);
    
    // Clamp values: minimum 1, maximum totalVariants
    if (numValue < 1) {
      setRightVariantIndex(0); // 0-based index for variant 1
      setRightInputValue('1'); // Update input value to show 1
    } else if (numValue > totalVariants) {
      setRightVariantIndex(totalVariants - 1); // 0-based index for last variant
      setRightInputValue(totalVariants.toString()); // Update input value to show max
    } else {
      setRightVariantIndex(numValue - 1); // Convert to 0-based index
      setRightInputValue(numValue.toString()); // Update input value to show the number
    }
  };

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="brand-color text-white px-6 py-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-2">
          Side-by-Side Variant Analysis
        </h2>
        <p className="text-blue-100 mb-4">
          Compare {analysisResult.examTitle} variants side by side
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">
              {analysisResult.metadata.sampleSize}
            </div>
            <div className="text-sm text-blue-200">Total Students</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {sortedVariants.length}
            </div>
            <div className="text-sm text-blue-200">Variants</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {analysisResult.questionResults.length}
            </div>
            <div className="text-sm text-blue-200">Questions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(analysisResult.summary.averageDifficulty * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-blue-200">Overall Avg Difficulty</div>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      {totalVariants > 1 && (
        <div className="flex items-center justify-between bg-white rounded-lg border p-4">
          <button
            onClick={prevPage}
            disabled={leftVariantIndex === 0}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              leftVariantIndex === 0
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <span>Variants</span>
            <input
              type="number"
              min="1"
              max={totalVariants}
              value={leftInputValue}
              onChange={handleLeftVariantChange}
              onBlur={handleLeftVariantBlur}
              className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span>-</span>
            <input
              type="number"
              min="1"
              max={totalVariants}
              value={rightInputValue}
              onChange={handleRightVariantChange}
              onBlur={handleRightVariantBlur}
              className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span>of {totalVariants}</span>
          </div>
          
          <button
            onClick={nextPage}
            disabled={rightVariantIndex >= totalVariants - 1}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              rightVariantIndex >= totalVariants - 1
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Side-by-Side Variant Comparison */}
      <div className="relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Variant */}
          {sortedVariants[leftVariantIndex] && (
            <VariantDisplayCard
              variant={sortedVariants[leftVariantIndex]}
              variantIndex={leftVariantIndex}
              position="left"
            />
          )}

          {/* Right Variant */}
          {sortedVariants[rightVariantIndex] && (
            <VariantDisplayCard
              variant={sortedVariants[rightVariantIndex]}
              variantIndex={rightVariantIndex}
              position="right"
            />
          )}
        </div>
      </div>

      {/* Empty State for Odd Number of Variants */}
      {(!sortedVariants[leftVariantIndex] || !sortedVariants[rightVariantIndex]) && totalVariants > 1 && (
        <div className="lg:col-span-1 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center p-8">
          <div className="text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">Use navigation to see more variants</p>
          </div>
        </div>
      )}

      {/* Report Footer */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4"> </h3>
        <div className="space-y-3 text-sm text-gray-700">
          {/* empty footer space */}
          </div>
      </div>
    </div>
  );
}
