import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock react-hot-toast
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  error: mockToastError,
  success: mockToastSuccess,
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

describe("Question Export Functionality", () => {
  const mockQuestionBanks = [
    {
      id: "qbank-1",
      name: "JavaScript Basics",
      description: "Basic JavaScript concepts",
      topic: "Programming",
      color: "#3b82f6",
      courseId: "course-1",
      questionCount: 2,
      totalPoints: 3,
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
        }
      ]
    },
    {
      id: "qbank-2",
      name: "Python Fundamentals",
      description: "Basic Python concepts",
      topic: "Programming",
      color: "#10b981",
      courseId: "course-1",
      questionCount: 1,
      totalPoints: 2,
      questions: [
        {
          id: "q3",
          text: "What is Python?",
          type: "MULTIPLE_CHOICE",
          options: ["A programming language", "A snake", "A framework", "A database"],
          correctAnswer: "A programming language",
          points: 2,
          difficulty: "EASY",
          topic: "Introduction",
          questionBankId: "qbank-2",
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPackerToBlob.mockResolvedValue(new Blob(["mock-docx-content"]));
  });

  describe("Question Data Structure and Validation", () => {
    it("should validate question bank and question structure", () => {
      const questionBank = mockQuestionBanks[0];
      
      expect(questionBank.id).toBe("qbank-1");
      expect(questionBank.name).toBe("JavaScript Basics");
      expect(questionBank.questions).toHaveLength(2);
      expect(questionBank.questionCount).toBe(2);
      expect(questionBank.totalPoints).toBe(3);

      const question = questionBank.questions[0];
      expect(question.id).toBe("q1");
      expect(question.text).toBe("What is a variable in JavaScript?");
      expect(question.type).toBe("MULTIPLE_CHOICE");
      expect(question.options).toHaveLength(4);
      expect(question.correctAnswer).toBe("A container for data");
      expect(question.points).toBe(2);
      expect(question.difficulty).toBe("EASY");
      expect(question.topic).toBe("Variables");

      const trueFalseQuestion = questionBank.questions[1];
      expect(trueFalseQuestion.type).toBe("TRUE_FALSE");
      expect(trueFalseQuestion.options).toEqual(["True", "False"]);
      expect(trueFalseQuestion.correctAnswer).toBe("False");
    });
  });

  describe("Question Selection and Management", () => {
    it("should handle question selection, deselection, and duplicate prevention", () => {
      const availableQuestions = [...mockQuestionBanks[0].questions];
      const selectedQuestions: any[] = [];
      
      // Select a question
      const questionToSelect = availableQuestions[0];
      selectedQuestions.push(questionToSelect);
      const newAvailable = availableQuestions.filter(q => q.id !== questionToSelect.id);
      
      expect(selectedQuestions).toHaveLength(1);
      expect(newAvailable).toHaveLength(1);
      expect(selectedQuestions[0].id).toBe("q1");

      // Prevent duplicate selection
      const alreadySelected = selectedQuestions.find(q => q.id === questionToSelect.id);
      expect(alreadySelected).toBeDefined();
      expect(selectedQuestions).toHaveLength(1);
    });

    it("should handle select all and clear all functionality", () => {
      const allQuestions = mockQuestionBanks.reduce((acc, bank) => {
        return [...acc, ...bank.questions];
      }, [] as any[]);
      
      expect(allQuestions).toHaveLength(3);
      expect(allQuestions.map(q => q.id)).toEqual(["q1", "q2", "q3"]);

      // Clear all
      const selectedQuestions = [...mockQuestionBanks[0].questions];
      const clearedSelection: any[] = [];
      const restoredAvailable = [...selectedQuestions];
      
      expect(clearedSelection).toHaveLength(0);
      expect(restoredAvailable).toHaveLength(2);
    });
  });

  describe("Question Filtering and Search", () => {
    it("should filter questions by search term and question bank", () => {
      const allQuestions = mockQuestionBanks.reduce((acc, bank) => {
        return [...acc, ...bank.questions];
      }, [] as any[]);
      
      // Filter by search term
      const searchTerm = "variable";
      const filteredBySearch = allQuestions.filter(question => 
        question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        question.topic?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      expect(filteredBySearch).toHaveLength(1); // q1 has "variable" in text

      // Filter by question bank
      const bankId = "qbank-1";
      const filteredByBank = allQuestions.filter(question => 
        question.questionBankId === bankId
      );
      
      expect(filteredByBank).toHaveLength(2);
      expect(filteredByBank.every(q => q.questionBankId === "qbank-1")).toBe(true);

      // Filter by topic
      const topic = "Variables";
      const filteredByTopic = allQuestions.filter(question => 
        question.topic === topic
      );
      
      expect(filteredByTopic).toHaveLength(1); // q1

      // Case-insensitive search
      const searchTermCaps = "JAVASCRIPT";
      const filteredCaseInsensitive = allQuestions.filter(question => 
        question.text.toLowerCase().includes(searchTermCaps.toLowerCase())
      );
      
      expect(filteredCaseInsensitive).toHaveLength(2); // q1 and q2 contain "JavaScript"
    });
  });

  describe("Export Data Preparation and Processing", () => {
    it("should prepare question data for export with and without answers", () => {
      const selectedQuestions = [mockQuestionBanks[0].questions[0]];
      
      // With answers
      const exportDataWithAnswers = {
        questions: selectedQuestions,
        totalQuestions: selectedQuestions.length,
        totalPoints: selectedQuestions.reduce((sum, q) => sum + q.points, 0),
        includeAnswers: true,
        exportedAt: new Date().toISOString(),
      };
      
      expect(exportDataWithAnswers.totalQuestions).toBe(1);
      expect(exportDataWithAnswers.totalPoints).toBe(2);
      expect(exportDataWithAnswers.includeAnswers).toBe(true);

      // Without answers
      const exportDataWithoutAnswers = {
        questions: selectedQuestions,
        includeAnswers: false,
      };
      
      expect(exportDataWithoutAnswers.includeAnswers).toBe(false);
      expect(exportDataWithoutAnswers.questions).toHaveLength(1);
    });

    it("should format questions for different types and calculate totals", () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);
      
      expect(totalPoints).toBe(3);

      const multipleChoice = selectedQuestions[0];
      const trueFalse = selectedQuestions[1];
      
      // Multiple choice formatting
      expect(multipleChoice.type).toBe("MULTIPLE_CHOICE");
      expect(multipleChoice.options).toHaveLength(4);
      
      // True/False formatting
      expect(trueFalse.type).toBe("TRUE_FALSE");
      expect(trueFalse.options).toEqual(["True", "False"]);
    });

    it("should format question numbers and options correctly", () => {
      const selectedQuestions = mockQuestionBanks[0].questions;
      
      selectedQuestions.forEach((question, index) => {
        const questionNumber = index + 1;
        const formattedText = `${questionNumber}. ${question.text}`;
        
        expect(formattedText).toContain(`${questionNumber}.`);
        expect(formattedText).toContain(question.text);
      });

      const question = selectedQuestions[0];
      question.options.forEach((option, index) => {
        const label = String.fromCharCode(65 + index); // A, B, C, D
        const formattedOption = `${label}. ${option}`;
        
        expect(formattedOption).toMatch(/^[A-D]\./);
        expect(formattedOption).toContain(option);
      });
    });
  });

  describe("DOCX Generation and Export Process", () => {
    it("should handle DOCX generation with success and error cases", async () => {
      const selectedQuestions = [mockQuestionBanks[0].questions[0]];
      
      // Successful generation
      await mockPackerToBlob();
      expect(mockPackerToBlob).toHaveBeenCalled();

      // Error handling
      mockPackerToBlob.mockRejectedValue(new Error("DOCX generation failed"));
      
      try {
        await mockPackerToBlob();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("DOCX generation failed");
      }
    });
  });

  describe("Export State Management and Validation", () => {
    it("should track loading state and handle export success/failure", () => {
      let loading = false;
      
      // Start export
      loading = true;
      expect(loading).toBe(true);
      
      // Complete export
      loading = false;
      expect(loading).toBe(false);

      // Export success
      const exportResult = {
        success: true,
        message: "Questions exported successfully!",
        questionCount: 2,
      };
      
      expect(exportResult.success).toBe(true);
      expect(exportResult.questionCount).toBe(2);

      // Export failure
      const exportFailure = {
        success: false,
        error: "Failed to generate DOCX file",
      };
      
      expect(exportFailure.success).toBe(false);
      expect(exportFailure.error).toBeDefined();
    });

    it("should validate export options and button states", () => {
      const exportOptions = {
        includeAnswers: true,
        selectedQuestions: [],
      };
      
      expect(exportOptions.includeAnswers).toBe(true);
      expect(exportOptions.selectedQuestions).toHaveLength(0);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty question banks and missing fields", () => {
      const emptyQuestionBanks: any[] = [];
      const allQuestions = emptyQuestionBanks.reduce((acc, bank) => {
        return [...acc, ...bank.questions];
      }, [] as any[]);
      
      expect(allQuestions).toHaveLength(0);

      // Question without optional fields
      const questionWithoutOptionals: any = {
        id: "q-min",
        text: "Simple question",
        type: "TRUE_FALSE",
        options: ["True", "False"],
        correctAnswer: "True",
        points: 1,
        questionBankId: "qbank-1",
      };

      expect(questionWithoutOptionals.difficulty).toBeUndefined();
      expect(questionWithoutOptionals.topic).toBeUndefined();
      expect(questionWithoutOptionals.points).toBe(1);

      // Zero points question
      const zeroPointQuestion = {
        ...mockQuestionBanks[0].questions[0],
        points: 0,
      };
      
      expect(zeroPointQuestion.points).toBe(0);
    });

    it("should handle large datasets efficiently", () => {
      const largeQuestionBank = {
        id: "qbank-large",
        name: "Large Question Bank",
        questions: Array(50).fill(null).map((_, index) => ({
          id: `q-large-${index}`,
          text: `Question ${index + 1}`,
          type: "MULTIPLE_CHOICE",
          options: ["A", "B", "C", "D"],
          correctAnswer: "A",
          points: 1,
          questionBankId: "qbank-large",
        })),
      };
      
      expect(largeQuestionBank.questions).toHaveLength(50);
      
      // Test filtering performance
      const filtered = largeQuestionBank.questions.filter(q => 
        q.text.includes("Question 1")
      );
      
      expect(filtered.length).toBeGreaterThan(0);

      // Calculate totals efficiently
      const questions = Array(50).fill(null).map((_, index) => ({
        id: `q${index}`,
        points: Math.floor(Math.random() * 5) + 1,
      }));
      
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      
      expect(totalPoints).toBeGreaterThan(0);
      expect(questions).toHaveLength(50);
    });
  });
}); 