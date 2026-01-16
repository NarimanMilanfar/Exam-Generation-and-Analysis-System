import { analyzeExam } from '../../app/lib/biPointAnalysis';
import { ExamVariantForAnalysis, StudentResponse, AnalysisConfig } from '../../app/types/analysis';
import { QuestionType } from '../../app/types/course';

describe('Bi-Point Analysis Edge Cases & Error Handling', () => {
  const baseVariant: ExamVariantForAnalysis = {
    id: 'v1',
    examId: 'exam1',
    variantCode: 'A',
    questions: [
      { id: 'q1', questionText: 'Q1', questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'A', options: ['A', 'B'], points: 1 },
      { id: 'q2', questionText: 'Q2', questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: 'B', options: ['A', 'B'], points: 1 },
    ],
  };
  const config: AnalysisConfig = {
    minSampleSize: 1,
    includeDiscriminationIndex: true,
    includeDifficultyIndex: true,
    includePointBiserial: true,
    includeDistractorAnalysis: true,
    confidenceLevel: 0.95,
    excludeIncompleteData: false,

    groupByQuestionType: false,
  };

  it('returns null for skewness/kurtosis with <4 samples', async () => {
    const responses: StudentResponse[] = [
      { studentId: 's1', variantCode: 'A', totalScore: 1, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }] },
      { studentId: 's2', variantCode: 'A', totalScore: 2, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 }] },
      { studentId: 's3', variantCode: 'A', totalScore: 0, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 }] },
    ];
    const result = await analyzeExam([baseVariant], responses, config);
    expect(result.summary.scoreDistribution!.skewness).toBe(0);
    expect(result.summary.scoreDistribution!.kurtosis).toBeNull();
  });

  it('returns null for skewness with <3 samples', async () => {
    const responses: StudentResponse[] = [
      { studentId: 's1', variantCode: 'A', totalScore: 1, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 }] },
      { studentId: 's2', variantCode: 'A', totalScore: 2, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 }] },

    ];
    const result = await analyzeExam([baseVariant], responses, config);
    expect(result.summary.scoreDistribution!.skewness).toBeNull();
  });

  it('returns 0 discrimination when all students have same score', async () => {
    const responses: StudentResponse[] = Array.from({ length: 5 }, (_, i) => ({
      studentId: `s${i + 1}`,
      variantCode: 'A',
      totalScore: 2,
      maxPossibleScore: 2,
      startedAt: new Date(),
      completedAt: new Date(),
      questionResponses: [
        { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
        { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
      ],
    }));
    const result = await analyzeExam([baseVariant], responses, config);
    result.questionResults.forEach(q => {
      expect(q.discriminationIndex).toBe(0);
    });
  });

  it('handles empty input arrays gracefully', async () => {
    await expect(analyzeExam([baseVariant], [], config)).rejects.toThrow('No student responses found for analysis.');
    await expect(analyzeExam([], [], config)).rejects.toThrow('No student responses found for analysis.');
  });

  it('returns undefined reliability for <3 students', async () => {
    const responses: StudentResponse[] = [
      { studentId: 's1', variantCode: 'A', totalScore: 2, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 }] },
      { studentId: 's2', variantCode: 'A', totalScore: 2, maxPossibleScore: 2, startedAt: new Date(), completedAt: new Date(), questionResponses: [{ questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 }, { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 }] },
    ];
    const result = await analyzeExam([baseVariant], responses, config);
    expect(result.summary.reliabilityMetrics).toBeUndefined();
  });

  it('returns undefined reliability for <2 questions', async () => {
    const responses: StudentResponse[] = Array.from({ length: 5 }, (_, i) => ({
      studentId: `s${i + 1}`,
      variantCode: 'A',
      totalScore: 1,
      maxPossibleScore: 1,
      startedAt: new Date(),
      completedAt: new Date(),
      questionResponses: [
        { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
      ],
    }));
    const singleQVariant = { ...baseVariant, questions: [baseVariant.questions[0]] };
    const result = await analyzeExam([singleQVariant], responses, config);
    expect(result.summary.reliabilityMetrics).toBeUndefined();
  });

  it('does not throw for all students wrong/correct (point-biserial edge)', async () => {
    // All correct
    const allCorrect: StudentResponse[] = Array.from({ length: 5 }, (_, i) => ({
      studentId: `s${i + 1}`,
      variantCode: 'A',
      totalScore: 2,
      maxPossibleScore: 2,
      startedAt: new Date(),
      completedAt: new Date(),
      questionResponses: [
        { questionId: 'q1', studentAnswer: 'A', isCorrect: true, points: 1, maxPoints: 1 },
        { questionId: 'q2', studentAnswer: 'B', isCorrect: true, points: 1, maxPoints: 1 },
      ],
    }));
    const result1 = await analyzeExam([baseVariant], allCorrect, config);
    result1.questionResults.forEach(q => {
      expect(q.pointBiserialCorrelation).toBe(0);
    });
    // All wrong
    const allWrong: StudentResponse[] = Array.from({ length: 5 }, (_, i) => ({
      studentId: `s${i + 1}`,
      variantCode: 'A',
      totalScore: 0,
      maxPossibleScore: 2,
      startedAt: new Date(),
      completedAt: new Date(),
      questionResponses: [
        { questionId: 'q1', studentAnswer: 'B', isCorrect: false, points: 0, maxPoints: 1 },
        { questionId: 'q2', studentAnswer: 'A', isCorrect: false, points: 0, maxPoints: 1 },
      ],
    }));
    const result2 = await analyzeExam([baseVariant], allWrong, config);
    result2.questionResults.forEach(q => {
      expect(q.pointBiserialCorrelation).toBe(0);
    });
  });
});
