import { AnalyzeByVariant } from '../../app/lib/biPointAnalysis';
import { 
  ExamVariantForAnalysis, 
  StudentResponse
} from '../../app/types/analysis';
import { QuestionType } from '../../app/types/course';

describe('AnalyzeByVariant - Data Splitting', () => {
  it('should properly split student responses by variant code', () => {
    // Create test exam variants
    const examVariants: ExamVariantForAnalysis[] = [
      {
        id: 'variant-1',
        examId: 'exam-1',
        variantCode: 'A',
        examTitle: 'Test Exam',
        questions: [
          {
            id: 'q1',
            questionText: 'What is 2+2?',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          }
        ],
        metadata: {}
      },
      {
        id: 'variant-2',
        examId: 'exam-1',
        variantCode: 'B',
        examTitle: 'Test Exam',
        questions: [
          {
            id: 'q1',
            questionText: 'What is 2+2?',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          }
        ],
        metadata: {}
      },
      {
        id: 'variant-3',
        examId: 'exam-1',
        variantCode: 'C',
        examTitle: 'Test Exam',
        questions: [
          {
            id: 'q1',
            questionText: 'What is 2+2?',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          }
        ],
        metadata: {}
      }
    ];

    // Create student responses for different variants
    const studentResponses: StudentResponse[] = [
      // Variant A responses
      {
        studentId: 'student-1',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 30
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 30,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:30Z')
      },
      {
        studentId: 'student-2',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '3',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 25
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 25,
        startedAt: new Date('2024-01-01T10:01:00Z'),
        completedAt: new Date('2024-01-01T10:01:25Z')
      },
      {
        studentId: 'student-3',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 35
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 35,
        startedAt: new Date('2024-01-01T10:02:00Z'),
        completedAt: new Date('2024-01-01T10:02:35Z')
      },
      {
        studentId: 'student-4',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '3',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 28
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 28,
        startedAt: new Date('2024-01-01T10:03:00Z'),
        completedAt: new Date('2024-01-01T10:03:28Z')
      },
      // Variant B responses
      {
        studentId: 'student-5',
        variantCode: 'B',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 35
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 35,
        startedAt: new Date('2024-01-01T10:02:00Z'),
        completedAt: new Date('2024-01-01T10:02:35Z')
      },
      {
        studentId: 'student-6',
        variantCode: 'B',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '5',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 20
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 20,
        startedAt: new Date('2024-01-01T10:03:00Z'),
        completedAt: new Date('2024-01-01T10:03:20Z')
      },
      {
        studentId: 'student-7',
        variantCode: 'B',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 40
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 40,
        startedAt: new Date('2024-01-01T10:04:00Z'),
        completedAt: new Date('2024-01-01T10:04:40Z')
      },
      {
        studentId: 'student-8',
        variantCode: 'B',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '5',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 32
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 32,
        startedAt: new Date('2024-01-01T10:05:00Z'),
        completedAt: new Date('2024-01-01T10:05:32Z')
      },
      // Variant C responses
      {
        studentId: 'student-9',
        variantCode: 'C',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 40
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 40,
        startedAt: new Date('2024-01-01T10:04:00Z'),
        completedAt: new Date('2024-01-01T10:04:40Z')
      },
      {
        studentId: 'student-10',
        variantCode: 'C',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '3',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 45
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 45,
        startedAt: new Date('2024-01-01T10:05:00Z'),
        completedAt: new Date('2024-01-01T10:05:45Z')
      },
      {
        studentId: 'student-11',
        variantCode: 'C',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 50
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 50,
        startedAt: new Date('2024-01-01T10:06:00Z'),
        completedAt: new Date('2024-01-01T10:06:50Z')
      },
      {
        studentId: 'student-12',
        variantCode: 'C',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '6',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 38
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 38,
        startedAt: new Date('2024-01-01T10:07:00Z'),
        completedAt: new Date('2024-01-01T10:07:38Z')
      },
      {
        studentId: 'student-13',
        variantCode: 'C',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '6',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 38
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 38,
        startedAt: new Date('2024-01-01T10:07:00Z'),
        completedAt: new Date('2024-01-01T10:07:38Z')
      },
      {
        studentId: 'student-14',
        variantCode: 'C',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '6',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 38
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 38,
        startedAt: new Date('2024-01-01T10:07:00Z'),
        completedAt: new Date('2024-01-01T10:07:38Z')
      },
      {
        studentId: 'student-15',
        variantCode: 'B',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '6',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 38
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 38,
        startedAt: new Date('2024-01-01T10:07:00Z'),
        completedAt: new Date('2024-01-01T10:07:38Z')
      }
    ];

    // Call AnalyzeByVariant
    const results = AnalyzeByVariant(examVariants, studentResponses, {
      examTitle: 'Test Exam',
      minSampleSize: 1
    });

    // Verify the results
    expect(results).toHaveLength(3); // Should have 3 variants

    // Check Variant A
    const variantAResult = results.find(r => r.examTitle.includes('Variant A'));
    expect(variantAResult).toBeDefined();
    expect(variantAResult?.metadata.totalStudents).toBe(4);
    expect(variantAResult?.metadata.studentResponses).toHaveLength(4);
    expect(variantAResult?.metadata.studentResponses?.every(r => r.variantCode === 'A')).toBe(true);

    // Check Variant B
    const variantBResult = results.find(r => r.examTitle.includes('Variant B'));
    expect(variantBResult).toBeDefined();
    expect(variantBResult?.metadata.totalStudents).toBe(5);
    expect(variantBResult?.metadata.studentResponses).toHaveLength(5);
    expect(variantBResult?.metadata.studentResponses?.every(r => r.variantCode === 'B')).toBe(true);

    // Check Variant C
    const variantCResult = results.find(r => r.examTitle.includes('Variant C'));
    expect(variantCResult).toBeDefined();
    expect(variantCResult?.metadata.totalStudents).toBe(6);
    expect(variantCResult?.metadata.studentResponses).toHaveLength(6);
    expect(variantCResult?.metadata.studentResponses?.every(r => r.variantCode === 'C')).toBe(true);

    // Verify exam titles contain variant codes
    expect(variantAResult?.examTitle).toBe('Test Exam - Variant A');
    expect(variantBResult?.examTitle).toBe('Test Exam - Variant B');
    expect(variantCResult?.examTitle).toBe('Test Exam - Variant C');
  });

  it('should handle responses with unknown variant codes', () => {
    const examVariants: ExamVariantForAnalysis[] = [
      {
        id: 'variant-1',
        examId: 'exam-1',
        variantCode: 'A',
        examTitle: 'Test Exam',
        questions: [
          {
            id: 'q1',
            questionText: 'What is 2+2?',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          }
        ],
        metadata: {}
      }
    ];

    const studentResponses: StudentResponse[] = [
      // Valid variant response
      {
        studentId: 'student-1',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 30
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 30,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:30Z')
      },
      {
        studentId: 'student-2',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '3',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 25
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 25,
        startedAt: new Date('2024-01-01T10:01:00Z'),
        completedAt: new Date('2024-01-01T10:01:25Z')
      },
      {
        studentId: 'student-3',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 35
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 35,
        startedAt: new Date('2024-01-01T10:02:00Z'),
        completedAt: new Date('2024-01-01T10:02:35Z')
      },
      {
        studentId: 'student-4',
        variantCode: 'A',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '3',
            isCorrect: false,
            points: 0,
            maxPoints: 1,
            responseTime: 28
          }
        ],
        totalScore: 0,
        maxPossibleScore: 1,
        completionTime: 28,
        startedAt: new Date('2024-01-01T10:03:00Z'),
        completedAt: new Date('2024-01-01T10:03:28Z')
      },
      // Unknown variant response
      {
        studentId: 'student-5',
        variantCode: 'UNKNOWN',
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 30
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 30,
        startedAt: new Date('2024-01-01T10:03:00Z'),
        completedAt: new Date('2024-01-01T10:03:30Z')
      }
    ];

    const results = AnalyzeByVariant(examVariants, studentResponses, {
      examTitle: 'Test Exam',
      minSampleSize: 1
    });

    // Should only process the valid variant
    expect(results).toHaveLength(1);
    expect(results[0].examTitle).toBe('Test Exam - Variant A');
    expect(results[0].metadata.totalStudents).toBe(4);
  });

  it('should handle empty student responses', () => {
    const examVariants: ExamVariantForAnalysis[] = [
      {
        id: 'variant-1',
        examId: 'exam-1',
        variantCode: 'A',
        examTitle: 'Test Exam',
        questions: [
          {
            id: 'q1',
            questionText: 'What is 2+2?',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          }
        ],
        metadata: {}
      }
    ];

    const studentResponses: StudentResponse[] = [];

    const results = AnalyzeByVariant(examVariants, studentResponses, {
      examTitle: 'Test Exam',
      minSampleSize: 1
    });

    // Should return empty array when no responses
    expect(results).toHaveLength(0);
  });

  it('should handle responses with missing variant codes', () => {
    const examVariants: ExamVariantForAnalysis[] = [
      {
        id: 'variant-1',
        examId: 'exam-1',
        variantCode: 'A',
        examTitle: 'Test Exam',
        questions: [
          {
            id: 'q1',
            questionText: 'What is 2+2?',
            questionType: QuestionType.MULTIPLE_CHOICE,
            options: ['3', '4', '5', '6'],
            correctAnswer: '4',
            points: 1
          }
        ],
        metadata: {}
      }
    ];

    const studentResponses: StudentResponse[] = [
      {
        studentId: 'student-1',
        variantCode: '', // Empty variant code
        questionResponses: [
          {
            questionId: 'q1',
            studentAnswer: '4',
            isCorrect: true,
            points: 1,
            maxPoints: 1,
            responseTime: 30
          }
        ],
        totalScore: 1,
        maxPossibleScore: 1,
        completionTime: 30,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:00:30Z')
      }
    ];

    const results = AnalyzeByVariant(examVariants, studentResponses, {
      examTitle: 'Test Exam',
      minSampleSize: 1
    });

    // Should not process responses with empty variant codes
    expect(results).toHaveLength(0);
  });
});