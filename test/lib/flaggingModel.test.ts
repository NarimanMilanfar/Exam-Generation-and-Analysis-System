import { ProcessSubmissions, FlaggingConfig } from '../../app/lib/flaggingSusSubs';
import {
  BiPointAnalysisResult,
  AnalysisConfig,
  AnalysisSummary,
  VariantAnalysisResult,
} from '../../app/types/analysis';
import { QuestionType } from '../../app/types/course';

// Mock data for testing
const createMockAnalysisResult = (): BiPointAnalysisResult => ({
  examId: 'test-exam-123',
  examTitle: 'Test Exam',
  analysisConfig: {
    minSampleSize: 5,
    includeDiscriminationIndex: true,
    includeDifficultyIndex: true,
    includePointBiserial: true,
    includeDistractorAnalysis: true,
    confidenceLevel: 0.95,
    excludeIncompleteData: false,
    groupByQuestionType: false,
  } as AnalysisConfig,
  questionResults: [],
  metadata: {
    totalStudents: 6,
    totalVariants: 3,
    analysisDate: new Date(),
    sampleSize: 6,
    excludedStudents: 0,
    studentResponses: [
      {
        studentId: '111111',
        displayStudentId: '111111',
        name: 'Student 1',
        variantCode: 'V3',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 40 },
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
          { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 20 },
        ],
        totalScore: 4,
        maxPossibleScore: 5,
        completionTime: 150,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:02:30Z'),
      },
      {
        studentId: '242424',
        displayStudentId: '242424',
        name: 'Student 2',
        variantCode: 'V3',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
          { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 26 },
          { questionId: 'q3', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 42 },
          { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 33 },
          { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 22 },
        ],
        totalScore: 4,
        maxPossibleScore: 5,
        completionTime: 151,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:02:31Z'),
      },
      {
        studentId: '333333',
        displayStudentId: '333333',
        name: 'Student 3',
        variantCode: 'V2',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1, responseTime: 45 },
          { questionId: 'q2', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
          { questionId: 'q3', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
          { questionId: 'q4', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 40 },
          { questionId: 'q5', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
        ],
        totalScore: 3,
        maxPossibleScore: 5,
        completionTime: 175,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:02:55Z'),
      },
      {
        studentId: '444444',
        displayStudentId: '444444',
        name: 'Student 4',
        variantCode: 'V2',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1, responseTime: 44 },
          { questionId: 'q2', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 31 },
          { questionId: 'q3', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 36 },
          { questionId: 'q4', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 41 },
          { questionId: 'q5', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 24 },
        ],
        totalScore: 3,
        maxPossibleScore: 5,
        completionTime: 176,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:02:56Z'),
      },
      {
        studentId: '555555',
        displayStudentId: '555555',
        name: 'Student 5',
        variantCode: 'V1',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
          { questionId: 'q2', studentAnswer: 'D', isCorrect: false, points: 0, maxPoints: 1, responseTime: 28 },
          { questionId: 'q3', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 32 },
          { questionId: 'q4', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 38 },
          { questionId: 'q5', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 29 },
        ],
        totalScore: 3,
        maxPossibleScore: 5,
        completionTime: 162,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:02:42Z'),
      },
      {
        studentId: '666666',
        displayStudentId: '666666',
        name: 'Student 6',
        variantCode: 'V1',
        questionResponses: [
          { questionId: 'q1', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1, responseTime: 34 },
          { questionId: 'q2', studentAnswer: 'D', isCorrect: false, points: 0, maxPoints: 1, responseTime: 27 },
          { questionId: 'q3', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 33 },
          { questionId: 'q4', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 37 },
          { questionId: 'q5', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 30 },
        ],
        totalScore: 3,
        maxPossibleScore: 5,
        completionTime: 161,
        startedAt: new Date('2024-01-01T10:00:00Z'),
        completedAt: new Date('2024-01-01T10:02:41Z'),
      },
    ],
  },
  summary: {
    averageDifficulty: 0.6,
    averageDiscrimination: 0.4,
    averagePointBiserial: 0.417,
  } as AnalysisSummary,
  variantResults: [
    {
      variantCode: 'V1',
      studentCount: 2,
      questionResults: [],
      averageDifficulty: 0.6,
      averageDiscrimination: 0.4,
      averagePointBiserial: 0.35,
    } as VariantAnalysisResult,
    {
      variantCode: 'V2',
      studentCount: 2,
      questionResults: [],
      averageDifficulty: 0.6,
      averageDiscrimination: 0.4,
      averagePointBiserial: 0.38,
    } as VariantAnalysisResult,
    {
      variantCode: 'V3',
      studentCount: 2,
      questionResults: [],
      averageDifficulty: 0.6,
      averageDiscrimination: 0.4,
      averagePointBiserial: 0.45,
    } as VariantAnalysisResult,
  ],
});

// Helper function to create mock BiPointAnalysisResult for a variant
const createMockVariantAnalysis = (variantCode: string, averagePointBiserial: number, studentResponses: any[]): BiPointAnalysisResult => ({
  examId: `test-exam-${variantCode}`,
  examTitle: `Test Exam - ${variantCode}`,
  analysisConfig: {
    minSampleSize: 2,
    includeDiscriminationIndex: true,
    includeDifficultyIndex: true,
    includePointBiserial: true,
    includeDistractorAnalysis: true,
    confidenceLevel: 0.95,
    excludeIncompleteData: false,
    groupByQuestionType: false,
  } as AnalysisConfig,
  questionResults: [],
  metadata: {
    totalStudents: 2,
    totalVariants: 1,
    analysisDate: new Date(),
    sampleSize: 2,
    excludedStudents: 0,
    studentResponses: studentResponses.filter(s => s.variantCode === variantCode),
  },
  summary: {
    averageDifficulty: 0.6,
    averageDiscrimination: 0.4,
    averagePointBiserial: averagePointBiserial,
  } as AnalysisSummary,
  variantResults: [],
});

