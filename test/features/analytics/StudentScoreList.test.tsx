import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StudentScoreList from '../../../app/(features)/course/[id]/analytics/containers/StudentScoreView';
import { BiPointAnalysisResult } from '../../../app/types/analysis';

// Mock data for testing
const mockAnalysisResult: BiPointAnalysisResult = {
  examId: 'exam-123',
  examTitle: 'Test Exam',
  analysisConfig: {},
  questionResults: [],
  summary: {
    averageDifficulty: 0.65,
    averageDiscrimination: 0.45,
    averagePointBiserial: 0.35
  },
  metadata: {
    totalStudents: 3,
    totalVariants: 2,
    analysisDate: new Date('2025-07-01'),
    sampleSize: 3,
    excludedStudents: 0,
    studentResponses: [
      {
        studentId: '12345',
        displayStudentId: 'STUD-12345',
        variantCode: 'A',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 2, maxPoints: 2 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 2 }
        ],
        totalScore: 2,
        maxPossibleScore: 4,
        startedAt: new Date('2025-07-01T10:00:00')
      },
      {
        studentId: '67890',
        displayStudentId: 'STUD-67890',
        variantCode: 'B',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 2, maxPoints: 2 },
          { questionId: 'q2', studentAnswer: 'C', isCorrect: true, points: 2, maxPoints: 2 }
        ],
        totalScore: 4,
        maxPossibleScore: 4,
        startedAt: new Date('2025-07-01T10:00:00')
      },
      {
        studentId: '24680',
        displayStudentId: 'STUD-24680',
        variantCode: 'A',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 2 },
          { questionId: 'q2', studentAnswer: 'C', isCorrect: true, points: 2, maxPoints: 2 }
        ],
        totalScore: 2,
        maxPossibleScore: 4,
        startedAt: new Date('2025-07-01T10:00:00')
      }
    ]
  }
};

describe('StudentScoreList', () => {
  it('renders student performance summary correctly', () => {
    render(<StudentScoreList analysisResult={mockAnalysisResult} />);
    
    // Check if summary statistics are displayed
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // Total students
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('66.7%')).toBeInTheDocument(); // Average score
    
    // Check if student IDs are displayed (not anonymized by default)
    expect(screen.getByText('STUD-12345')).toBeInTheDocument();
    expect(screen.getByText('STUD-67890')).toBeInTheDocument();
    expect(screen.getByText('STUD-24680')).toBeInTheDocument();
  });
  
  it('toggles between real and anonymized IDs when toggle is clicked', () => {
    render(<StudentScoreList analysisResult={mockAnalysisResult} />);
    
    // Initially, real student IDs should be displayed
    expect(screen.getByText('STUD-12345')).toBeInTheDocument();
    expect(screen.getByText('STUD-67890')).toBeInTheDocument();
    expect(screen.getByText('STUD-24680')).toBeInTheDocument();
    
    // Click the anonymize toggle
    const toggleButton = screen.getByLabelText('Toggle anonymized IDs');
    fireEvent.click(toggleButton);
    
    // Now anonymized IDs should be displayed
    expect(screen.queryByText('STUD-12345')).not.toBeInTheDocument();
    expect(screen.queryByText('STUD-67890')).not.toBeInTheDocument();
    expect(screen.queryByText('STUD-24680')).not.toBeInTheDocument();
    
    // Check for anonymized IDs (S001, S002, S003)
    expect(screen.getByText('S001')).toBeInTheDocument();
    expect(screen.getByText('S002')).toBeInTheDocument();
    expect(screen.getByText('S003')).toBeInTheDocument();
    
    // Toggle back to real IDs
    fireEvent.click(toggleButton);
    
    // Real student IDs should be displayed again
    expect(screen.getByText('STUD-12345')).toBeInTheDocument();
    expect(screen.getByText('STUD-67890')).toBeInTheDocument();
    expect(screen.getByText('STUD-24680')).toBeInTheDocument();
  });
  
  it('handles empty student response data gracefully', () => {
    const emptyResult = {
      ...mockAnalysisResult,
      metadata: {
        ...mockAnalysisResult.metadata,
        studentResponses: []
      }
    };
    
    render(<StudentScoreList analysisResult={emptyResult} />);
    
    // Check if "No student data available" message is displayed
    expect(screen.getByText('No student data available')).toBeInTheDocument();
  });
}); 