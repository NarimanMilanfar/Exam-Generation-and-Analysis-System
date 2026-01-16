import { calculateStudentSimilarityMatrix, calculateVariantSimilarityMatrix } from "../../app/lib/biPointAnalysis";
import { StudentResponse, QuestionResponse, ExamVariantForAnalysis } from "../../app/types/analysis";
import { QuestionType } from "../../app/types/course";

describe("Integrity Analysis - Student Similarity Matrix", () => {
  // Test data: 5 students with 10 questions each
  const mockStudentResponses: StudentResponse[] = [
    {
      studentId: "student1",
      variantCode: "V1",
      questionResponses: [
        { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
        { questionId: "q2", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 45 },
        { questionId: "q3", studentAnswer: "C", isCorrect: false, points: 0, maxPoints: 1, responseTime: 20 },
        { questionId: "q4", studentAnswer: "D", isCorrect: true, points: 1, maxPoints: 1, responseTime: 60 },
        { questionId: "q5", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
        { questionId: "q6", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 50 },
        { questionId: "q7", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 40 },
        { questionId: "q8", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 55 },
        { questionId: "q9", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
        { questionId: "q10", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 65 },
      ],
      totalScore: 5,
      maxPossibleScore: 10,
      completionTime: 425,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:07:05Z"),
    },
    {
      studentId: "student2",
      variantCode: "V2",
      questionResponses: [
        { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
        { questionId: "q2", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 40 },
        { questionId: "q3", studentAnswer: "B", isCorrect: true, points: 1, maxPoints: 1, responseTime: 35 },
        { questionId: "q4", studentAnswer: "D", isCorrect: true, points: 1, maxPoints: 1, responseTime: 50 },
        { questionId: "q5", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
        { questionId: "q6", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 45 },
        { questionId: "q7", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 38 },
        { questionId: "q8", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 52 },
        { questionId: "q9", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
        { questionId: "q10", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 60 },
      ],
      totalScore: 7,
      maxPossibleScore: 10,
      completionTime: 403,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:06:43Z"),
    },
    {
      studentId: "student3",
      variantCode: "V1",
      questionResponses: [
        { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 28 },
        { questionId: "q2", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 42 },
        { questionId: "q3", studentAnswer: "C", isCorrect: false, points: 0, maxPoints: 1, responseTime: 22 },
        { questionId: "q4", studentAnswer: "D", isCorrect: true, points: 1, maxPoints: 1, responseTime: 58 },
        { questionId: "q5", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 33 },
        { questionId: "q6", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 48 },
        { questionId: "q7", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 41 },
        { questionId: "q8", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 54 },
        { questionId: "q9", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 26 },
        { questionId: "q10", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 62 },
      ],
      totalScore: 5,
      maxPossibleScore: 10,
      completionTime: 414,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:06:54Z"),
    },
    {
      studentId: "student4",
      variantCode: "V3",
      questionResponses: [
        { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 32 },
        { questionId: "q2", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 47 },
        { questionId: "q3", studentAnswer: "A", isCorrect: false, points: 0, maxPoints: 1, responseTime: 24 },
        { questionId: "q4", studentAnswer: "D", isCorrect: true, points: 1, maxPoints: 1, responseTime: 56 },
        { questionId: "q5", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 31 },
        { questionId: "q6", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 49 },
        { questionId: "q7", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 39 },
        { questionId: "q8", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 53 },
        { questionId: "q9", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 27 },
        { questionId: "q10", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 64 },
      ],
      totalScore: 6,
      maxPossibleScore: 10,
      completionTime: 422,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:07:02Z"),
    },
    {
      studentId: "student5",
      variantCode: "V2",
      questionResponses: [
        { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 29 },
        { questionId: "q2", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 41 },
        { questionId: "q3", studentAnswer: "B", isCorrect: true, points: 1, maxPoints: 1, responseTime: 36 },
        { questionId: "q4", studentAnswer: "D", isCorrect: true, points: 1, maxPoints: 1, responseTime: 51 },
        { questionId: "q5", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 29 },
        { questionId: "q6", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 46 },
        { questionId: "q7", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 37 },
        { questionId: "q8", studentAnswer: "D", isCorrect: false, points: 0, maxPoints: 1, responseTime: 51 },
        { questionId: "q9", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 29 },
        { questionId: "q10", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 61 },
      ],
      totalScore: 7,
      maxPossibleScore: 10,
      completionTime: 410,
      startedAt: new Date("2024-01-01T10:00:00Z"),
      completedAt: new Date("2024-01-01T10:06:50Z"),
    },
  ];

  it("should calculate similarity matrix correctly", () => {
    // Calculate the similarity matrix
    const similarityMatrix = calculateStudentSimilarityMatrix(mockStudentResponses);

    // Test diagonal values (should always be 1)
    expect(similarityMatrix["student1"]["student1"]).toBe(1);
    expect(similarityMatrix["student2"]["student2"]).toBe(1);
    expect(similarityMatrix["student3"]["student3"]).toBe(1);
    expect(similarityMatrix["student4"]["student4"]).toBe(1);
    expect(similarityMatrix["student5"]["student5"]).toBe(1);

    // Test cross-student similarities
    expect(similarityMatrix["student1"]["student2"]).toBe(0.8); // 8/10 matching
    expect(similarityMatrix["student1"]["student3"]).toBe(1.0);  // 10/10 matching (identical)
    expect(similarityMatrix["student1"]["student4"]).toBe(0.6);  // 6/10 matching
    expect(similarityMatrix["student1"]["student5"]).toBe(0.8);  // 8/10 matching
    expect(similarityMatrix["student2"]["student5"]).toBe(1.0);  // 10/10 matching (identical)

    // Test symmetry (matrix should be symmetric)
    expect(similarityMatrix["student2"]["student1"]).toBe(0.8);
    expect(similarityMatrix["student3"]["student1"]).toBe(1.0);
    expect(similarityMatrix["student4"]["student1"]).toBe(0.6);
    expect(similarityMatrix["student5"]["student1"]).toBe(0.8);
    expect(similarityMatrix["student5"]["student2"]).toBe(1.0);

  });


  it("should handle students with different question sets", () => {
    const variedResponses: StudentResponse[] = [
      {
        studentId: "studentA",
        variantCode: "V1",
        questionResponses: [
          { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 30 },
          { questionId: "q2", studentAnswer: "B", isCorrect: false, points: 0, maxPoints: 1, responseTime: 45 },
        ],
        totalScore: 1,
        maxPossibleScore: 2,
        completionTime: 75,
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: new Date("2024-01-01T10:01:15Z"),
      },
      {
        studentId: "studentB",
        variantCode: "V2",
        questionResponses: [
          { questionId: "q1", studentAnswer: "A", isCorrect: true, points: 1, maxPoints: 1, responseTime: 25 },
          { questionId: "q3", studentAnswer: "C", isCorrect: true, points: 1, maxPoints: 1, responseTime: 40 },
        ],
        totalScore: 2,
        maxPossibleScore: 2,
        completionTime: 65,
        startedAt: new Date("2024-01-01T10:00:00Z"),
        completedAt: new Date("2024-01-01T10:01:05Z"),
      },
    ];

    const matrix = calculateStudentSimilarityMatrix(variedResponses);

    // Should be 1.0 because they both answered "A" for the only common question (q1)
    expect(matrix["studentA"]["studentB"]).toBe(1.0);
    expect(matrix["studentB"]["studentA"]).toBe(1.0);
  });

  it("should handle empty responses", () => {
    const emptyResponses: StudentResponse[] = [];
    const matrix = calculateStudentSimilarityMatrix(emptyResponses);

    expect(matrix).toEqual({});
  });

  it("should handle single student", () => {
    const singleStudent = [mockStudentResponses[0]];
    const matrix = calculateStudentSimilarityMatrix(singleStudent);

    expect(matrix["student1"]["student1"]).toBe(1);
    expect(Object.keys(matrix)).toHaveLength(1);
  });

  it("show the matrix", () => {
    const similarityMatrix = calculateStudentSimilarityMatrix(mockStudentResponses);

    // Create a map of student IDs to variant codes
    const studentVariants: Record<string, string> = {};
    mockStudentResponses.forEach(response => {
      studentVariants[response.studentId] = response.variantCode;
    });

    // Create matrix with variant codes in student IDs
    const matrixWithVariants: Record<string, Record<string, number>> = {};
    Object.keys(similarityMatrix).forEach(studentId => {
      const variantCode = studentVariants[studentId];
      const studentWithVariant = `${studentId} (${variantCode})`;
      matrixWithVariants[studentWithVariant] = {};

      Object.keys(similarityMatrix[studentId]).forEach(otherStudentId => {
        const otherVariantCode = studentVariants[otherStudentId];
        const otherStudentWithVariant = `${otherStudentId} (${otherVariantCode})`;
        matrixWithVariants[studentWithVariant][otherStudentWithVariant] = similarityMatrix[studentId][otherStudentId];
      });
    });

    // Debug log: Show the entire similarity matrix with variant codes
    console.log("\n=== STUDENT SIMILARITY MATRIX (with variants) ===");
    console.table(matrixWithVariants);
    expect(similarityMatrix).toBeDefined();
  });

});

describe("Integrity Analysis - Variant Similarity Matrix", () => {
  // Test data: 3 variants with 10 questions matching student data
  const mockExamVariants: ExamVariantForAnalysis[] = [
    {
      id: "variant1",
      examId: "exam1",
      variantCode: "V1",
      questions: [
        { id: "q1", questionText: "Question 1", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q2", questionText: "Question 2", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q3", questionText: "Question 3", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "C", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q4", questionText: "Question 4", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "D", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q5", questionText: "Question 5", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q6", questionText: "Question 6", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q7", questionText: "Question 7", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "C", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q8", questionText: "Question 8", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "D", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q9", questionText: "Question 9", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q10", questionText: "Question 10", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
      ],
      metadata: {
        questionOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Original order
        optionPermutations: {
          "q1": [0, 1, 2, 3], "q2": [0, 1, 2, 3], "q3": [0, 1, 2, 3], "q4": [0, 1, 2, 3], "q5": [0, 1, 2, 3],
          "q6": [0, 1, 2, 3], "q7": [0, 1, 2, 3], "q8": [0, 1, 2, 3], "q9": [0, 1, 2, 3], "q10": [0, 1, 2, 3],
        },
        answerKey: "[]"
      }
    },
    {
      id: "variant2",
      examId: "exam1",
      variantCode: "V2",
      questions: [
        { id: "q1", questionText: "Question 1", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q2", questionText: "Question 2", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q3", questionText: "Question 3", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "C", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q4", questionText: "Question 4", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "D", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q5", questionText: "Question 5", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q6", questionText: "Question 6", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q7", questionText: "Question 7", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "C", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q8", questionText: "Question 8", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "D", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q9", questionText: "Question 9", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q10", questionText: "Question 10", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
      ],
      metadata: {
        questionOrder: [9, 8, 7, 6, 5, 4, 3, 2, 1, 0], // Reversed order
        optionPermutations: {
          "q1": [3, 2, 1, 0], "q2": [3, 2, 1, 0], "q3": [3, 2, 1, 0], "q4": [3, 2, 1, 0], "q5": [3, 2, 1, 0],
          "q6": [0, 1, 2, 3], "q7": [0, 1, 2, 3], "q8": [0, 1, 2, 3], "q9": [0, 1, 2, 3], "q10": [0, 1, 2, 3],
        },
        answerKey: "[]"
      }
    },
    {
      id: "variant3",
      examId: "exam1",
      variantCode: "V3",
      questions: [
        { id: "q1", questionText: "Question 1", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q2", questionText: "Question 2", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q3", questionText: "Question 3", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "C", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q4", questionText: "Question 4", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "D", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q5", questionText: "Question 5", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q6", questionText: "Question 6", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q7", questionText: "Question 7", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "C", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q8", questionText: "Question 8", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "D", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q9", questionText: "Question 9", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "A", options: ["A", "B", "C", "D"], points: 1 },
        { id: "q10", questionText: "Question 10", questionType: QuestionType.MULTIPLE_CHOICE, correctAnswer: "B", options: ["A", "B", "C", "D"], points: 1 },
      ],
      metadata: {
        questionOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], // Same as V1 (identical question order)
        optionPermutations: {
          "q1": [1, 0, 3, 2], "q2": [1, 0, 3, 2], "q3": [1, 0, 3, 2], "q4": [1, 0, 3, 2], "q5": [1, 0, 3, 2],
          "q6": [0, 1, 2, 3], "q7": [0, 1, 2, 3], "q8": [0, 1, 2, 3], "q9": [0, 1, 2, 3], "q10": [0, 1, 2, 3],
        },
        answerKey: "[]"
      }
    },
  ];

  it("should calculate variant similarity matrix correctly", () => {
    const variantMatrix = calculateVariantSimilarityMatrix(mockExamVariants);

    // Test diagonal values (should always be 1)
    expect(variantMatrix["V1"]["V1"]).toBe(1);
    expect(variantMatrix["V2"]["V2"]).toBe(1);
    expect(variantMatrix["V3"]["V3"]).toBe(1);

    // Test cross-variant similarities
    // V1 vs V2: Different question order (0/10 matching) + Different option permutations for q1-q5 (0/5 matching) + Same option permutations for q6-q10 (5/5 matching) = 0.25
    expect(variantMatrix["V1"]["V2"]).toBe(0.25);

    // V1 vs V3: Same question order (10/10 matching) + Different option permutations for q1-q5 (0/5 matching) + Same option permutations for q6-q10 (5/5 matching) = 0.75
    expect(variantMatrix["V1"]["V3"]).toBe(0.75);

    // V2 vs V3: Different question order (0/10 matching) + Different option permutations for q1-q5 (0/5 matching) + Same option permutations for q6-q10 (5/5 matching) = 0.25
    expect(variantMatrix["V2"]["V3"]).toBe(0.25);

    // Test symmetry
    expect(variantMatrix["V2"]["V1"]).toBe(0.25);
    expect(variantMatrix["V3"]["V1"]).toBe(0.75);
    expect(variantMatrix["V3"]["V2"]).toBe(0.25);
  });

  it("should show variant similarity matrix", () => {
    const variantMatrix = calculateVariantSimilarityMatrix(mockExamVariants);

    // Debug log: Show the variant similarity matrix
    console.log("\n=== VARIANT SIMILARITY MATRIX ===");
    console.table(variantMatrix);

    expect(variantMatrix).toBeDefined();
  });
});
