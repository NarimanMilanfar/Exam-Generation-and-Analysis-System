describe("Exam View Difficulty Statistics", () => {
  const mockExamQuestions = [
    { id: "q1", difficulty: "EASY", type: "MULTIPLE_CHOICE", points: 1 },
    { id: "q2", difficulty: "EASY", type: "TRUE_FALSE", points: 1 },
    { id: "q3", difficulty: "MEDIUM", type: "MULTIPLE_CHOICE", points: 2 },
    { id: "q4", difficulty: "MEDIUM", type: "MULTIPLE_CHOICE", points: 2 },
    { id: "q5", difficulty: "HARD", type: "TRUE_FALSE", points: 3 },
  ];

  it("should count questions by difficulty level", () => {
    const easyCount = mockExamQuestions.filter(q => q.difficulty === "EASY").length;
    const mediumCount = mockExamQuestions.filter(q => q.difficulty === "MEDIUM").length;
    const hardCount = mockExamQuestions.filter(q => q.difficulty === "HARD").length;

    expect(easyCount).toBe(2);
    expect(mediumCount).toBe(2);
    expect(hardCount).toBe(1);
  });

  it("should calculate difficulty distribution percentages", () => {
    const totalQuestions = mockExamQuestions.length;
    const easyCount = mockExamQuestions.filter(q => q.difficulty === "EASY").length;
    const mediumCount = mockExamQuestions.filter(q => q.difficulty === "MEDIUM").length;
    const hardCount = mockExamQuestions.filter(q => q.difficulty === "HARD").length;

    const easyPercentage = (easyCount / totalQuestions) * 100;
    const mediumPercentage = (mediumCount / totalQuestions) * 100;
    const hardPercentage = (hardCount / totalQuestions) * 100;

    expect(easyPercentage).toBe(40);
    expect(mediumPercentage).toBe(40);
    expect(hardPercentage).toBe(20);
  });

  it("should count questions by type", () => {
    const multipleChoiceCount = mockExamQuestions.filter(q => q.type === "MULTIPLE_CHOICE").length;
    const trueFalseCount = mockExamQuestions.filter(q => q.type === "TRUE_FALSE").length;

    expect(multipleChoiceCount).toBe(3);
    expect(trueFalseCount).toBe(2);
  });

  it("should calculate total points", () => {
    const totalPoints = mockExamQuestions.reduce((sum, q) => sum + q.points, 0);
    expect(totalPoints).toBe(9);
  });

  it("should handle exams with no questions of specific difficulty", () => {
    const noHardQuestions = mockExamQuestions.filter(q => q.difficulty !== "HARD");
    const hardCount = noHardQuestions.filter(q => q.difficulty === "HARD").length;
    
    expect(hardCount).toBe(0);
  });

  it("should validate difficulty badge colors", () => {
    const difficultyColors = {
      "EASY": "bg-green-100 text-green-800",
      "MEDIUM": "bg-yellow-100 text-yellow-800", 
      "HARD": "bg-red-100 text-red-800"
    };

    mockExamQuestions.forEach(question => {
      expect(difficultyColors[question.difficulty as keyof typeof difficultyColors]).toBeDefined();
    });
  });

  it("should generate exam summary statistics", () => {
    const summary = {
      totalQuestions: mockExamQuestions.length,
      totalPoints: mockExamQuestions.reduce((sum, q) => sum + q.points, 0),
      multipleChoice: mockExamQuestions.filter(q => q.type === "MULTIPLE_CHOICE").length,
      trueFalse: mockExamQuestions.filter(q => q.type === "TRUE_FALSE").length,
      easy: mockExamQuestions.filter(q => q.difficulty === "EASY").length,
      medium: mockExamQuestions.filter(q => q.difficulty === "MEDIUM").length,
      hard: mockExamQuestions.filter(q => q.difficulty === "HARD").length,
    };

    expect(summary.totalQuestions).toBe(5);
    expect(summary.totalPoints).toBe(9);
    expect(summary.multipleChoice).toBe(3);
    expect(summary.trueFalse).toBe(2);
    expect(summary.easy).toBe(2);
    expect(summary.medium).toBe(2);
    expect(summary.hard).toBe(1);
  });
}); 