// Mock similarity matrices
const createMockSimilarityMatrices = () => {
  const studentIds = ['111111 (V3)', '242424 (V3)', '333333 (V2)', '444444 (V2)', '555555 (V1)', '666666 (V1)'];

  const responseSimilarityMatrix: Record<string, Record<string, number>> = {};
  const variantSimilarityMatrix: Record<string, Record<string, number>> = {};

  // Initialize matrices
  studentIds.forEach(id1 => {
    responseSimilarityMatrix[id1] = {};
    variantSimilarityMatrix[id1] = {};

    studentIds.forEach(id2 => {
      if (id1 === id2) {
        responseSimilarityMatrix[id1][id2] = 1.0;
        variantSimilarityMatrix[id1][id2] = 1.0;
      } else {
        // High similarity for students in same variant, lower for different variants
        const variant1 = id1.match(/\(([^)]+)\)/)?.[1];
        const variant2 = id2.match(/\(([^)]+)\)/)?.[1];

        if (variant1 === variant2) {
          // Same variant - high similarity (0.8-1.0)
          responseSimilarityMatrix[id1][id2] = 0.9 + Math.random() * 0.1;
          variantSimilarityMatrix[id1][id2] = 1.0;
        } else {
          // Different variants - lower similarity (0.3-0.6)
          responseSimilarityMatrix[id1][id2] = 0.3 + Math.random() * 0.3;
          variantSimilarityMatrix[id1][id2] = 0.1 + Math.random() * 0.2;
        }
      }
    });
  });

  return { responseSimilarityMatrix, variantSimilarityMatrix };
};

// Test configuration
const createTestConfig = (): FlaggingConfig => ({
  highProbabilityThreshold: 0.8,
  mediumProbabilityThreshold: 0.7,
  lowProbabilityThreshold: 0.0, // Include all pairs for testing
});

