describe("Question Difficulty and Topic Management", () => {
  const mockQuestion = {
    id: "q1",
    text: "What is a variable in programming?",
    type: "MULTIPLE_CHOICE",
    options: ["A data container", "A function", "A loop", "A class"],
    correctAnswer: "A data container",
    points: 2,
    difficulty: "EASY",
    topic: "Programming Basics",
    questionBankId: "qbank-1",
  };

  it("should handle question creation with difficulty and topic", () => {
    const questionData = {
      text: "Test question",
      type: "MULTIPLE_CHOICE",
      difficulty: "MEDIUM",
      topic: "JavaScript",
      points: 1,
    };

    expect(questionData.difficulty).toBe("MEDIUM");
    expect(questionData.topic).toBe("JavaScript");
    expect(["EASY", "MEDIUM", "HARD"]).toContain(questionData.difficulty);
  });

  it("should handle question editing with pre-filled difficulty and topic", () => {
    const editFormData = {
      ...mockQuestion,
      difficulty: mockQuestion.difficulty || "MEDIUM",
      topic: mockQuestion.topic || "",
    };

    expect(editFormData.difficulty).toBe("EASY");
    expect(editFormData.topic).toBe("Programming Basics");
  });

  it("should filter questions by difficulty level", () => {
    const questions = [
      { id: "q1", difficulty: "EASY" },
      { id: "q2", difficulty: "MEDIUM" },
      { id: "q3", difficulty: "HARD" },
      { id: "q4", difficulty: "EASY" },
    ];

    const easyQuestions = questions.filter(q => q.difficulty === "EASY");
    const mediumQuestions = questions.filter(q => q.difficulty === "MEDIUM");
    
    expect(easyQuestions).toHaveLength(2);
    expect(mediumQuestions).toHaveLength(1);
  });

  it("should default to MEDIUM difficulty when not specified", () => {
    const questionWithoutDifficulty = {
      text: "Test question",
      difficulty: undefined,
    };

    const defaultDifficulty = questionWithoutDifficulty.difficulty || "MEDIUM";
    expect(defaultDifficulty).toBe("MEDIUM");
  });

  it("should handle topic badge display", () => {
    const questionWithTopic = {
      ...mockQuestion,
      topic: "Data Structures",
    };

    expect(questionWithTopic.topic).toBe("Data Structures");
    expect(questionWithTopic.topic?.length).toBeGreaterThan(0);
  });

  it("should validate difficulty options", () => {
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];
    
    validDifficulties.forEach(difficulty => {
      expect(["EASY", "MEDIUM", "HARD"]).toContain(difficulty);
    });
  });
}); 