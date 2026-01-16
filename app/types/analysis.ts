/*
Unified Analysis Types for Bi-Point Analysis System

This file contains all the interfaces and types needed for the exam analysis system.
It serves as the single source for data structures used across:
- biPointAnalysis.ts (core analysis logic)
- examResultsAdapter.ts (data transformation)
- UI components (charts, reports, etc.)

STREAMLINED DATA FLOW:
=====================

1. DATA PREPARATION (examResultsAdapter.ts):
   ```typescript
   import { getDataForBiPointAnalysis } from './examResultsAdapter';
   
   const { studentResponses, examVariants, examMetadata } = 
     await getDataForBiPointAnalysis(examId);
   ```

2. ANALYSIS EXECUTION (biPointAnalysis.ts):
   ```typescript
   import { analyzeExam } from './biPointAnalysis';
   
   const analysisResult = await analyzeExam(examVariants, studentResponses, {
     examTitle: examMetadata.title,
     minSampleSize: 10,
     includeDistractorAnalysis: true,
     confidenceLevel: 0.95
   });
   ```

3. UI DISPLAY (components):
   ```typescript
   import { BiPointAnalysisResult, AnalysisDisplayProps } from '../types/analysis';
   
   <BiPointAnalysisCharts analysisResult={analysisResult} />
   <SummaryAnalysisReport analysisResult={analysisResult} />
   <VariantAnalysisReport analysisResult={analysisResult} />
   ```

KEY INTERFACES:
==============

Core Data:
- StudentResponse: Individual student's exam responses
- QuestionResponse: Single question response
- ExamVariantForAnalysis: Exam variant with questions
- AnalysisQuestion: Question structure for analysis

Results:
- BiPointAnalysisResult: Complete analysis output
- QuestionAnalysisResult: Single question analysis
- DistractorAnalysis: Incorrect answer analysis
- StatisticalSignificance: Statistical test results

Configuration:
- AnalysisConfig: Analysis parameters
- VariantMetadata: Variant-specific data

UI Props:
- AnalysisDisplayProps: Props for components that display analysis results
- VariantAnalysisReportProps: Variant analysis props (includes additional variant data)
- QuestionAnalysisCardProps: Individual question card props
*/

import { QuestionType } from "./course";

// ============================================================================
// CORE DATA STRUCTURES
// ============================================================================

/**
 * Core question interface used throughout the analysis system
 */
export interface AnalysisQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  correctAnswer: string;
  options: string[];
  points: number;
}

/**
 * Core student response interface
 */
export interface StudentResponse {
  studentId: string;
  displayStudentId?: string; 
  name?: string; 
  variantCode: string;
  questionResponses: QuestionResponse[];
  totalScore: number;
  maxPossibleScore: number;
  completionTime?: number; // in minutes
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Individual question response
 */
export interface QuestionResponse {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  points: number;
  maxPoints: number;
  responseTime?: number; // in seconds
}

/**
 * Exam variant with questions for analysis
 */
export interface ExamVariantForAnalysis {
  id: string;
  examId?: string;
  examTitle?: string;
  variantCode?: string;
  questions: AnalysisQuestion[];
  metadata?: VariantMetadata;
}

/**
 * Variant metadata for unmapping responses
 */
export interface VariantMetadata {
  questionOrder?: number[];
  optionPermutations?: { [questionId: string]: number[] };
  answerKey?: string; // Raw JSON string
}

// ============================================================================
// ANALYSIS CONFIGURATION
// ============================================================================

/**
 * Configuration for bi-point analysis
 */
export interface AnalysisConfig {
  minSampleSize?: number;
  includeDiscriminationIndex?: boolean;
  includeDifficultyIndex?: boolean;
  includePointBiserial?: boolean;
  includeDistractorAnalysis?: boolean;
  confidenceLevel?: number;
  excludeIncompleteData?: boolean;
  groupByQuestionType?: boolean;
}

// ============================================================================
// ANALYSIS RESULTS
// ============================================================================

/**
 * Main analysis result for a single question
 */
export interface QuestionAnalysisResult {
  questionId: string;
  questionText: string;
  questionType: QuestionType;
  totalResponses: number;
  correctResponses: number;
  difficultyIndex: number;
  discriminationIndex: number;
  pointBiserialCorrelation: number;
  distractorAnalysis: DistractorAnalysis;
  statisticalSignificance: StatisticalSignificance;
  reliabilityMetrics?: ReliabilityMetrics;
}

/**
 * Distractor analysis for incorrect answer choices
 */
export interface DistractorAnalysis {
  distractors: DistractorOption[];
  correctOption?: DistractorOption;
  omittedResponses: number;
  omittedPercentage: number;
}

/**
 * Individual option analysis (correct or distractor)
 */
export interface DistractorOption {
  option: string;
  frequency: number;
  percentage: number;
  discriminationIndex: number;
  pointBiserialCorrelation: number;
}

/**
 * Statistical significance testing results
 */
export interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  criticalValue: number;
  degreesOfFreedom: number;
  testStatistic: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
  warnings?: string[];
}