// Jest test suite
describe('Flagging Model Tests', () => {
  test('should process submissions and return flagged pairs', () => {
    // Create mock data
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    // Create mock BiPointAnalysisResult objects for each variant
    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    // Run the flagging model
    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    // Assertions
    expect(flaggedSubmissions).toBeDefined();
    expect(Array.isArray(flaggedSubmissions)).toBe(true);
    expect(flaggedSubmissions.length).toBeGreaterThan(0);

    // Check structure of first flagged submission
    if (flaggedSubmissions.length > 0) {
      const firstSubmission = flaggedSubmissions[0];
      expect(firstSubmission).toHaveProperty('student1');
      expect(firstSubmission).toHaveProperty('student2');
      expect(firstSubmission).toHaveProperty('probability');
      expect(firstSubmission).toHaveProperty('responseSimilarity');
      expect(firstSubmission).toHaveProperty('variantSimilarity');
      expect(firstSubmission).toHaveProperty('student1Score');
      expect(firstSubmission).toHaveProperty('student2Score');
      expect(firstSubmission).toHaveProperty('student1Variant');
      expect(firstSubmission).toHaveProperty('student2Variant');
      expect(firstSubmission).toHaveProperty('student1Biserial');
      expect(firstSubmission).toHaveProperty('student2Biserial');
      expect(firstSubmission).toHaveProperty('classAverageScore');

      // Check probability is between 0 and 1
      expect(firstSubmission.probability).toBeGreaterThanOrEqual(0);
      expect(firstSubmission.probability).toBeLessThanOrEqual(1);
    }
  });

  test('should filter out self-comparisons and duplicate pairs', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    // Check that no self-comparisons exist (student1 === student2)
    const selfComparisons = flaggedSubmissions.filter(s => s.student1 === s.student2);
    expect(selfComparisons).toHaveLength(0);

    // Check that no duplicate pairs exist (A-B and B-A should not both be present)
    const studentPairs = flaggedSubmissions.map(s => [s.student1, s.student2].sort().join(' vs '));
    const uniquePairs = new Set(studentPairs);
    expect(uniquePairs.size).toBe(studentPairs.length);
  });

  test('should calculate correct student scores', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    if (flaggedSubmissions.length > 0) {
      // Check that student scores are calculated correctly
      const submission = flaggedSubmissions[0];

      // Find the actual student data
      const student1Data = analysisResult.metadata.studentResponses?.find(s =>
        s.studentId === submission.student1.replace(' (V3)', '').replace(' (V2)', '').replace(' (V1)', '')
      );
      const student2Data = analysisResult.metadata.studentResponses?.find(s =>
        s.studentId === submission.student2.replace(' (V3)', '').replace(' (V2)', '').replace(' (V1)', '')
      );

      if (student1Data && submission.student1Score !== undefined) {
        const expectedScore1 = (student1Data.totalScore / student1Data.maxPossibleScore) * 100;
        expect(submission.student1Score).toBeCloseTo(expectedScore1, 1);
      }

      if (student2Data && submission.student2Score !== undefined) {
        const expectedScore2 = (student2Data.totalScore / student2Data.maxPossibleScore) * 100;
        expect(submission.student2Score).toBeCloseTo(expectedScore2, 1);
      }
    }
  });

  test('should return expected number of pairs for 6 students', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    // For 6 students, we should have 6C2 = 15 unique pairs (excluding self-comparisons)
    // But since we're filtering out duplicates (A-B and B-A), we should have exactly 15 pairs
    expect(flaggedSubmissions.length).toBe(15);
  });

  test('should have correct student score calculations', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    // Check specific student scores
    const student111111Submission = flaggedSubmissions.find(s =>
      s.student1 === '111111 (V3)' || s.student2 === '111111 (V3)'
    );

    if (student111111Submission) {
      const student111111Score = student111111Submission.student1 === '111111 (V3)'
        ? student111111Submission.student1Score
        : student111111Submission.student2Score;

      // Student 111111 has 4/5 = 80%
      expect(student111111Score).toBeCloseTo(80.0, 1);
    }

    const student242424Submission = flaggedSubmissions.find(s =>
      s.student1 === '242424 (V3)' || s.student2 === '242424 (V3)'
    );

    if (student242424Submission) {
      const student242424Score = student242424Submission.student1 === '242424 (V3)'
        ? student242424Submission.student1Score
        : student242424Submission.student2Score;

      // Student 242424 has 4/5 = 80%
      expect(student242424Score).toBeCloseTo(80.0, 1);
    }
  });

  test('should have correct variant assignments', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    // Check that students are assigned to correct variants
    const v3Students = flaggedSubmissions.filter(s =>
      s.student1Variant === 'V3' || s.student2Variant === 'V3'
    );

    expect(v3Students.length).toBeGreaterThan(0);
    v3Students.forEach(submission => {
      if (submission.student1Variant === 'V3') {
        expect(submission.student1).toMatch(/\(V3\)$/);
      }
      if (submission.student2Variant === 'V3') {
        expect(submission.student2).toMatch(/\(V3\)$/);
      }
    });
  });

  test('should calculate class average correctly', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );

    if (flaggedSubmissions.length > 0) {
      const classAverage = flaggedSubmissions[0].classAverageScore;
      expect(classAverage).toBeDefined();

      // Calculate expected class average: (80+80+60+60+60+60)/6 = 66.67%
      const expectedClassAverage = (80 + 80 + 60 + 60 + 60 + 60) / 6;
      expect(classAverage).toBeCloseTo(expectedClassAverage, 1);
    }
  });

  test('should verify all statistics are calculated correctly', () => {
    const analysisResult = createMockAnalysisResult();
    const { responseSimilarityMatrix, variantSimilarityMatrix } = createMockSimilarityMatrices();
    const config = createTestConfig();

    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResult.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResult.metadata.studentResponses || []),
    ];

    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResult,
      mockVariantAnalyses,
      config
    );


    // Test a specific pair to verify all stats
    const testPair = flaggedSubmissions.find(s =>
      (s.student1 === '111111 (V3)' && s.student2 === '242424 (V3)') ||
      (s.student1 === '242424 (V3)' && s.student2 === '111111 (V3)')
    );

    if (testPair) {

      expect(testPair.student1Score).toBeCloseTo(80.0, 1);
      expect(testPair.student2Score).toBeCloseTo(80.0, 1);


      expect(testPair.student1Variant).toBe('V3');
      expect(testPair.student2Variant).toBe('V3');


      expect(testPair.student1Biserial).toBeCloseTo(0.45, 3);
      expect(testPair.student2Biserial).toBeCloseTo(0.45, 3);

      expect(testPair.classAverageScore).toBeCloseTo(66.7, 1);

      expect(testPair.responseSimilarity).toBeGreaterThan(0);
      expect(testPair.responseSimilarity).toBeLessThanOrEqual(1);
      expect(testPair.variantSimilarity).toBeCloseTo(1.0, 1); // Same variant = 100% similarity

      expect(testPair.probability).toBeGreaterThanOrEqual(0);
      expect(testPair.probability).toBeLessThanOrEqual(1);
    }

    // Test cross-variant pair
    const crossVariantPair = flaggedSubmissions.find(s =>
      (s.student1 === '111111 (V3)' && s.student2 === '333333 (V2)') ||
      (s.student1 === '333333 (V2)' && s.student2 === '111111 (V3)')
    );

    if (crossVariantPair) {

      expect(crossVariantPair.student1Score).toBeCloseTo(80.0, 1);
      expect(crossVariantPair.student2Score).toBeCloseTo(60.0, 1);

      expect(['V3', 'V2']).toContain(crossVariantPair.student1Variant);
      expect(['V3', 'V2']).toContain(crossVariantPair.student2Variant);


      expect(crossVariantPair.student1Biserial).toBeCloseTo(0.45, 3);
      expect(crossVariantPair.student2Biserial).toBeCloseTo(0.38, 3);

      expect(crossVariantPair.variantSimilarity).toBeLessThan(1.0);
    }

    const expectedScores = {
      '111111': 80.0, // 4/5
      '242424': 80.0, // 4/5
      '333333': 60.0, // 3/5
      '444444': 60.0, // 3/5
      '555555': 60.0, // 3/5
      '666666': 60.0, // 3/5
    };

    for (const [studentId, expectedScore] of Object.entries(expectedScores)) {
      const studentSubmission = flaggedSubmissions.find(s =>
        s.student1.includes(studentId) || s.student2.includes(studentId)
      );

      if (studentSubmission) {
        const actualScore = studentSubmission.student1.includes(studentId)
          ? studentSubmission.student1Score
          : studentSubmission.student2Score;

        expect(actualScore).toBeCloseTo(expectedScore, 1);
      }
    }

    const expectedBiserials = {
      'V1': 0.35,
      'V2': 0.38,
      'V3': 0.45,
    };

    for (const [variant, expectedBiserial] of Object.entries(expectedBiserials)) {
      const variantSubmission = flaggedSubmissions.find(s =>
        s.student1Variant === variant || s.student2Variant === variant
      );

      if (variantSubmission) {
        const actualBiserial = variantSubmission.student1Variant === variant
          ? variantSubmission.student1Biserial
          : variantSubmission.student2Biserial;


        expect(actualBiserial).toBeCloseTo(expectedBiserial, 3);
      }
    }


  });

  test('should handle database ID vs display ID mismatch correctly', () => {
    // Create mock data with database IDs in studentResponses but display IDs in similarity matrices
    const analysisResultWithDbIds = {
      ...createMockAnalysisResult(),
      metadata: {
        ...createMockAnalysisResult().metadata,
        studentResponses: [
          {
            studentId: 'cmdp7pz3i004zqxrge8uo3309', // Database ID
            displayStudentId: '111111', // Display ID
            name: 'Student 1',
            variantCode: 'V3',
            questionResponses: [
              { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
              { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
              { questionId: 'q3', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 40 },
              { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
              { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 20 },
            ],
            totalScore: 4,
            maxPossibleScore: 5,
            completionTime: 150,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:02:30Z'),
          },
          {
            studentId: 'cmdp7pz3d004wqxrghgf7if02', // Database ID
            displayStudentId: '242424', // Display ID
            name: 'Student 2',
            variantCode: 'V3',
            questionResponses: [
              { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
              { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 26 },
              { questionId: 'q3', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 42 },
              { questionId: 'q4', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 33 },
              { questionId: 'q5', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 22 },
            ],
            totalScore: 4,
            maxPossibleScore: 5,
            completionTime: 151,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:02:31Z'),
          },
          {
            studentId: 'cmdp7pz38004tqxrg9ad6a3ez', // Database ID
            displayStudentId: '333333', // Display ID
            name: 'Student 3',
            variantCode: 'V2',
            questionResponses: [
              { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1, responseTime: 45 },
              { questionId: 'q2', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
              { questionId: 'q3', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
              { questionId: 'q4', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 40 },
              { questionId: 'q5', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
            ],
            totalScore: 3,
            maxPossibleScore: 5,
            completionTime: 175,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:02:55Z'),
          },
        ],
      },
    };

    // Create similarity matrices using display IDs (as they would appear in real data)
    const responseSimilarityMatrix: Record<string, Record<string, number>> = {
      '111111 (V3)': {
        '111111 (V3)': 1.0,
        '242424 (V3)': 0.95,
        '333333 (V2)': 0.45,
      },
      '242424 (V3)': {
        '111111 (V3)': 0.95,
        '242424 (V3)': 1.0,
        '333333 (V2)': 0.42,
      },
      '333333 (V2)': {
        '111111 (V3)': 0.45,
        '242424 (V3)': 0.42,
        '333333 (V2)': 1.0,
      },
    };

    const variantSimilarityMatrix: Record<string, Record<string, number>> = {
      '111111 (V3)': {
        '111111 (V3)': 1.0,
        '242424 (V3)': 1.0,
        '333333 (V2)': 0.15,
      },
      '242424 (V3)': {
        '111111 (V3)': 1.0,
        '242424 (V3)': 1.0,
        '333333 (V2)': 0.15,
      },
      '333333 (V2)': {
        '111111 (V3)': 0.15,
        '242424 (V3)': 0.15,
        '333333 (V2)': 1.0,
      },
    };

    const config = createTestConfig();

    // Create mock BiPointAnalysisResult objects for each variant
    const mockVariantAnalyses = [
      createMockVariantAnalysis('V1', 0.35, analysisResultWithDbIds.metadata.studentResponses || []),
      createMockVariantAnalysis('V2', 0.38, analysisResultWithDbIds.metadata.studentResponses || []),
      createMockVariantAnalysis('V3', 0.45, analysisResultWithDbIds.metadata.studentResponses || []),
    ];

    console.log('\n🧪 TESTING DATABASE ID vs DISPLAY ID MATCHING:');
    console.log('Student Responses with DB IDs:', analysisResultWithDbIds.metadata.studentResponses?.map(s => ({
      studentId: s.studentId,
      displayStudentId: s.displayStudentId,
      variantCode: s.variantCode,
      score: `${(s.totalScore / s.maxPossibleScore * 100).toFixed(1)}%`
    })));

    // Run the flagging model
    const flaggedSubmissions = ProcessSubmissions(
      variantSimilarityMatrix,
      responseSimilarityMatrix,
      analysisResultWithDbIds,
      mockVariantAnalyses,
      config
    );

    console.log(`\n📊 Results: Found ${flaggedSubmissions.length} flagged submissions`);

    // Verify that students are correctly matched using displayStudentId
    const testPair = flaggedSubmissions.find(s =>
      (s.student1 === '111111 (V3)' && s.student2 === '242424 (V3)') ||
      (s.student1 === '242424 (V3)' && s.student2 === '111111 (V3)')
    );

    if (testPair) {




      // Both students should have 80% (4/5)
      expect(testPair.student1Score).toBeCloseTo(80.0, 1);
      expect(testPair.student2Score).toBeCloseTo(80.0, 1);


      expect(testPair.student1Variant).toBe('V3');
      expect(testPair.student2Variant).toBe('V3');

      // Verify biserial values are correctly assigned     
      expect(testPair.student1Biserial).toBeCloseTo(0.45, 3);
      expect(testPair.student2Biserial).toBeCloseTo(0.45, 3);

      // Verify probability is calculated

      expect(testPair.probability).toBeGreaterThanOrEqual(0);
      expect(testPair.probability).toBeLessThanOrEqual(1);
    } else {

      expect(testPair).toBeDefined(); // This will fail the test
    }

    // Test cross-variant matching
    const crossVariantPair = flaggedSubmissions.find(s =>
      (s.student1 === '111111 (V3)' && s.student2 === '333333 (V2)') ||
      (s.student1 === '333333 (V2)' && s.student2 === '111111 (V3)')
    );

    if (crossVariantPair) {


      // Verify student scores
      const student1Score = crossVariantPair.student1 === '111111 (V3)'
        ? crossVariantPair.student1Score
        : crossVariantPair.student2Score;
      const student2Score = crossVariantPair.student1 === '333333 (V2)'
        ? crossVariantPair.student1Score
        : crossVariantPair.student2Score;



      expect(student1Score).toBeCloseTo(80.0, 1); // 111111 has 4/5 = 80%
      expect(student2Score).toBeCloseTo(60.0, 1); // 333333 has 3/5 = 60%

      // Verify variants
      expect(['V3', 'V2']).toContain(crossVariantPair.student1Variant);
      expect(['V3', 'V2']).toContain(crossVariantPair.student2Variant);

      // Verify biserial values
      const student1Biserial = crossVariantPair.student1 === '111111 (V3)'
        ? crossVariantPair.student1Biserial
        : crossVariantPair.student2Biserial;
      const student2Biserial = crossVariantPair.student1 === '333333 (V2)'
        ? crossVariantPair.student1Biserial
        : crossVariantPair.student2Biserial;

      expect(student1Biserial).toBeCloseTo(0.45, 3); // V3 biserial
      expect(student2Biserial).toBeCloseTo(0.38, 3); // V2 biserial
    }


  });

  // Cross-variant grading tests
  describe('Cross-Variant Grading Tests', () => {
    // Helper function to create mock analysis with question results for cross-variant testing
    const createMockAnalysisWithQuestionResults = (): BiPointAnalysisResult => ({
      examId: 'test-exam-cross-variant',
      examTitle: 'Test Exam - Cross Variant',
      analysisConfig: {
        minSampleSize: 2,
        includeDiscriminationIndex: true,
        includeDifficultyIndex: true,
        includePointBiserial: true,
        includeDistractorAnalysis: true,
        confidenceLevel: 0.95,
        excludeIncompleteData: false,
        groupByQuestionType: false,
      } as AnalysisConfig,
      questionResults: [
        {
          questionId: 'q1',
          questionText: 'What is 2 + 2?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          totalResponses: 2,
          correctResponses: 2,
          difficultyIndex: 1.0,
          discriminationIndex: 0.5,
          pointBiserialCorrelation: 0.4,
          distractorAnalysis: {
            correctOption: { option: 'A', frequency: 2, percentage: 100, discriminationIndex: 0.5, pointBiserialCorrelation: 0.4 },
            distractors: [
              { option: 'B', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'C', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'D', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 }
            ],
            omittedResponses: 0,
            omittedPercentage: 0
          },
          statisticalSignificance: {
            isSignificant: true,
            pValue: 0.05,
            criticalValue: 1.96,
            degreesOfFreedom: 1,
            testStatistic: 2.0
          }
        },
        {
          questionId: 'q2',
          questionText: 'What is the capital of France?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          totalResponses: 2,
          correctResponses: 2,
          difficultyIndex: 1.0,
          discriminationIndex: 0.5,
          pointBiserialCorrelation: 0.4,
          distractorAnalysis: {
            correctOption: { option: 'B', frequency: 2, percentage: 100, discriminationIndex: 0.5, pointBiserialCorrelation: 0.4 },
            distractors: [
              { option: 'A', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'C', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'D', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 }
            ],
            omittedResponses: 0,
            omittedPercentage: 0
          },
          statisticalSignificance: {
            isSignificant: true,
            pValue: 0.05,
            criticalValue: 1.96,
            degreesOfFreedom: 1,
            testStatistic: 2.0
          }
        },
        {
          questionId: 'q3',
          questionText: 'What is the largest planet?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          totalResponses: 2,
          correctResponses: 1,
          difficultyIndex: 0.5,
          discriminationIndex: 0.3,
          pointBiserialCorrelation: 0.2,
          distractorAnalysis: {
            correctOption: { option: 'C', frequency: 1, percentage: 50, discriminationIndex: 0.3, pointBiserialCorrelation: 0.2 },
            distractors: [
              { option: 'A', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'B', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'D', frequency: 1, percentage: 50, discriminationIndex: -0.3, pointBiserialCorrelation: -0.2 }
            ],
            omittedResponses: 0,
            omittedPercentage: 0
          },
          statisticalSignificance: {
            isSignificant: false,
            pValue: 0.1,
            criticalValue: 1.96,
            degreesOfFreedom: 1,
            testStatistic: 1.0
          }
        }
      ],
      metadata: {
        totalStudents: 4,
        totalVariants: 2,
        analysisDate: new Date(),
        sampleSize: 4,
        excludedStudents: 0,
        studentResponses: [
          {
            studentId: 'student1',
            displayStudentId: 'student1',
            name: 'Student 1',
            variantCode: 'V1',
            questionResponses: [
              { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
              { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
              { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1, responseTime: 40 },
            ],
            totalScore: 3,
            maxPossibleScore: 3,
            completionTime: 95,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:01:35Z'),
          },
          {
            studentId: 'student2',
            displayStudentId: 'student2',
            name: 'Student 2',
            variantCode: 'V2',
            questionResponses: [
              { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
              { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1, responseTime: 26 },
              { questionId: 'q3', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 42 },
            ],
            totalScore: 2,
            maxPossibleScore: 3,
            completionTime: 96,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:01:36Z'),
          },
        ],
      },
      summary: {
        averageDifficulty: 0.67,
        averageDiscrimination: 0.5,
        averagePointBiserial: 0.4,
      } as AnalysisSummary,
      variantResults: [],
    });

    // Helper function to create variant-specific analysis with different answer keys
    const createVariantAnalysis = (variantCode: string, answerKey: Record<string, string>): BiPointAnalysisResult => ({
      examId: `test-exam-${variantCode}`,
      examTitle: `Test Exam - ${variantCode}`,
      analysisConfig: {
        minSampleSize: 2,
        includeDiscriminationIndex: true,
        includeDifficultyIndex: true,
        includePointBiserial: true,
        includeDistractorAnalysis: true,
        confidenceLevel: 0.95,
        excludeIncompleteData: false,
        groupByQuestionType: false,
      } as AnalysisConfig,
      questionResults: [
        {
          questionId: 'q1',
          questionText: 'What is 2 + 2?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          totalResponses: 2,
          correctResponses: 2,
          difficultyIndex: 1.0,
          discriminationIndex: 0.5,
          pointBiserialCorrelation: 0.4,
          distractorAnalysis: {
            correctOption: { option: answerKey['q1'], frequency: 2, percentage: 100, discriminationIndex: 0.5, pointBiserialCorrelation: 0.4 },
            distractors: [
              { option: 'A', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'B', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'C', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'D', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 }
            ].filter(d => d.option !== answerKey['q1']),
            omittedResponses: 0,
            omittedPercentage: 0
          },
          statisticalSignificance: {
            isSignificant: true,
            pValue: 0.05,
            criticalValue: 1.96,
            degreesOfFreedom: 1,
            testStatistic: 2.0
          }
        },
        {
          questionId: 'q2',
          questionText: 'What is the capital of France?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          totalResponses: 2,
          correctResponses: 2,
          difficultyIndex: 1.0,
          discriminationIndex: 0.5,
          pointBiserialCorrelation: 0.4,
          distractorAnalysis: {
            correctOption: { option: answerKey['q2'], frequency: 2, percentage: 100, discriminationIndex: 0.5, pointBiserialCorrelation: 0.4 },
            distractors: [
              { option: 'A', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'B', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'C', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'D', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 }
            ].filter(d => d.option !== answerKey['q2']),
            omittedResponses: 0,
            omittedPercentage: 0
          },
          statisticalSignificance: {
            isSignificant: true,
            pValue: 0.05,
            criticalValue: 1.96,
            degreesOfFreedom: 1,
            testStatistic: 2.0
          }
        },
        {
          questionId: 'q3',
          questionText: 'What is the largest planet?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          totalResponses: 2,
          correctResponses: 2,
          difficultyIndex: 1.0,
          discriminationIndex: 0.5,
          pointBiserialCorrelation: 0.4,
          distractorAnalysis: {
            correctOption: { option: answerKey['q3'], frequency: 2, percentage: 100, discriminationIndex: 0.5, pointBiserialCorrelation: 0.4 },
            distractors: [
              { option: 'A', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'B', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'C', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 },
              { option: 'D', frequency: 0, percentage: 0, discriminationIndex: 0, pointBiserialCorrelation: 0 }
            ].filter(d => d.option !== answerKey['q3']),
            omittedResponses: 0,
            omittedPercentage: 0
          },
          statisticalSignificance: {
            isSignificant: true,
            pValue: 0.05,
            criticalValue: 1.96,
            degreesOfFreedom: 1,
            testStatistic: 2.0
          }
        }
      ],
      metadata: {
        totalStudents: 2,
        totalVariants: 1,
        analysisDate: new Date(),
        sampleSize: 2,
        excludedStudents: 0,
        studentResponses: [
          {
            studentId: `student-${variantCode}-1`,
            displayStudentId: `student-${variantCode}-1`,
            name: `Student ${variantCode} 1`,
            variantCode: variantCode,
            questionResponses: [
              { questionId: 'q1', studentAnswer: answerKey['q1'], isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
              { questionId: 'q2', studentAnswer: answerKey['q2'], isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
              { questionId: 'q3', studentAnswer: answerKey['q3'], isCorrect: true, points: 1, maxPoints: 1, responseTime: 40 },
            ],
            totalScore: 3,
            maxPossibleScore: 3,
            completionTime: 95,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:01:35Z'),
          },
          {
            studentId: `student-${variantCode}-2`,
            displayStudentId: `student-${variantCode}-2`,
            name: `Student ${variantCode} 2`,
            variantCode: variantCode,
            questionResponses: [
              { questionId: 'q1', studentAnswer: answerKey['q1'], isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
              { questionId: 'q2', studentAnswer: answerKey['q2'], isCorrect: true, points: 1, maxPoints: 1, responseTime: 26 },
              { questionId: 'q3', studentAnswer: answerKey['q3'], isCorrect: true, points: 1, maxPoints: 1, responseTime: 42 },
            ],
            totalScore: 3,
            maxPossibleScore: 3,
            completionTime: 96,
            startedAt: new Date('2024-01-01T10:00:00Z'),
            completedAt: new Date('2024-01-01T10:01:36Z'),
          },
        ],
      },
      summary: {
        averageDifficulty: 0.67,
        averageDiscrimination: 0.5,
        averagePointBiserial: 0.4,
      } as AnalysisSummary,
      variantResults: [],
    });

    test('should return zero grade changes for same-variant pairs', () => {
      const analysisResult = createMockAnalysisWithQuestionResults();
      const responseSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V1)': 0.9,
        },
        'student2 (V1)': {
          'student1 (V1)': 0.9,
          'student2 (V1)': 1.0,
        },
      };

      const variantSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V1)': 1.0,
        },
        'student2 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V1)': 1.0,
        },
      };

      const config = createTestConfig();
      const modelConfig = {
        invertVaraintSimularity: true,
      };
      const variantAnalyses = [createVariantAnalysis('V1', { q1: 'A', q2: 'B', q3: 'C' })];

      const flaggedSubmissions = ProcessSubmissions(
        variantSimilarityMatrix,
        responseSimilarityMatrix,
        analysisResult,
        variantAnalyses,
        config,
        modelConfig
      );

      // Find the same-variant pair
      const sameVariantPair = flaggedSubmissions.find(s =>
        s.student1Variant === 'V1' && s.student2Variant === 'V1'
      );

      if (sameVariantPair) {
        expect(sameVariantPair.student1GradeChange).toBe(0);
        expect(sameVariantPair.student2GradeChange).toBe(0);
        expect(sameVariantPair.student1CrossGrade).toBe(0);
        expect(sameVariantPair.student2CrossGrade).toBe(0);
      }
    });

    test('should calculate correct cross-variant grades for different variants', () => {
      // Create analysis with students from different variants
      const analysisResult = createMockAnalysisWithQuestionResults();

      // Create similarity matrices for cross-variant comparison
      const responseSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.8,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.8,
          'student2 (V2)': 1.0,
        },
      };

      const variantSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.2,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.2,
          'student2 (V2)': 1.0,
        },
      };

      const config = createTestConfig();
      const modelConfig = {
        invertVaraintSimularity: true,
      };

      // Create variant analyses with different answer keys
      const variantAnalyses = [
        createVariantAnalysis('V1', { q1: 'A', q2: 'B', q3: 'C' }), // V1 answer key
        createVariantAnalysis('V2', { q1: 'A', q2: 'A', q3: 'D' }), // V2 answer key (different from V1)
      ];

      const flaggedSubmissions = ProcessSubmissions(
        variantSimilarityMatrix,
        responseSimilarityMatrix,
        analysisResult,
        variantAnalyses,
        config,
        modelConfig
      );

      // Find the cross-variant pair
      const crossVariantPair = flaggedSubmissions.find(s =>
        (s.student1Variant === 'V1' && s.student2Variant === 'V2') ||
        (s.student1Variant === 'V2' && s.student2Variant === 'V1')
      );

      if (crossVariantPair) {
        // Student 1 (V1): answered A, B, C
        // V2 answer key: A, A, D
        // Student 1 graded on V2: A✓, B✗, C✗ = 1/3 = 33.33%
        const expectedStudent1CrossGrade = 33.33;

        // Student 2 (V2): answered A, A, D  
        // V1 answer key: A, B, C
        // Student 2 graded on V1: A✓, A✗, D✗ = 1/3 = 33.33%
        const expectedStudent2CrossGrade = 33.33;

        // Original grades
        const expectedStudent1OriginalGrade = 100; // 3/3 = 100%
        const expectedStudent2OriginalGrade = 66.67; // 2/3 = 66.67%

        // Grade changes
        const expectedStudent1GradeChange = expectedStudent1CrossGrade - expectedStudent1OriginalGrade; // 33.33 - 100 = -66.67
        const expectedStudent2GradeChange = expectedStudent2CrossGrade - expectedStudent2OriginalGrade; // 33.33 - 66.67 = -33.34

        // Verify cross grades
        expect(crossVariantPair.student1CrossGrade).toBeCloseTo(expectedStudent1CrossGrade, 1);
        expect(crossVariantPair.student2CrossGrade).toBeCloseTo(expectedStudent2CrossGrade, 1);

        // Verify original grades are not exposed in the interface (they're calculated internally)
        // The original grades are: student1 = 100%, student2 = 66.67%

        // Verify grade changes
        expect(crossVariantPair.student1GradeChange).toBeCloseTo(expectedStudent1GradeChange, 1);
        expect(crossVariantPair.student2GradeChange).toBeCloseTo(expectedStudent2GradeChange, 1);
      }
    });

    test('should handle edge cases in cross-variant grading', () => {
      // Test with students who have no correct answers on their own variant
      const analysisResult = {
        ...createMockAnalysisWithQuestionResults(),
        metadata: {
          ...createMockAnalysisWithQuestionResults().metadata,
          studentResponses: [
            {
              studentId: 'student1',
              displayStudentId: 'student1',
              name: 'Student 1',
              variantCode: 'V1',
              questionResponses: [
                { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1, responseTime: 30 },
                { questionId: 'q2', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 25 },
                { questionId: 'q3', studentAnswer: 'D', isCorrect: false, points: 0, maxPoints: 1, responseTime: 40 },
              ],
              totalScore: 0,
              maxPossibleScore: 3,
              completionTime: 95,
              startedAt: new Date('2024-01-01T10:00:00Z'),
              completedAt: new Date('2024-01-01T10:01:35Z'),
            },
            {
              studentId: 'student2',
              displayStudentId: 'student2',
              name: 'Student 2',
              variantCode: 'V2',
              questionResponses: [
                { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1, responseTime: 28 },
                { questionId: 'q2', studentAnswer: 'C', isCorrect: false, points: 0, maxPoints: 1, responseTime: 26 },
                { questionId: 'q3', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1, responseTime: 42 },
              ],
              totalScore: 0,
              maxPossibleScore: 3,
              completionTime: 96,
              startedAt: new Date('2024-01-01T10:00:00Z'),
              completedAt: new Date('2024-01-01T10:01:36Z'),
            },
          ],
        },
      };

      const responseSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.9,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.9,
          'student2 (V2)': 1.0,
        },
      };

      const variantSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.2,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.2,
          'student2 (V2)': 1.0,
        },
      };

      const config = createTestConfig();
      const modelConfig = {
        invertVaraintSimularity: true,
      };
      const variantAnalyses = [
        createVariantAnalysis('V1', { q1: 'A', q2: 'B', q3: 'C' }),
        createVariantAnalysis('V2', { q1: 'A', q2: 'A', q3: 'D' }),
      ];

      const flaggedSubmissions = ProcessSubmissions(
        variantSimilarityMatrix,
        responseSimilarityMatrix,
        analysisResult,
        variantAnalyses,
        config,
        modelConfig
      );

      const crossVariantPair = flaggedSubmissions.find(s =>
        (s.student1Variant === 'V1' && s.student2Variant === 'V2') ||
        (s.student1Variant === 'V2' && s.student2Variant === 'V1')
      );

      if (crossVariantPair) {
        // Both students have 0% on their own variants (not exposed in interface)

        // Cross grades should be calculated correctly
        expect(crossVariantPair.student1CrossGrade).toBeGreaterThanOrEqual(0);
        expect(crossVariantPair.student2CrossGrade).toBeGreaterThanOrEqual(0);
        expect(crossVariantPair.student1CrossGrade).toBeLessThanOrEqual(100);
        expect(crossVariantPair.student2CrossGrade).toBeLessThanOrEqual(100);

        // Grade changes should be the same as cross grades since original grades are 0
        expect(crossVariantPair.student1GradeChange).toBeCloseTo(crossVariantPair.student1CrossGrade || 0, 1);
        expect(crossVariantPair.student2GradeChange).toBeCloseTo(crossVariantPair.student2CrossGrade || 0, 1);
      }
    });

    test('should verify cross-variant grading logic matches student answers correctly', () => {
      // Create a more complex scenario with specific answer patterns
      const analysisResult = {
        ...createMockAnalysisWithQuestionResults(),
        metadata: {
          ...createMockAnalysisWithQuestionResults().metadata,
          studentResponses: [
            {
              studentId: 'student1',
              displayStudentId: 'student1',
              name: 'Student 1',
              variantCode: 'V1',
              questionResponses: [
                { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
                { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
                { questionId: 'q3', studentAnswer: 'C', isCorrect: true, points: 1, maxPoints: 1, responseTime: 40 },
              ],
              totalScore: 3,
              maxPossibleScore: 3,
              completionTime: 95,
              startedAt: new Date('2024-01-01T10:00:00Z'),
              completedAt: new Date('2024-01-01T10:01:35Z'),
            },
            {
              studentId: 'student2',
              displayStudentId: 'student2',
              name: 'Student 2',
              variantCode: 'V2',
              questionResponses: [
                { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
                { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1, responseTime: 26 },
                { questionId: 'q3', studentAnswer: 'D', isCorrect: true, points: 1, maxPoints: 1, responseTime: 42 },
              ],
              totalScore: 2,
              maxPossibleScore: 3,
              completionTime: 96,
              startedAt: new Date('2024-01-01T10:00:00Z'),
              completedAt: new Date('2024-01-01T10:01:36Z'),
            },
          ],
        },
      };

      const responseSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.8,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.8,
          'student2 (V2)': 1.0,
        },
      };

      const variantSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.2,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.2,
          'student2 (V2)': 1.0,
        },
      };

      const config = createTestConfig();
      const modelConfig = {
        invertVaraintSimularity: true,
      };

      // Create variant analyses with specific answer keys
      const variantAnalyses = [
        createVariantAnalysis('V1', { q1: 'A', q2: 'B', q3: 'C' }), // V1: A, B, C
        createVariantAnalysis('V2', { q1: 'A', q2: 'A', q3: 'D' }), // V2: A, A, D
      ];

      const flaggedSubmissions = ProcessSubmissions(
        variantSimilarityMatrix,
        responseSimilarityMatrix,
        analysisResult,
        variantAnalyses,
        config,
        modelConfig
      );

      const crossVariantPair = flaggedSubmissions.find(s =>
        (s.student1Variant === 'V1' && s.student2Variant === 'V2') ||
        (s.student1Variant === 'V2' && s.student2Variant === 'V1')
      );

      if (crossVariantPair) {
        // Verify the specific grading logic:
        // Student 1 (V1) answers: A, B, C
        // V2 answer key: A, A, D
        // Student 1 graded on V2: A✓, B✗, C✗ = 1/3 = 33.33%
        expect(crossVariantPair.student1CrossGrade).toBeCloseTo(33.33, 1);

        // Student 2 (V2) answers: A, A, D  
        // V1 answer key: A, B, C
        // Student 2 graded on V1: A✓, A✗, D✗ = 1/3 = 33.33%
        expect(crossVariantPair.student2CrossGrade).toBeCloseTo(33.33, 1);

        // Original grades are calculated internally (student1 = 100%, student2 = 66.67%)

        // Grade changes
        expect(crossVariantPair.student1GradeChange).toBeCloseTo(-66.67, 1); // 33.33 - 100
        expect(crossVariantPair.student2GradeChange).toBeCloseTo(-33.34, 1); // 33.33 - 66.67
      }
    });

    test('should handle missing question results gracefully', () => {
      // Test with variant analysis that has missing question results
      const analysisResult = createMockAnalysisWithQuestionResults();

      const responseSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.8,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.8,
          'student2 (V2)': 1.0,
        },
      };

      const variantSimilarityMatrix: Record<string, Record<string, number>> = {
        'student1 (V1)': {
          'student1 (V1)': 1.0,
          'student2 (V2)': 0.2,
        },
        'student2 (V2)': {
          'student1 (V1)': 0.2,
          'student2 (V2)': 1.0,
        },
      };

      const config = createTestConfig();
      const modelConfig = {
        invertVaraintSimularity: true,
      };

      // Create variant analysis with missing question results for both variants
      const variantAnalyses = [
        {
          ...createVariantAnalysis('V1', { q1: 'A', q2: 'B', q3: 'C' }),
          questionResults: [] // Empty question results for V1
        },
        {
          ...createVariantAnalysis('V2', { q1: 'A', q2: 'A', q3: 'D' }),
          questionResults: [] // Empty question results for V2
        },
      ];

      const flaggedSubmissions = ProcessSubmissions(
        variantSimilarityMatrix,
        responseSimilarityMatrix,
        analysisResult,
        variantAnalyses,
        config,
        modelConfig
      );

      const crossVariantPair = flaggedSubmissions.find(s =>
        (s.student1Variant === 'V1' && s.student2Variant === 'V2') ||
        (s.student1Variant === 'V2' && s.student2Variant === 'V1')
      );

      if (crossVariantPair) {
        // When both variants have missing question results, cross grades should be 0
        expect(crossVariantPair.student1CrossGrade).toBe(0);
        expect(crossVariantPair.student2CrossGrade).toBe(0);

        // Grade changes should be negative (original grades minus 0)
        expect(crossVariantPair.student1GradeChange).toBeCloseTo(-100, 1); // 0 - 100
        expect(crossVariantPair.student2GradeChange).toBeCloseTo(-66.67, 1); // 0 - 66.67
      }
    });
  });
});

