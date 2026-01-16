import { analyzeExam } from '../../app/lib/biPointAnalysis';
import {
  StudentResponse,
  QuestionResponse,
  AnalysisConfig,
  QuestionAnalysisResult,
  ExamVariantForAnalysis,
} from '../../app/types/analysis';

describe('Bi-Point Analysis System', () => {
  // Deterministic mock data for consistent testing
  const createDeterministicStudentResponses = (): StudentResponse[] => {
    return [
      // High-performing students (scores 8-10 out of 10)
      {
        studentId: 'student_1',
        variantCode: 'A',
        totalScore: 10,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q6', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q7', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q9', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q10', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      {
        studentId: 'student_2',
        variantCode: 'A',
        totalScore: 9,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q6', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q7', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q9', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q10', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      {
        studentId: 'student_3',
        variantCode: 'A',
        totalScore: 8,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q6', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q7', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q9', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q10', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      // Medium-performing students (scores 5-7 out of 10)
      {
        studentId: 'student_4',
        variantCode: 'A',
        totalScore: 6,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q3', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q5', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q6', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q7', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q9', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q10', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
        ],
      },
      {
        studentId: 'student_5',
        variantCode: 'A',
        totalScore: 5,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q4', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q5', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q6', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q7', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q9', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q10', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
        ],
      },
      // Low-performing students (scores 2-4 out of 10)
      {
        studentId: 'student_6',
        variantCode: 'A',
        totalScore: 3,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q4', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q5', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q6', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q7', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q9', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q10', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      {
        studentId: 'student_7',
        variantCode: 'A',
        totalScore: 2,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q3', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q4', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q5', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q6', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q7', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q8', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q9', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q10', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      {
        studentId: 'student_8',
        variantCode: 'A',
        totalScore: 1,
        maxPossibleScore: 10,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q3', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q4', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q5', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q6', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q7', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q8', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q9', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong answer
          { questionId: 'q10', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
    ];
  };

  const mockExamVariants: ExamVariantForAnalysis[] = [
    {
      id: 'variant-1',
      examId: 'test_exam_1',
      variantCode: 'A',
      questions: [
        { id: 'q1', questionText: 'Question 1', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'A', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q2', questionText: 'Question 2', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'B', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q3', questionText: 'Question 3', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'C', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q4', questionText: 'Question 4', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'D', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q5', questionText: 'Question 5', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'A', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q6', questionText: 'Question 6', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'B', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q7', questionText: 'Question 7', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'C', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q8', questionText: 'Question 8', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'D', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q9', questionText: 'Question 9', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'A', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'q10', questionText: 'Question 10', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'B', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'tf1', questionText: 'True/False 1', questionType: 'TRUE_FALSE' as any, correctAnswer: 'True', options: ['True', 'False'], points: 1 },
        { id: 'tf2', questionText: 'True/False 2', questionType: 'TRUE_FALSE' as any, correctAnswer: 'False', options: ['True', 'False'], points: 1 },
        { id: 'tf3', questionText: 'True/False 3', questionType: 'TRUE_FALSE' as any, correctAnswer: 'True', options: ['True', 'False'], points: 1 },
        { id: 'tf4', questionText: 'True/False 4', questionType: 'TRUE_FALSE' as any, correctAnswer: 'False', options: ['True', 'False'], points: 1 },
        { id: 'perfect_q', questionText: 'Perfect Question', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'A', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'random_q', questionText: 'Random Question', questionType: 'MULTIPLE_CHOICE' as any, correctAnswer: 'A', options: ['A', 'B', 'C', 'D'], points: 1 },
        { id: 'random_tf1', questionText: 'Random TF 1', questionType: 'TRUE_FALSE' as any, correctAnswer: 'True', options: ['True', 'False'], points: 1 },
        { id: 'random_tf2', questionText: 'Random TF 2', questionType: 'TRUE_FALSE' as any, correctAnswer: 'True', options: ['True', 'False'], points: 1 },
      ],
    },
  ];

  const defaultConfig: AnalysisConfig = {
    minSampleSize: 5,
    includeDiscriminationIndex: true,
    includeDifficultyIndex: true,
    includePointBiserial: true,
    includeDistractorAnalysis: true,
    confidenceLevel: 0.95,
    excludeIncompleteData: true,

    groupByQuestionType: false,
  };

  // Helper function for True/False test data
  const createTrueFalseResponses = (): StudentResponse[] => {
    return [
      // High-performing students
      {
        studentId: 'tf_student_1',
        variantCode: 'A',
        totalScore: 4,
        maxPossibleScore: 4,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'tf1', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf2', studentAnswer: 'False', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf3', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf4', studentAnswer: 'False', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      {
        studentId: 'tf_student_2',
        variantCode: 'A',
        totalScore: 3,
        maxPossibleScore: 4,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'tf1', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf2', studentAnswer: 'False', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf3', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf4', studentAnswer: 'True', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
        ],
      },
      {
        studentId: 'tf_student_3',
        variantCode: 'A',
        totalScore: 3,
        maxPossibleScore: 4,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'tf1', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf2', studentAnswer: 'False', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf3', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf4', studentAnswer: 'False', isCorrect: true, points: 1, maxPoints: 1 },
        ],
      },
      // Low-performing students
      {
        studentId: 'tf_student_4',
        variantCode: 'A',
        totalScore: 1,
        maxPossibleScore: 4,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'tf1', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf2', studentAnswer: 'True', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf3', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf4', studentAnswer: 'True', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
        ],
      },
      {
        studentId: 'tf_student_5',
        variantCode: 'A',
        totalScore: 0,
        maxPossibleScore: 4,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'tf1', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf2', studentAnswer: 'True', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf3', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf4', studentAnswer: 'True', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
        ],
      },
      {
        studentId: 'tf_student_6',
        variantCode: 'A',
        totalScore: 1,
        maxPossibleScore: 4,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T11:00:00Z'),
        questionResponses: [
          { questionId: 'tf1', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf2', studentAnswer: 'False', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'tf3', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
          { questionId: 'tf4', studentAnswer: 'True', isCorrect: false, points: 0, maxPoints: 1 }, // Wrong
        ],
      },
    ];
  };

  describe('Individual Statistical Formula Tests', () => {
    test('Difficulty Index (p-value) Calculation', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // Check Q1: 4/8 students got it correct = 0.5
      // Students 1,2,3,4 answered 'A' (correct), students 5,6,7,8 answered 'B' (incorrect)
      const q1Result = result.questionResults.find(q => q.questionId === 'q1');
      expect(q1Result?.difficultyIndex).toBeCloseTo(0.5, 3);

      // Check Q3: 5/8 students got it correct = 0.625
      // Students 1,2,3,5,6 answered 'C' (correct), students 4,7,8 answered 'A' (incorrect)
      const q3Result = result.questionResults.find(q => q.questionId === 'q3');
      expect(q3Result?.difficultyIndex).toBeCloseTo(0.625, 3);

      // Check Q10: 6/8 students got it correct = 0.75
      // Students 1,2,3,6,7,8 answered 'B' (correct), students 4,5 answered 'A' (incorrect)
      const q10Result = result.questionResults.find(q => q.questionId === 'q10');
      expect(q10Result?.difficultyIndex).toBeCloseTo(0.75, 3);
    });

    test('Discrimination Index Calculation', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // With 8 students, high group = top 27% = 2 students (scores 10, 9)
      // Low group = bottom 27% = 2 students (scores 2, 1)

      // Q1: High group (2/2 correct) - Low group (0/2 correct) = 1.0 - 0.0 = 1.0
      const q1Result = result.questionResults.find(q => q.questionId === 'q1');
      expect(q1Result?.discriminationIndex).toBeCloseTo(1.0, 3);

      // Q10: High group (2/2 correct) - Low group (2/2 correct) = 1.0 - 1.0 = 0.0
      const q10Result = result.questionResults.find(q => q.questionId === 'q10');
      expect(q10Result?.discriminationIndex).toBeCloseTo(0.0, 3);
    });

    test('Point-Biserial Correlation Formula Verification', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // Test that point-biserial correlation is calculated correctly
      // Formula: r_pb = [(X̄₁ - X̄₂) / sₓ] × √[(n₁×n₂) / n²]

      // For Q1: Mean score of students who got Q1 correct vs incorrect
      const q1Result = result.questionResults.find(q => q.questionId === 'q1');
      expect(q1Result?.pointBiserialCorrelation).toBeDefined();
      expect(q1Result?.pointBiserialCorrelation).toBeGreaterThan(0);
      expect(q1Result?.pointBiserialCorrelation).toBeLessThanOrEqual(1);
    });

    test('Chi-Square Statistical Significance', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // Test that chi-square calculation is working
      result.questionResults.forEach(question => {
        expect(question.statisticalSignificance).toBeDefined();
        expect(question.statisticalSignificance.testStatistic).toBeGreaterThanOrEqual(0);
        expect(question.statisticalSignificance.pValue).toBeGreaterThan(0);
        expect(question.statisticalSignificance.pValue).toBeLessThanOrEqual(1);
        expect(question.statisticalSignificance.degreesOfFreedom).toBe(1);
        expect(question.statisticalSignificance.criticalValue).toBeGreaterThan(0);
      });
    });

    test('Distractor Analysis Calculations', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // Check Q1 distractor analysis (correct answer is A)
      const q1Result = result.questionResults.find(q => q.questionId === 'q1');
      expect(q1Result?.distractorAnalysis).toBeDefined();

      // Should have distractors for B (4 students chose this - students 5,6,7,8)
      const bDistractor = q1Result?.distractorAnalysis.distractors.find(d => d.option === 'B');
      expect(bDistractor?.frequency).toBe(4);
      expect(bDistractor?.percentage).toBeCloseTo(50.0, 1); // 4/8 = 50%
    });
  });

  describe('Formula Consistency Tests', () => {
    test('Difficulty Index Formula Consistency', async () => {
      const responses = createDeterministicStudentResponses();

      // Run analysis multiple times to ensure consistency
      const result1 = await analyzeExam(mockExamVariants, responses, defaultConfig);
      const result2 = await analyzeExam(mockExamVariants, responses, defaultConfig);

      result1.questionResults.forEach((q1, index) => {
        const q2 = result2.questionResults[index];
        expect(q1.difficultyIndex).toEqual(q2.difficultyIndex);
      });
    });

    test('Point-Biserial Correlation Formula Consistency', async () => {
      const responses = createDeterministicStudentResponses();

      const result1 = await analyzeExam(mockExamVariants, responses, defaultConfig);
      const result2 = await analyzeExam(mockExamVariants, responses, defaultConfig);

      result1.questionResults.forEach((q1, index) => {
        const q2 = result2.questionResults[index];
        expect(q1.pointBiserialCorrelation).toEqual(q2.pointBiserialCorrelation);
      });
    });

    test('Discrimination Index Formula Consistency', async () => {
      const responses = createDeterministicStudentResponses();

      const result1 = await analyzeExam(mockExamVariants, responses, defaultConfig);
      const result2 = await analyzeExam(mockExamVariants, responses, defaultConfig);

      result1.questionResults.forEach((q1, index) => {
        const q2 = result2.questionResults[index];
        expect(q1.discriminationIndex).toEqual(q2.discriminationIndex);
      });
    });

    test('Chi-Square Calculation Consistency', async () => {
      const responses = createDeterministicStudentResponses();

      const result1 = await analyzeExam(mockExamVariants, responses, defaultConfig);
      const result2 = await analyzeExam(mockExamVariants, responses, defaultConfig);

      result1.questionResults.forEach((q1, index) => {
        const q2 = result2.questionResults[index];
        expect(q1.statisticalSignificance.testStatistic).toEqual(q2.statisticalSignificance.testStatistic);
        expect(q1.statisticalSignificance.pValue).toEqual(q2.statisticalSignificance.pValue);
        expect(q1.statisticalSignificance.criticalValue).toEqual(q2.statisticalSignificance.criticalValue);
      });
    });
  });

  describe('Known Value Verification Tests', () => {
    test('Specific Difficulty Index Values', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // Manually verify specific questions
      // Q1: Students 1,2,3,4 got it correct (4/8 = 0.5)
      const q1Result = result.questionResults.find(q => q.questionId === 'q1');
      expect(q1Result?.correctResponses).toBe(4); // Count from our data
      expect(q1Result?.totalResponses).toBe(8);
      expect(q1Result?.difficultyIndex).toBeCloseTo(4 / 8, 3);
    });

    test('Chi-Square for Perfect Questions', async () => {
      // Create a scenario where all students get a question correct
      const perfectResponses: StudentResponse[] = [
        {
          studentId: 'student_1',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'perfect_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_2',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'perfect_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_3',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'perfect_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_4',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'perfect_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_5',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'perfect_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_6',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'perfect_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
      ];

      const result = await analyzeExam(mockExamVariants, perfectResponses, defaultConfig);
      const perfectQuestion = result.questionResults.find(q => q.questionId === 'perfect_q');

      expect(perfectQuestion?.difficultyIndex).toBe(1.0); // 100% correct
      // When all students get a question right, chi-square should be high (major deviation from chance)
      expect(perfectQuestion?.statisticalSignificance.testStatistic).toBeGreaterThan(5.841); // Significant
      expect(perfectQuestion?.statisticalSignificance.isSignificant).toBe(true);
    });

    test('Chi-Square for Random Chance Questions', async () => {
      // Create a scenario where exactly 25% get a 4-option question correct (random chance)
      const randomChanceResponses: StudentResponse[] = [
        // 2 correct out of 8 = 25% (random chance for 4-option question)
        {
          studentId: 'student_1',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_2',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_3',
          variantCode: 'A',
          totalScore: 0,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_4',
          variantCode: 'A',
          totalScore: 0,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_5',
          variantCode: 'A',
          totalScore: 0,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'D', isCorrect: false, points: 0, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_6',
          variantCode: 'A',
          totalScore: 0,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_7',
          variantCode: 'A',
          totalScore: 0,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1 }
          ],
        },
        {
          studentId: 'student_8',
          variantCode: 'A',
          totalScore: 0,
          maxPossibleScore: 1,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_q', studentAnswer: 'D', isCorrect: false, points: 0, maxPoints: 1 }
          ],
        },
      ];

      const result = await analyzeExam(mockExamVariants, randomChanceResponses, defaultConfig);
      const randomQuestion = result.questionResults.find(q => q.questionId === 'random_q');

      expect(randomQuestion?.difficultyIndex).toBe(0.25); // Exactly 25%
      expect(randomQuestion?.statisticalSignificance.isSignificant).toBe(false); // Should not be significant
    });
  });

  describe('Integration Tests', () => {
    test('Full Analysis Pipeline', async () => {
      const responses = createDeterministicStudentResponses();
      const result = await analyzeExam(mockExamVariants, responses, defaultConfig);

      // Verify structure
      expect(result.examId).toBe('test_exam_1');
      expect(result.questionResults).toHaveLength(10);
      expect(result.metadata.totalStudents).toBe(8);
      expect(result.metadata.sampleSize).toBe(8);

      // Verify all questions have complete analysis
      result.questionResults.forEach(question => {
        expect(question.questionId).toBeDefined();
        expect(question.totalResponses).toBe(8);
        expect(question.difficultyIndex).toBeGreaterThanOrEqual(0);
        expect(question.difficultyIndex).toBeLessThanOrEqual(1);
        expect(question.discriminationIndex).toBeGreaterThanOrEqual(-1);
        expect(question.discriminationIndex).toBeLessThanOrEqual(1);
        expect(question.pointBiserialCorrelation).toBeGreaterThanOrEqual(-1);
        expect(question.pointBiserialCorrelation).toBeLessThanOrEqual(1);
        expect(question.distractorAnalysis).toBeDefined();
        expect(question.statisticalSignificance).toBeDefined();
      });

      // Verify summary statistics
      expect(result.summary.averageDifficulty).toBeGreaterThan(0);
      expect(result.summary.averageDiscrimination).toBeDefined();
      expect(result.summary.averagePointBiserial).toBeDefined();
      expect(result.summary.scoreDistribution).toBeDefined();
    });

    test('Error Handling - Insufficient Sample Size', async () => {
      const tinyResponses = createDeterministicStudentResponses().slice(0, 2); // Only 2 students

      await expect(
        analyzeExam(mockExamVariants, tinyResponses, { ...defaultConfig, minSampleSize: 5 })
      ).rejects.toThrow('Insufficient sample size');
    });

    test('Configuration Options Impact', async () => {
      const responses = createDeterministicStudentResponses();

      // Test with different confidence levels
      const result95 = await analyzeExam(mockExamVariants, responses, { ...defaultConfig, confidenceLevel: 0.95 });
      const result99 = await analyzeExam(mockExamVariants, responses, { ...defaultConfig, confidenceLevel: 0.99 });

      // Should have different critical values (95% vs 99% confidence)
      // At 95% confidence, alpha = 0.05, critical value = 3.84
      // At 99% confidence, alpha = 0.01, critical value = 6.63
      // 99% should have higher critical value (more conservative)
      expect(result95.questionResults[0].statisticalSignificance.criticalValue).toBeCloseTo(3.84, 2);
      expect(result99.questionResults[0].statisticalSignificance.criticalValue).toBeCloseTo(6.63, 2);
      expect(result99.questionResults[0].statisticalSignificance.criticalValue)
        .toBeGreaterThan(result95.questionResults[0].statisticalSignificance.criticalValue);
    });
  });

  describe('True/False Questions', () => {

    test('True/False Difficulty Index Calculation', async () => {
      const tfResponses = createTrueFalseResponses();
      const result = await analyzeExam(mockExamVariants, tfResponses, defaultConfig);

      // TF1: Students 1,2,3 got it correct = 3/6 = 0.5
      const tf1Result = result.questionResults.find(q => q.questionId === 'tf1');
      expect(tf1Result?.difficultyIndex).toBeCloseTo(0.5, 3);
      expect(tf1Result?.correctResponses).toBe(3);
      expect(tf1Result?.totalResponses).toBe(6);

      // TF2: Students 1,2,3,6 got it correct = 4/6 = 0.667
      const tf2Result = result.questionResults.find(q => q.questionId === 'tf2');
      expect(tf2Result?.difficultyIndex).toBeCloseTo(0.667, 3);
    });

    test('True/False Discrimination Index', async () => {
      const tfResponses = createTrueFalseResponses();
      const result = await analyzeExam(mockExamVariants, tfResponses, defaultConfig);

      // With 6 students, high group = top 27% = 2 students (scores 4, 3)
      // Low group = bottom 27% = 2 students (scores 0, 1)

      // TF1: High group (2/2 correct) - Low group (0/2 correct) = 1.0 - 0.0 = 1.0
      const tf1Result = result.questionResults.find(q => q.questionId === 'tf1');
      expect(tf1Result?.discriminationIndex).toBeCloseTo(1.0, 3);

      // TF3: High group (1.5/2) - Low group (0.5/2) should show discrimination
      const tf3Result = result.questionResults.find(q => q.questionId === 'tf3');
      expect(tf3Result?.discriminationIndex).toBeGreaterThan(0);
    });

    test('True/False Statistical Significance (50% Chance)', async () => {
      const tfResponses = createTrueFalseResponses();
      const result = await analyzeExam(mockExamVariants, tfResponses, defaultConfig);

      result.questionResults.forEach(question => {
        expect(question.statisticalSignificance).toBeDefined();
        expect(question.statisticalSignificance.testStatistic).toBeGreaterThanOrEqual(0);
        expect(question.statisticalSignificance.degreesOfFreedom).toBe(1);

        // For T/F questions, random chance = 50%, not 25% like MC
        // Check that the calculation accounts for this
        expect(question.statisticalSignificance.pValue).toBeGreaterThan(0);
        expect(question.statisticalSignificance.pValue).toBeLessThanOrEqual(1);
      });
    });

    test('True/False Distractor Analysis', async () => {
      const tfResponses = createTrueFalseResponses();
      const result = await analyzeExam(mockExamVariants, tfResponses, defaultConfig);

      // TF1: Correct answer is 'True', distractor is 'False'
      const tf1Result = result.questionResults.find(q => q.questionId === 'tf1');
      expect(tf1Result?.distractorAnalysis).toBeDefined();

      // Should have correct option 'True' and distractor 'False'
      expect(tf1Result?.distractorAnalysis.correctOption?.option).toBe('True');
      expect(tf1Result?.distractorAnalysis.correctOption?.frequency).toBe(3);
      expect(tf1Result?.distractorAnalysis.correctOption?.percentage).toBeCloseTo(50.0, 1);

      // Should have distractor 'False' with 3 students (50%)
      const falseDistractor = tf1Result?.distractorAnalysis.distractors.find(d => d.option === 'False');
      expect(falseDistractor?.frequency).toBe(3);
      expect(falseDistractor?.percentage).toBeCloseTo(50.0, 1);
      expect(falseDistractor?.pointBiserialCorrelation).toBeLessThan(0); // Should be negative
    });

    test('True/False Point-Biserial Correlations', async () => {
      const tfResponses = createTrueFalseResponses();
      const result = await analyzeExam(mockExamVariants, tfResponses, defaultConfig);

      result.questionResults.forEach(question => {
        // Correct option should have positive correlation
        expect(question.distractorAnalysis.correctOption?.pointBiserialCorrelation).toBeGreaterThan(0);

        // Distractor should have negative correlation
        question.distractorAnalysis.distractors.forEach(distractor => {
          expect(distractor.pointBiserialCorrelation).toBeLessThan(0);
        });
      });
    });

    test('True/False Random Chance Performance', async () => {
      // Create T/F responses with exactly 50% correct (random chance)
      const randomTFResponses: StudentResponse[] = [
        {
          studentId: 'random_tf_1',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_tf1', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
            { questionId: 'random_tf2', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 },
          ],
        },
        {
          studentId: 'random_tf_2',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_tf1', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
            { questionId: 'random_tf2', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          ],
        },
        {
          studentId: 'random_tf_3',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_tf1', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 },
            { questionId: 'random_tf2', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          ],
        },
        {
          studentId: 'random_tf_4',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_tf1', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 },
            { questionId: 'random_tf2', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 },
          ],
        },
        {
          studentId: 'random_tf_5',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_tf1', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 },
            { questionId: 'random_tf2', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
          ],
        },
        {
          studentId: 'random_tf_6',
          variantCode: 'A',
          totalScore: 1,
          maxPossibleScore: 2,
          startedAt: new Date(),
          completedAt: new Date(),
          questionResponses: [
            { questionId: 'random_tf1', studentAnswer: 'True', isCorrect: true, points: 1, maxPoints: 1 },
            { questionId: 'random_tf2', studentAnswer: 'False', isCorrect: false, points: 0, maxPoints: 1 },
          ],
        },
      ];

      const result = await analyzeExam(mockExamVariants, randomTFResponses, defaultConfig);

      // TF1: 3/6 correct = 50% (random chance for T/F)
      const tf1Result = result.questionResults.find(q => q.questionId === 'random_tf1');
      expect(tf1Result?.difficultyIndex).toBe(0.5);
      expect(tf1Result?.statisticalSignificance.isSignificant).toBe(false); // Should not be significant

      // TF2: 3/6 correct = 50% (random chance for T/F)  
      const tf2Result = result.questionResults.find(q => q.questionId === 'random_tf2');
      expect(tf2Result?.difficultyIndex).toBe(0.5);
      expect(tf2Result?.statisticalSignificance.isSignificant).toBe(false); // Should not be significant
    });
  });

  describe('Mixed Question Types', () => {
    test('Multiple Choice and True/False Together', async () => {
      const mcResponses = createDeterministicStudentResponses().slice(0, 5); // Take first 5 MC students
      const tfResponses = createTrueFalseResponses().slice(0, 5); // Take first 5 T/F students

      // Combine responses - each student answers both MC and T/F questions
      const mixedResponses: StudentResponse[] = mcResponses.map((mcResp, index) => {
        const tfResp = tfResponses[index];
        return {
          ...mcResp,
          totalScore: mcResp.totalScore + tfResp.totalScore,
          maxPossibleScore: mcResp.maxPossibleScore + tfResp.maxPossibleScore,
          questionResponses: [...mcResp.questionResponses, ...tfResp.questionResponses],
        };
      });

      const result = await analyzeExam(mockExamVariants, mixedResponses, defaultConfig);

      // Should have both MC questions (q1-q10) and T/F questions (tf1-tf4)
      expect(result.questionResults.length).toBe(14);

      // Verify MC questions still work
      const mcQuestion = result.questionResults.find(q => q.questionId === 'q1');
      expect(mcQuestion).toBeDefined();

      // Verify T/F questions still work
      const tfQuestion = result.questionResults.find(q => q.questionId === 'tf1');
      expect(tfQuestion).toBeDefined();

      // Verify all questions have proper analysis
      result.questionResults.forEach(question => {
        expect(question.distractorAnalysis).toBeDefined();
        expect(question.statisticalSignificance).toBeDefined();
        expect(question.difficultyIndex).toBeGreaterThanOrEqual(0);
        expect(question.difficultyIndex).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Edge Cases', () => {
    test('All Students Same Score', async () => {
      const sameScoreResponses: StudentResponse[] = Array.from({ length: 5 }, (_, i) => ({
        studentId: `student_${i + 1}`,
        variantCode: 'A',
        totalScore: 5,
        maxPossibleScore: 10,
        startedAt: new Date(),
        completedAt: new Date(),
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
          { questionId: 'q6', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 },
          { questionId: 'q7', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1 },
          { questionId: 'q8', studentAnswer: 'D', isCorrect: false, points: 0, maxPoints: 1 },
          { questionId: 'q9', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 },
          { questionId: 'q10', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 },
        ],
      }));

      const result = await analyzeExam(mockExamVariants, sameScoreResponses, defaultConfig);

      // When all students have same score, discrimination should be 0
      result.questionResults.forEach(question => {
        expect(question.discriminationIndex).toBe(0);
      });
    });

    test('Single Question Analysis', async () => {
      const singleQuestionResponses: StudentResponse[] = createDeterministicStudentResponses().map(resp => ({
        ...resp,
        questionResponses: [resp.questionResponses[0]], // Only keep first question
        totalScore: resp.questionResponses[0].isCorrect ? 1 : 0,
        maxPossibleScore: 1,
      }));

      const result = await analyzeExam(mockExamVariants, singleQuestionResponses, defaultConfig);
      expect(result.questionResults).toHaveLength(1);
      expect(result.questionResults[0].questionId).toBe('q1');
    });
  });
}); 