/**
 * Reliability metrics
 */
export interface ReliabilityMetrics {
  cronbachsAlpha?: number;
  standardError?: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}

/**
 * Overall analysis summary
 */
export interface AnalysisSummary {
  averageDifficulty: number;
  averageDiscrimination: number;
  averagePointBiserial: number;
  reliabilityMetrics?: ReliabilityMetrics;
  scoreDistribution?: ScoreDistribution;
}

/**
 * Score distribution statistics
 */
export interface ScoreDistribution {
  mean: number;
  median: number;
  standardDeviation: number;
  skewness: number | null;
  kurtosis: number | null;
  min: number;
  max: number;
  quartiles: [number, number, number];
}

/**
 * Main analysis result containing all data
 */
export interface BiPointAnalysisResult {
  examId: string;
  examTitle: string;
  analysisConfig: AnalysisConfig;
  questionResults: QuestionAnalysisResult[];
  summary: AnalysisSummary;
  metadata: AnalysisMetadata;
  variantResults?: VariantAnalysisResult[];
}

/**
 * Analysis metadata
 */
export interface AnalysisMetadata {
  totalStudents: number;
  totalVariants: number;
  analysisDate: Date;
  sampleSize: number;
  excludedStudents: number;
  studentResponses?: StudentResponse[];
}

/**
 * Variant-specific analysis result 
 */
export interface VariantAnalysisResult {
  variantCode: string;
  studentCount: number;
  questionResults: QuestionAnalysisResult[];
  averageDifficulty: number;
  averageDiscrimination: number;
  averagePointBiserial: number;
}

// ============================================================================
// ADAPTER INTERFACES
// ============================================================================

/**
 * Raw exam result from database
 */
export interface RawExamResult {
  id: string;
  studentId: string;
  examId: string;
  variantCode: string | null;
  score: number;
  totalPoints: number;
  percentage: number | null;
  createdAt: Date;
  updatedAt: Date;
  studentAnswers: RawStudentAnswer[];
  student: {
    id: string;
    name: string;
    studentId: string | null;
  };
}

/**
 * Raw student answer from database
 */
export interface RawStudentAnswer {
  questionId: string;
  studentAnswer: string;
  isCorrect: boolean;
  points: number;
}

/**
 * Exam metadata
 */
export interface ExamMetadata {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Data preparation summary
 */
export interface DataPreparationSummary {
  totalStudents: number;
  totalVariants: number;
  totalQuestions: number;
  completedExams: number;
}

// ============================================================================
// UI-SPECIFIC INTERFACES
// ============================================================================

/**
 * Props for analysis components that display analysis results
 */
export interface AnalysisDisplayProps {
  analysisResult: BiPointAnalysisResult;
}

/**
 * Props for variant analysis report
 */
export interface VariantAnalysisReportProps {
  analysisResult: BiPointAnalysisResult;
  variantAnalysisResults: BiPointAnalysisResult[];
}

/**
 * Props for question analysis card
 */
export interface QuestionAnalysisCardProps {
  question: QuestionAnalysisResult;
  questionNumber: number;
  variantCode?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Quality indicator for question metrics
 */
export interface QualityIndicator {
  label: string;
  color: string;
}

/**
 * Response data for charts and tables
 */
export interface ResponseData {
  option: string;
  frequency: number;
  percentage: number;
  pointBiserial: number;
  isCorrect: boolean;
}

/**
 * Chart data structure
 */
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    borderRadius?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    borderDash?: number[];
  }[];
}

/**
 * Chart options structure
 */
export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio?: boolean;
  plugins: {
    legend: {
      position?: 'top' | 'bottom' | 'left' | 'right';
      display?: boolean;
    };
    title: {
      display: boolean;
      text: string;
      font?: { size: number; weight: string };
    };
    tooltip: {
      callbacks?: {
        title?: (context: any) => string;
        label?: (context: any) => string | string[];
        afterLabel?: (context: any) => string | string[];
      };
    };
  };
  scales: {
    x?: {
      title?: {
        display: boolean;
        text: string;
        font?: { size: number };
      };
      min?: number;
      max?: number;
    };
    y?: {
      beginAtZero?: boolean;
      title?: {
        display: boolean;
        text: string;
        font?: { size: number };
      };
      min?: number;
      max?: number;
      ticks?: {
        stepSize?: number;
      };
    };
  };
}
