import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AnalyticsExportModal from '../../../app/components/exams/AnalyticsExportModal';
import { BiPointAnalysisResult } from '../../../app/types/analysis';
import { PercentileRange } from '../../../app/components/analytics/PercentileFilter';
import { getFilterLabel } from '../../../app/lib/percentileFilter';
import { QuestionType } from '../../../app/types/course';

// Mock toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

describe('Reporting Integration with Percentile Filters', () => {
  const mockAnalysisResult: BiPointAnalysisResult = {
    examId: 'exam-123',
    examTitle: 'Sample Exam',
    analysisConfig: {
      minSampleSize: 1,
      includeDiscriminationIndex: true,
      includeDifficultyIndex: true,
      includePointBiserial: true,
      includeDistractorAnalysis: true,
      confidenceLevel: 0.95,
  
    },
    summary: {
      averageDifficulty: 0.75,
      averageDiscrimination: 0.4,
      averagePointBiserial: 0.35,
      reliabilityMetrics: {
        cronbachsAlpha: 0.8,
        standardError: 0.1
      },
      scoreDistribution: {
        mean: 75,
        median: 75,
        standardDeviation: 12,
        skewness: 0,
        kurtosis: 0,
        min: 40,
        max: 100,
        quartiles: [60, 75, 90]
      }
    },
    questionResults: [
      {
        questionId: 'q1',
        questionText: 'Sample Question',
        questionType: QuestionType.MULTIPLE_CHOICE,
        difficultyIndex: 0.8,
        discriminationIndex: 0.5,
        pointBiserialCorrelation: 0.4,
        correctResponses: 20,
        totalResponses: 25,
        distractorAnalysis: {
          distractors: [],
          omittedResponses: 0,
          omittedPercentage: 0
        },
        statisticalSignificance: { 
          isSignificant: true, 
          pValue: 0.01,
          criticalValue: 1.96,
          degreesOfFreedom: 23,
          testStatistic: 2.5
        }
      }
    ],
    metadata: {
      totalStudents: 25,
      sampleSize: 25,
      analysisDate: new Date(),
      totalVariants: 2,
      excludedStudents: 0,
      studentResponses: []
    }
  };

  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    generationId: 'test-gen-123',
    analysisResult: mockAnalysisResult,
    examTitle: 'Sample Exam'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Export Modal Functionality', () => {
    it('should render export modal with basic elements', () => {
      render(<AnalyticsExportModal {...mockProps} />);

      expect(screen.getByText('Export Analytics Data')).toBeInTheDocument();
      expect(screen.getByText('Export Options')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export analytics/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should show export options checkboxes', () => {
      render(<AnalyticsExportModal {...mockProps} />);

      expect(screen.getByLabelText(/overall analytics/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/question analysis/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/student performance mapping/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/statistical data/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/difficulty distribution/i)).toBeInTheDocument();
    });
  });

  describe('Percentile Filter Integration', () => {
    it('should show percentile filter status when Top 25% filter is active', () => {
      const percentileFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          percentileFilter={percentileFilter} 
        />
      );

      expect(screen.getByText('Filtered Export Active')).toBeInTheDocument();
      expect(screen.getByText(/exporting filtered analytics for/i)).toBeInTheDocument();
      expect(screen.getByText('Top 25%')).toBeInTheDocument();
    });

    it('should show percentile filter status when Bottom 25% filter is active', () => {
      const percentileFilter: PercentileRange = { from: 0, to: 25, label: 'Bottom 25%' };
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          percentileFilter={percentileFilter} 
        />
      );

      expect(screen.getByText('Filtered Export Active')).toBeInTheDocument();
      expect(screen.getByText('Bottom 25%')).toBeInTheDocument();
    });

    it('should show custom percentile filter label', () => {
      const percentileFilter: PercentileRange = { from: 30, to: 70 };
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          percentileFilter={percentileFilter} 
        />
      );

      expect(screen.getByText('Filtered Export Active')).toBeInTheDocument();
      expect(screen.getByText('30% - 70%')).toBeInTheDocument();
    });

    it('should NOT show filter status when no filter is active', () => {
      render(<AnalyticsExportModal {...mockProps} />);

      expect(screen.queryByText('Filtered Export Active')).not.toBeInTheDocument();
    });

    it('should display filter icon when filter is active', () => {
      const percentileFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          percentileFilter={percentileFilter} 
        />
      );

      // Check for SVG filter icon presence in the parent container
      const filterSection = screen.getByText('Filtered Export Active').closest('.bg-blue-50');
      expect(filterSection).toContainHTML('<svg');
    });
  });

  describe('Export Option Interactions', () => {
    it('should allow toggling export options', () => {
      render(<AnalyticsExportModal {...mockProps} />);

      const overallAnalyticsCheckbox = screen.getByLabelText(/overall analytics/i);
      const questionAnalysisCheckbox = screen.getByLabelText(/question analysis/i);

      // Initially checked
      expect(overallAnalyticsCheckbox).toBeChecked();
      expect(questionAnalysisCheckbox).toBeChecked();

      // Uncheck options
      fireEvent.click(overallAnalyticsCheckbox);
      fireEvent.click(questionAnalysisCheckbox);

      expect(overallAnalyticsCheckbox).not.toBeChecked();
      expect(questionAnalysisCheckbox).not.toBeChecked();
    });

    it('should work with percentile filter and export options together', () => {
      const percentileFilter: PercentileRange = { from: 25, to: 75, label: 'Middle 50%' };
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          percentileFilter={percentileFilter} 
        />
      );

      // Both filter status and export options should be visible
      expect(screen.getByText('Filtered Export Active')).toBeInTheDocument();
      expect(screen.getByText('Middle 50%')).toBeInTheDocument();
      expect(screen.getByText('Export Options')).toBeInTheDocument();
      expect(screen.getByLabelText(/overall analytics/i)).toBeInTheDocument();
    });
  });

  describe('Filter Utility Functions', () => {
    it('should generate correct filter labels', () => {
      // Preset filters
      const topFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      expect(getFilterLabel(topFilter)).toBe('Top 25%');

      const bottomFilter: PercentileRange = { from: 0, to: 25, label: 'Bottom 25%' };
      expect(getFilterLabel(bottomFilter)).toBe('Bottom 25%');

      // Custom filter without label
      const customFilter: PercentileRange = { from: 40, to: 60 };
      expect(getFilterLabel(customFilter)).toBe('40% - 60%');

      // Null filter
      expect(getFilterLabel(null)).toBe('');
    });
  });

  describe('Modal State Management', () => {
    it('should handle closing modal', () => {
      const onClose = jest.fn();
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          onClose={onClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalled();
    });

    it('should render correctly when modal is closed', () => {
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          isOpen={false}
        />
      );

      expect(screen.queryByText('Export Analytics Data')).not.toBeInTheDocument();
    });
  });

  describe('Analytics Summary Display', () => {
    it('should show analytics summary information', () => {
      render(<AnalyticsExportModal {...mockProps} />);

      expect(screen.getByText('Analytics Summary')).toBeInTheDocument();
      expect(screen.getByText('Students Analyzed:')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument(); // Sample size
      expect(screen.getByText('Questions:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Question count
    });

    it('should update analytics summary with filter context', () => {
      const percentileFilter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      
      render(
        <AnalyticsExportModal 
          {...mockProps} 
          percentileFilter={percentileFilter} 
        />
      );

      // Should show both the regular analytics summary and filter status
      expect(screen.getByText('Analytics Summary')).toBeInTheDocument();
      expect(screen.getByText('Filtered Export Active')).toBeInTheDocument();
    });
  });
});