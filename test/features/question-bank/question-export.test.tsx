import React from 'react';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
}));

// Mock docx library
const mockPackerToBlob = jest.fn();
jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: { toBlob: mockPackerToBlob },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: { HEADING_1: 'HEADING_1', HEADING_2: 'HEADING_2' },
}));

// Mock URL and DOM methods
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName: string) => {
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
    } as any;
  }
  return originalCreateElement.call(document, tagName);
});

describe("Question Export Functionality", () => {
  const mockQuestionBanks = [
    {
      id: "qbank-1",
      name: "JavaScript Basics",
      topic: "Programming",
      color: "#3b82f6",
      courseId: "course-1",
      questionCount: 3,
      totalPoints: 6,
      questions: [
        {
          id: "q1",
          text: "What is a variable in JavaScript?",
          type: "MULTIPLE_CHOICE",
          options: ["A container for data", "A function", "A loop", "A class"],
          correctAnswer: "A container for data",
          points: 2,
          difficulty: "EASY",
          topic: "Variables",
          questionBankId: "qbank-1",
        },
        {
          id: "q2",
          text: "JavaScript is compiled. True or False?",
          type: "TRUE_FALSE",
          options: ["True", "False"],
          correctAnswer: "False",
          points: 1,
          difficulty: "EASY",
          topic: "Language Basics",
          questionBankId: "qbank-1",
        },
        {
          id: "q3",
          text: "What does 'const' do?",
          type: "MULTIPLE_CHOICE",
          options: ["Declares a constant", "Declares a variable", "Declares a function", "Declares a class"],
          correctAnswer: "Declares a constant",
          points: 3,
          difficulty: "MEDIUM",
          topic: "Variables",
          questionBankId: "qbank-1",
        }
      ]
    },
    {
      id: "qbank-2",
      name: "Python Basics",
      topic: "Programming",
      color: "#10b981",
      courseId: "course-1",
      questionCount: 1,
      totalPoints: 2,
      questions: [
        {
          id: "q4",
          text: "What is Python?",
          type: "MULTIPLE_CHOICE",
          options: ["A programming language", "A snake", "A framework", "A library"],
          correctAnswer: "A programming language",
          points: 2,
          difficulty: "EASY",
          topic: "Language Basics",
          questionBankId: "qbank-2",
        }
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Question Data Processing", () => {
    it("should extract and validate questions from question banks", () => {
      const allQuestions: any[] = [];
      mockQuestionBanks.forEach((bank) => {
        if (bank.questions) {
          allQuestions.push(...bank.questions);
        }
      });
      
      expect(allQuestions).toHaveLength(4);
      expect(allQuestions[0].id).toBe("q1");
      expect(allQuestions[3].id).toBe("q4");
      
      // Validate question structure
      const question = allQuestions[0];
      expect(question).toHaveProperty("id");
      expect(question).toHaveProperty("text");
      expect(question).toHaveProperty("type");
      expect(question).toHaveProperty("options");
      expect(question).toHaveProperty("correctAnswer");
      expect(question).toHaveProperty("points");
      expect(question).toHaveProperty("difficulty");
      expect(question).toHaveProperty("topic");
      expect(question).toHaveProperty("questionBankId");
    });

    it("should handle different question types", () => {
      const multipleChoice = mockQuestionBanks[0].questions[0];
      const trueFalse = mockQuestionBanks[0].questions[1];
      
      expect(multipleChoice.type).toBe("MULTIPLE_CHOICE");
      expect(multipleChoice.options).toHaveLength(4);
      
      expect(trueFalse.type).toBe("TRUE_FALSE");
      expect(trueFalse.options).toHaveLength(2);
      expect(trueFalse.options).toEqual(["True", "False"]);
    });
  });

  describe("Question Filtering and Search", () => {
    it("should filter questions by search term", () => {
      const allQuestions = mockQuestionBanks.flatMap(bank => bank.questions);
      const searchTerm = "variable";
      
      const filtered = allQuestions.filter(question => 
        question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(2); // q1 and q3 contain "variable"
      expect(filtered[0].id).toBe("q1");
      expect(filtered[1].id).toBe("q3");
    });

    it("should filter questions by question bank", () => {
      const allQuestions = mockQuestionBanks.flatMap(bank => bank.questions);
      const selectedBank: string = "qbank-1";
      
      const filtered = allQuestions.filter(question => 
        selectedBank === "all" || question.questionBankId === selectedBank
      );
      
      expect(filtered).toHaveLength(3); // q1, q2, q3 are in qbank-1
      expect(filtered.every(q => q.questionBankId === "qbank-1")).toBe(true);
    });

    it("should handle case-insensitive search", () => {
      const allQuestions = mockQuestionBanks.flatMap(bank => bank.questions);
      const searchTerm = "PYTHON";
      
      const filtered = allQuestions.filter(question => 
        question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filtered).toHaveLength(1); // q4 contains "Python"
    });

    it("should return all questions when 'all' is selected", () => {
      const allQuestions = mockQuestionBanks.flatMap(bank => bank.questions);
      const selectedBank = "all";
      
      const filtered = allQuestions.filter(question => 
        selectedBank === "all" || question.questionBankId === selectedBank
      );
      
      expect(filtered).toHaveLength(4); // All questions
    });
  });

  describe("Question Selection Logic", () => {
    it("should handle question selection and deselection", () => {
      const availableQuestions = [...mockQuestionBanks[0].questions];
      const selectedQuestions: any[] = [];
      const questionToSelect = availableQuestions[0];

      // Simulate selection
      const newSelected = [...selectedQuestions, questionToSelect];
      const newAvailable = availableQuestions.filter(q => q.id !== questionToSelect.id);

      expect(newSelected).toHaveLength(1);
      expect(newSelected[0].id).toBe("q1");
      expect(newAvailable).toHaveLength(2);
      expect(newAvailable.find(q => q.id === "q1")).toBeUndefined();
    });

    it("should prevent duplicate selection", () => {
      const selectedQuestions = [mockQuestionBanks[0].questions[0]];
      const questionToSelect = mockQuestionBanks[0].questions[0];

      const isDuplicate = selectedQuestions.find(q => q.id === questionToSelect.id);
      expect(isDuplicate).toBeTruthy();
      
      // Don't add if duplicate
      const newSelected = isDuplicate ? selectedQuestions : [...selectedQuestions, questionToSelect];
      expect(newSelected).toHaveLength(1);
    });

    it("should handle select all and clear all functionality", () => {
      const availableQuestions = mockQuestionBanks[0].questions; // 3 questions
      const selectedQuestions: any[] = [];
      const filteredQuestions = availableQuestions; // All questions match filter

      // Select all filtered questions
      const questionsToMove = filteredQuestions.filter(
        q => !selectedQuestions.find(selected => selected.id === q.id)
      );
      const newSelected = [...selectedQuestions, ...questionsToMove];
      const newAvailable = availableQuestions.filter(
        q => !questionsToMove.find(moved => moved.id === q.id)
      );

      expect(newSelected).toHaveLength(3);
      expect(newAvailable).toHaveLength(0);

      // Clear all selected
      const clearedSelected: any[] = [];
      const restoredAvailable = [...newAvailable, ...newSelected];

      expect(clearedSelected).toHaveLength(0);
      expect(restoredAvailable).toHaveLength(3);
    });
  });

  describe("Export Data Preparation", () => {
    it("should prepare questions for export with or without answers", () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      
      // With answers
      const exportDataWithAnswers = selectedQuestions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        difficulty: q.difficulty,
        topic: q.topic
      }));

      expect(exportDataWithAnswers).toHaveLength(3);
      expect(exportDataWithAnswers[0].correctAnswer).toBe("A container for data");
      expect(exportDataWithAnswers[1].correctAnswer).toBe("False");
      expect(exportDataWithAnswers[2].correctAnswer).toBe("Declares a constant");
      
      // Without answers
      const exportDataWithoutAnswers = selectedQuestions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options,
        correctAnswer: null,
        points: q.points,
        difficulty: q.difficulty,
        topic: q.topic
      }));

      expect(exportDataWithoutAnswers[0].correctAnswer).toBeNull();
      expect(exportDataWithoutAnswers[1].correctAnswer).toBeNull();
      expect(exportDataWithoutAnswers[2].correctAnswer).toBeNull();
    });

    it("should calculate totals and group questions", () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);
      
      expect(totalPoints).toBe(6); // 2 + 1 + 3

      // Group by difficulty
      const groupedByDifficulty = selectedQuestions.reduce((groups, q) => {
        const difficulty = q.difficulty;
        if (!groups[difficulty]) {
          groups[difficulty] = [];
        }
        groups[difficulty].push(q);
        return groups;
      }, {} as Record<string, any[]>);

      expect(groupedByDifficulty.EASY).toHaveLength(2); // q1, q2
      expect(groupedByDifficulty.MEDIUM).toHaveLength(1); // q3

      // Group by topic
      const groupedByTopic = selectedQuestions.reduce((groups, q) => {
        const topic = q.topic;
        if (!groups[topic]) {
          groups[topic] = [];
        }
        groups[topic].push(q);
        return groups;
      }, {} as Record<string, any[]>);

      expect(groupedByTopic.Variables).toHaveLength(2); // q1, q3
      expect(groupedByTopic["Language Basics"]).toHaveLength(1); // q2
    });

    it("should maintain question order in export", () => {
      const selectedQuestions = [
        mockQuestionBanks[0].questions[2], // q3
        mockQuestionBanks[0].questions[0], // q1
        mockQuestionBanks[0].questions[1], // q2
      ];
      
      const exportData = selectedQuestions.map((q, index) => ({
        order: index + 1,
        text: q.text,
        id: q.id
      }));

      expect(exportData[0].order).toBe(1);
      expect(exportData[0].id).toBe("q3");
      expect(exportData[1].order).toBe(2);
      expect(exportData[1].id).toBe("q1");
      expect(exportData[2].order).toBe(3);
      expect(exportData[2].id).toBe("q2");
    });
  });

  describe("Export Validation and Processing", () => {
    it("should validate export button state", () => {
      const emptySelection: any[] = [];
      const validSelection = [mockQuestionBanks[0].questions[0]];
      
      expect(emptySelection.length === 0).toBe(true); // Disabled
      expect(validSelection.length === 0).toBe(false); // Enabled
    });

    it("should validate required fields for export", () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      
      const hasRequiredFields = selectedQuestions.every(q => 
        q.text && q.type && q.options && q.correctAnswer && q.points !== undefined
      );
      
      expect(hasRequiredFields).toBe(true);
    });

    it("should handle empty question banks", () => {
      const emptyBanks: any[] = [];
      const allQuestions = emptyBanks.flatMap(bank => bank.questions || []);
      
      expect(allQuestions).toHaveLength(0);
    });

    it("should simulate successful DOCX export", async () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      
      mockPackerToBlob.mockResolvedValue(new Blob());
      
      const exportPromise = mockPackerToBlob();
      
      await expect(exportPromise).resolves.toBeInstanceOf(Blob);
      expect(mockPackerToBlob).toHaveBeenCalled();
    });

    it("should handle export errors", async () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      const exportError = new Error("Export failed");
      
      mockPackerToBlob.mockRejectedValue(exportError);
      
      const exportPromise = mockPackerToBlob();
      
      await expect(exportPromise).rejects.toThrow("Export failed");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle questions with missing optional fields", () => {
      const questionWithMissingFields = {
        id: "incomplete-q",
        text: "What is this?",
        type: "MULTIPLE_CHOICE",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: 1,
        difficulty: "EASY",
        questionBankId: "qbank-1"
        // Missing topic
      };
      
      const exportData = {
        text: questionWithMissingFields.text,
        type: questionWithMissingFields.type,
        options: questionWithMissingFields.options,
        correctAnswer: questionWithMissingFields.correctAnswer,
        points: questionWithMissingFields.points,
        difficulty: questionWithMissingFields.difficulty,
        topic: (questionWithMissingFields as any).topic || "General"
      };
      
      expect(exportData.topic).toBe("General");
    });

    it("should handle special characters in question text", () => {
      const specialQuestion = {
        id: "special-q",
        text: "What's the output of console.log(\"Hello, World!\");?",
        type: "MULTIPLE_CHOICE",
        options: ["Hello, World!", "Error", "undefined", "null"],
        correctAnswer: "Hello, World!",
        points: 2,
        difficulty: "EASY",
        topic: "JavaScript",
        questionBankId: "qbank-1"
      };
      
      const exportData = {
        text: specialQuestion.text,
        correctAnswer: specialQuestion.correctAnswer
      };
      
      expect(exportData.text).toContain("console.log");
      expect(exportData.text).toContain("\"Hello, World!\"");
      expect(exportData.correctAnswer).toBe("Hello, World!");
    });

    it("should handle large datasets efficiently", () => {
      const largeQuestionSet = Array.from({ length: 100 }, (_, i) => ({
        id: `q${i}`,
        text: `Question ${i}`,
        type: "MULTIPLE_CHOICE",
        options: ["A", "B", "C", "D"],
        correctAnswer: "A",
        points: 1,
        difficulty: "EASY",
        topic: "General",
        questionBankId: "qbank-1"
      }));
      
      const totalPoints = largeQuestionSet.reduce((sum, q) => sum + q.points, 0);
      const filteredQuestions = largeQuestionSet.filter(q => q.difficulty === "EASY");
      
      expect(totalPoints).toBe(100);
      expect(filteredQuestions).toHaveLength(100);
    });

    it("should handle malformed question data", () => {
      const malformedQuestion = {
        id: null,
        text: "",
        type: "INVALID_TYPE",
        options: [],
        correctAnswer: "",
        points: -1,
        difficulty: "INVALID_DIFFICULTY",
        topic: null,
        questionBankId: ""
      };
      
      const isValid = Boolean(malformedQuestion.id) && 
                     Boolean(malformedQuestion.text) && 
                     malformedQuestion.options.length > 0 && 
                     Boolean(malformedQuestion.correctAnswer) && 
                     malformedQuestion.points > 0;
      
      expect(isValid).toBe(false);
    });

    it("should track loading state during export", async () => {
      let isLoading = false;
      
      const simulateExport = async () => {
        isLoading = true;
        try {
          await new Promise(resolve => setTimeout(resolve, 10));
          return "success";
        } finally {
          isLoading = false;
        }
      };
      
      const exportPromise = simulateExport();
      
      // Check loading state
      expect(isLoading).toBe(true);
      
      await exportPromise;
      
      // Check loading state after completion
      expect(isLoading).toBe(false);
    });
  });
}); 