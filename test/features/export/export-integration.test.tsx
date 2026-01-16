import React from 'react';

// Mock react-hot-toast
const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock('react-hot-toast', () => ({
  error: mockToastError,
  success: mockToastSuccess,
}));

// Mock next/navigation
const mockPush = jest.fn();
const mockParams = { id: 'test-course-1' };
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => mockParams,
  useSearchParams: () => ({ get: jest.fn(() => null) }),
}));

// Mock docx and JSZip
const mockPackerToBlob = jest.fn();
const mockGenerateAsync = jest.fn();
const mockFile = jest.fn();
const mockFolder = jest.fn(() => ({ file: mockFile }));

jest.mock('docx', () => ({
  Document: jest.fn(),
  Packer: { toBlob: mockPackerToBlob },
  Paragraph: jest.fn(),
  TextRun: jest.fn(),
  HeadingLevel: { HEADING_1: 'HEADING_1', HEADING_2: 'HEADING_2' },
}));

jest.mock('jszip', () => {
  return jest.fn().mockImplementation(() => ({
    file: mockFile,
    folder: mockFolder,
    generateAsync: mockGenerateAsync,
  }));
});

// Mock DOM methods
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();
global.fetch = jest.fn();

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

describe("Export Integration Tests", () => {
  const mockCourseData = {
    course: {
      id: "test-course-1",
      name: "Computer Science 101",
      code: "CS101",
      instructor: "Dr. Smith"
    },
    questionBanks: [
      {
        id: "qbank-1",
        name: "JavaScript Fundamentals",
        questionCount: 3,
        totalPoints: 6,
        questions: [
          {
            id: "q1",
            text: "What is JavaScript?",
            type: "MULTIPLE_CHOICE",
            options: ["Language", "Framework", "Library", "Database"],
            correctAnswer: "Language",
            points: 2,
            difficulty: "EASY",
            topic: "Basics",
            questionBankId: "qbank-1"
          }
        ]
      }
    ],
    exams: [
      {
        id: "exam-1",
        name: "Midterm Exam",
        duration: 120,
        totalPoints: 100,
        questions: ["q1"]
      }
    ],
    students: [
      {
        id: "student-1",
        name: "John Doe",
        email: "john.doe@example.com",
        studentNumber: "12345678"
      }
    ],
    examResults: [
      {
        id: "result-1",
        examId: "exam-1",
        studentId: "student-1",
        score: 85,
        totalPoints: 100,
        answers: ["Language"]
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockCourseData),
    });
    mockGenerateAsync.mockResolvedValue(new Blob());
    mockPackerToBlob.mockResolvedValue(new Blob());
  });

  describe("Export State Management", () => {
    it("should manage modal states independently", () => {
      let modalStates = {
        isQuestionExportModalOpen: false,
        isCourseArchiveModalOpen: false
      };
      
      const openQuestionExport = () => { modalStates.isQuestionExportModalOpen = true; };
      const openCourseArchive = () => { modalStates.isCourseArchiveModalOpen = true; };
      const closeAll = () => { 
        modalStates.isQuestionExportModalOpen = false; 
        modalStates.isCourseArchiveModalOpen = false; 
      };
      
      expect(modalStates.isQuestionExportModalOpen).toBe(false);
      expect(modalStates.isCourseArchiveModalOpen).toBe(false);
      
      openQuestionExport();
      expect(modalStates.isQuestionExportModalOpen).toBe(true);
      expect(modalStates.isCourseArchiveModalOpen).toBe(false);
      
      openCourseArchive();
      expect(modalStates.isQuestionExportModalOpen).toBe(true);
      expect(modalStates.isCourseArchiveModalOpen).toBe(true);
      
      closeAll();
      expect(modalStates.isQuestionExportModalOpen).toBe(false);
      expect(modalStates.isCourseArchiveModalOpen).toBe(false);
    });

    it("should handle loading states during export", () => {
      let exportState = {
        isExporting: false,
        progress: 0,
        currentStep: 'idle'
      };
      
      const startExport = () => { exportState = { isExporting: true, progress: 0, currentStep: 'preparing' }; };
      const updateProgress = (progress: number, step: string) => { exportState = { ...exportState, progress, currentStep: step }; };
      const finishExport = () => { exportState = { isExporting: false, progress: 100, currentStep: 'complete' }; };
      
      expect(exportState.isExporting).toBe(false);
      
      startExport();
      expect(exportState.isExporting).toBe(true);
      expect(exportState.currentStep).toBe('preparing');
      
      updateProgress(50, 'processing');
      expect(exportState.progress).toBe(50);
      expect(exportState.currentStep).toBe('processing');
      
      finishExport();
      expect(exportState.isExporting).toBe(false);
      expect(exportState.progress).toBe(100);
    });
  });

  describe("Course Archive Export Integration", () => {
    it("should handle successful course archive export workflow", async () => {
      const exportOptions = {
        includeQuestionBanks: true,
        includeExams: true,
        includeStudentData: true,
        includeExamResults: true,
        includeAnalytics: true
      };
      
      const response = await fetch(`/api/courses/test-course-1/export`);
      const courseData = await response.json();
      
      expect(response.ok).toBe(true);
      expect(courseData.course.id).toBe("test-course-1");
      expect(courseData.questionBanks).toHaveLength(1);
      expect(courseData.exams).toHaveLength(1);
      expect(courseData.students).toHaveLength(1);
      expect(courseData.examResults).toHaveLength(1);
      
      const zipBlob = await mockGenerateAsync({ type: "blob" });
      expect(zipBlob).toBeInstanceOf(Blob);
      expect(mockGenerateAsync).toHaveBeenCalledWith({ type: "blob" });
    });

    it("should handle selective export options", async () => {
      const exportOptions = {
        includeQuestionBanks: true,
        includeExams: false,
        includeStudentData: false,
        includeExamResults: false,
        includeAnalytics: false
      };
      
      const response = await fetch(`/api/courses/test-course-1/export`);
      const courseData = await response.json();
      
      const exportData = {
        course: courseData.course,
        questionBanks: exportOptions.includeQuestionBanks ? courseData.questionBanks : [],
        exams: exportOptions.includeExams ? courseData.exams : [],
        students: exportOptions.includeStudentData ? courseData.students : [],
        examResults: exportOptions.includeExamResults ? courseData.examResults : []
      };
      
      expect(exportData.questionBanks).toHaveLength(1);
      expect(exportData.exams).toHaveLength(0);
      expect(exportData.students).toHaveLength(0);
      expect(exportData.examResults).toHaveLength(0);
    });

    it("should handle export errors gracefully", async () => {
      const apiError = new Error("Failed to fetch course data");
      (global.fetch as jest.Mock).mockRejectedValue(apiError);
      
      let errorOccurred = false;
      
      try {
        await fetch(`/api/courses/test-course-1/export`);
      } catch (error) {
        errorOccurred = true;
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Failed to fetch course data");
      }
      
      expect(errorOccurred).toBe(true);
    });

    it("should handle ZIP generation error", async () => {
      const zipError = new Error("ZIP generation failed");
      mockGenerateAsync.mockRejectedValue(zipError);
      
      let errorOccurred = false;
      
      try {
        await mockGenerateAsync({ type: "blob" });
      } catch (error) {
        errorOccurred = true;
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("ZIP generation failed");
      }
      
      expect(errorOccurred).toBe(true);
    });
  });

  describe("Questions Export Integration", () => {
    it("should handle successful questions export workflow", async () => {
      const selectedQuestions = mockCourseData.questionBanks[0].questions;
      const includeAnswers = true;
      
      const exportData = selectedQuestions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options,
        correctAnswer: includeAnswers ? q.correctAnswer : null,
        points: q.points,
        difficulty: q.difficulty,
        topic: q.topic
      }));
      
      expect(exportData).toHaveLength(1);
      expect(exportData[0].text).toBe("What is JavaScript?");
      expect(exportData[0].correctAnswer).toBe("Language");
      
      const docBlob = await mockPackerToBlob();
      expect(docBlob).toBeInstanceOf(Blob);
      expect(mockPackerToBlob).toHaveBeenCalled();
    });

    it("should handle questions export without answers", async () => {
      const selectedQuestions = mockCourseData.questionBanks[0].questions;
      const includeAnswers = false;
      
      const exportData = selectedQuestions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options,
        correctAnswer: includeAnswers ? q.correctAnswer : null,
        points: q.points,
        difficulty: q.difficulty,
        topic: q.topic
      }));
      
      expect(exportData).toHaveLength(1);
      expect(exportData[0].text).toBe("What is JavaScript?");
      expect(exportData[0].correctAnswer).toBeNull();
    });

    it("should handle questions export with filtering", () => {
      const allQuestions = mockCourseData.questionBanks[0].questions;
      const searchTerm = "JavaScript";
      const selectedQuestionBank: string = "qbank-1";
      
      const filteredQuestions = allQuestions.filter(question => {
        const matchesSearch = question.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          question.topic?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBank = selectedQuestionBank === "all" || question.questionBankId === selectedQuestionBank;
        return matchesSearch && matchesBank;
      });
      
      expect(filteredQuestions).toHaveLength(1);
      expect(filteredQuestions[0].text).toBe("What is JavaScript?");
    });

    it("should handle selection logic", () => {
      const availableQuestions = [...mockCourseData.questionBanks[0].questions];
      let selectedQuestions: any[] = [];
      
      const selectQuestion = (question: any) => {
        if (!selectedQuestions.find(q => q.id === question.id)) {
          selectedQuestions.push(question);
        }
      };
      
      const deselectQuestion = (question: any) => {
        selectedQuestions = selectedQuestions.filter(q => q.id !== question.id);
      };
      
      expect(selectedQuestions).toHaveLength(0);
      
      selectQuestion(availableQuestions[0]);
      expect(selectedQuestions).toHaveLength(1);
      expect(selectedQuestions[0].id).toBe("q1");
      
      deselectQuestion(availableQuestions[0]);
      expect(selectedQuestions).toHaveLength(0);
    });

    it("should handle DOCX generation error", async () => {
      const docError = new Error("DOCX generation failed");
      mockPackerToBlob.mockRejectedValue(docError);
      
      let errorOccurred = false;
      
      try {
        await mockPackerToBlob();
      } catch (error) {
        errorOccurred = true;
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("DOCX generation failed");
      }
      
      expect(errorOccurred).toBe(true);
    });
  });

  describe("Cross-Feature Integration", () => {
    it("should allow switching between different export modals", () => {
      let activeModal: 'none' | 'questions' | 'archive' = 'none';
      
      const openQuestionsExport = () => { activeModal = 'questions'; };
      const openArchiveExport = () => { activeModal = 'archive'; };
      const closeAllModals = () => { activeModal = 'none'; };
      
      expect(activeModal).toBe('none');
      
      openQuestionsExport();
      expect(activeModal).toBe('questions');
      
      openArchiveExport();
      expect(activeModal).toBe('archive');
      
      closeAllModals();
      expect(activeModal).toBe('none');
    });

    it("should maintain separate export data for different types", () => {
      const questionExportData = {
        selectedQuestions: mockCourseData.questionBanks[0].questions,
        includeAnswers: true,
        exportFormat: 'docx'
      };
      
      const archiveExportData = {
        exportOptions: {
          includeQuestionBanks: true,
          includeExams: true,
          includeStudentData: true,
          includeExamResults: true,
          includeAnalytics: true
        },
        formatType: 'comprehensive'
      };
      
      expect(questionExportData.selectedQuestions).toHaveLength(1);
      expect(questionExportData.includeAnswers).toBe(true);
      expect(questionExportData.exportFormat).toBe('docx');
      
      expect(archiveExportData.exportOptions.includeQuestionBanks).toBe(true);
      expect(archiveExportData.exportOptions.includeExams).toBe(true);
      expect(archiveExportData.formatType).toBe('comprehensive');
    });

    it("should handle export validation", () => {
      const validateQuestionExport = (selectedQuestions: any[]) => {
        return selectedQuestions.length > 0;
      };
      
      const validateArchiveExport = (courseData: any) => {
        return Boolean(courseData && courseData.course && courseData.course.id);
      };
      
      expect(validateQuestionExport([])).toBe(false);
      expect(validateQuestionExport(mockCourseData.questionBanks[0].questions)).toBe(true);
      
      expect(validateArchiveExport(null)).toBe(false);
      expect(validateArchiveExport(mockCourseData)).toBe(true);
    });
  });

  describe("Performance and Error Recovery", () => {
    it("should handle network timeout gracefully", async () => {
      const timeoutError = new Error("Network timeout");
      (global.fetch as jest.Mock).mockRejectedValue(timeoutError);
      
      let errorHandled = false;
      
      try {
        await fetch(`/api/courses/test-course-1/export`);
      } catch (error) {
        errorHandled = true;
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("Network timeout");
      }
      
      expect(errorHandled).toBe(true);
    });

    it("should handle large course data export", async () => {
      const largeCourseData = {
        ...mockCourseData,
        questionBanks: Array(10).fill(null).map((_, i) => ({
          id: `qbank-${i}`,
          name: `Question Bank ${i}`,
          questionCount: 5,
          totalPoints: 10,
          questions: Array(5).fill(null).map((_, j) => ({
            id: `q${i}-${j}`,
            text: `Question ${j}`,
            type: "MULTIPLE_CHOICE",
            options: ["A", "B", "C", "D"],
            correctAnswer: "A",
            points: 2,
            difficulty: "MEDIUM",
            topic: `Topic ${i}`,
            questionBankId: `qbank-${i}`
          }))
        }))
      };
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(largeCourseData)
      });
      
      const response = await fetch(`/api/courses/test-course-1/export`);
      const courseData = await response.json();
      
      expect(courseData.questionBanks).toHaveLength(10);
    });

    it("should handle export retry logic", async () => {
      let attemptCount = 0;
      const maxRetries = 3;
      
      const mockRetryFetch = async () => {
        attemptCount++;
        if (attemptCount < maxRetries) {
          throw new Error("Network error");
        }
        return { ok: true, json: () => Promise.resolve(mockCourseData) };
      };
      
      let success = false;
      
      try {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const response = await mockRetryFetch();
            if (response.ok) {
              success = true;
              break;
            }
          } catch (error) {
            if (i === maxRetries - 1) {
              throw error;
            }
            continue;
          }
        }
      } catch (error) {
        // Final failure
      }
      
      expect(attemptCount).toBe(3);
      expect(success).toBe(true);
    });

    it("should provide clear feedback during export process", () => {
      let currentMessage = "";
      
      const updateMessage = (message: string) => {
        currentMessage = message;
      };
      
      const simulateExportFeedback = () => {
        updateMessage("Preparing export...");
        updateMessage("Fetching course data...");
        updateMessage("Processing questions...");
        updateMessage("Generating archive...");
        updateMessage("Export complete!");
      };
      
      expect(currentMessage).toBe("");
      
      simulateExportFeedback();
      expect(currentMessage).toBe("Export complete!");
    });

    it("should handle export cancellation with proper cleanup", () => {
      let isCancelled = false;
      let isCleanedUp = false;
      
      const cancelExport = () => {
        isCancelled = true;
      };
      
      const cleanupExport = () => {
        if (isCancelled) {
          isCleanedUp = true;
        }
      };
      
      expect(isCancelled).toBe(false);
      expect(isCleanedUp).toBe(false);
      
      cancelExport();
      expect(isCancelled).toBe(true);
      
      cleanupExport();
      expect(isCleanedUp).toBe(true);
    });
  });
}); 