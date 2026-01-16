describe("Exam Playground Difficulty Filtering", () => {
  const mockQuestions = [
    {
      id: "q1",
      text: "Easy question",
      difficulty: "EASY",
      topic: "Basics",
      type: "MULTIPLE_CHOICE",
      points: 1,
    },
    {
      id: "q2",
      text: "Medium question",
      difficulty: "MEDIUM",
      topic: "Intermediate",
      type: "TRUE_FALSE",
      points: 2,
    },
    {
      id: "q3",
      text: "Hard question",
      difficulty: "HARD",
      topic: "Advanced",
      type: "MULTIPLE_CHOICE",
      points: 3,
    },
    {
      id: "q4",
      text: "Another easy question",
      difficulty: "EASY",
      topic: "Basics",
      type: "TRUE_FALSE",
      points: 1,
    },
  ];

  it("should filter questions by EASY difficulty", () => {
    const filteredQuestions = mockQuestions.filter(
      question => question.difficulty === "EASY"
    );

    expect(filteredQuestions).toHaveLength(2);
    expect(filteredQuestions.every(q => q.difficulty === "EASY")).toBe(true);
  });

  it("should filter questions by MEDIUM difficulty", () => {
    const filteredQuestions = mockQuestions.filter(
      question => question.difficulty === "MEDIUM"
    );

    expect(filteredQuestions).toHaveLength(1);
    expect(filteredQuestions[0].id).toBe("q2");
  });

  it("should filter questions by HARD difficulty", () => {
    const filteredQuestions = mockQuestions.filter(
      question => question.difficulty === "HARD"
    );

    expect(filteredQuestions).toHaveLength(1);
    expect(filteredQuestions[0].id).toBe("q3");
  });

  it("should combine search term and difficulty filter", () => {
    const searchTerm = "easy";
    
    const filteredQuestions = mockQuestions.filter(question => {
      const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = question.difficulty === "EASY";
      return matchesSearch && matchesDifficulty;
    });

    expect(filteredQuestions).toHaveLength(2);
    expect(filteredQuestions.every(q => q.difficulty === "EASY")).toBe(true);
  });

  it("should filter by type and difficulty together", () => {
    const filteredQuestions = mockQuestions.filter(question => {
      const matchesType = question.type === "MULTIPLE_CHOICE";
      const matchesDifficulty = question.difficulty === "EASY";
      return matchesType && matchesDifficulty;
    });

    expect(filteredQuestions).toHaveLength(1);
    expect(filteredQuestions[0].id).toBe("q1");
  });

  it("should handle empty filter results", () => {
    const filteredQuestions = mockQuestions.filter(
      question => question.difficulty === "EXPERT"
    );

    expect(filteredQuestions).toHaveLength(0);
  });

  it("should validate difficulty filter options", () => {
    const validDifficulties = ["EASY", "MEDIUM", "HARD"];
    const questionDifficulties = mockQuestions.map(q => q.difficulty);
    
    questionDifficulties.forEach(difficulty => {
      expect(validDifficulties).toContain(difficulty);
    });
  });
}); 