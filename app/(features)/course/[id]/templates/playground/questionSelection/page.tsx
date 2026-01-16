"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseLayout from "../../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../../components/layouts/SimpleLayout";
import { QuestionType } from "../../../../../../types/course";
import QuestionSelectorModal from "./questionSelectorModal/questionSelectorModal";

interface QuestionConfig {
  id: string;
  questionNumber: number;
  type: QuestionType;
  selectionMode: "auto" | "manual"; // Changed from isRequired to selectionMode
  selectedQuestionId?: string;
  selectedQuestionData?: Question; // Store complete question data for persistence
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "";
  topic?: string;
  questionBankId?: string;
  questionBankName?: string; // Add question bank name field
  points?: number | "";
  sectionId: string;
}

interface QuestionBank {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Question {
  id: string;
  text: string;
  type: QuestionType;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic: string;
  questionBankId: string;
  questionBankName: string;
  points: number;
  options: string[] | string | null;
  correctAnswer: string;
}

interface FilterData {
  questionBanks: QuestionBank[];
  topics: string[];
  difficulties: string[];
  points: number[];
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

export default function TemplateQuestionConfigurationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const mode = "create";

  const [templateData, setTemplateData] = useState<any>(null);
  const [questions, setQuestions] = useState<QuestionConfig[]>([]);
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [availableTopics, setAvailableTopics] = useState<string[]>([]);
  const [availableDifficulties, setAvailableDifficulties] = useState<string[]>(
    []
  );
  const [availablePoints, setAvailablePoints] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentQuestionBankId, setCurrentQuestionBankId] = useState<
    string | null
  >(null);

  // Pop-up window related status
  const [showQuestionSelector, setShowQuestionSelector] =
    useState<boolean>(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<
    number | null
  >(null);

  // Initial loading identifier
  const initialLoadRef = useRef(true);
  const initialBankLoadedRef = useRef(false);
  
  const [course, setCourse] = useState<Course | null>(null);

  // Save to local storage
  const saveToLocalStorage = () => {
    if (!templateData) return;

    const updatedTemplate = {
      ...templateData,
      questions: questions.map((q) => ({
        ...q,
        sectionId: q.sectionId,
      })),
      totalQuestions: questions.length,
    };

    localStorage.setItem(
      `templateDraft_${courseId}`,
      JSON.stringify(updatedTemplate)
    );
  };

  // Recalculate the serial numbers of all questions to ensure global continuity
  const renumberAllQuestions = (
    questions: QuestionConfig[]
  ): QuestionConfig[] => {
    if (!templateData?.sections) return questions;

    // 1. Sort the questions in the order of the sections defined in the template
    const sectionOrder = templateData.sections.map((s: any) => s.id);

    // 2. First, sort by section order, and then by the original order of the questions within the section
    const sortedQuestions = [...questions].sort((a, b) => {
      // Sort in the order of sections
      const sectionAIndex = sectionOrder.indexOf(a.sectionId);
      const sectionBIndex = sectionOrder.indexOf(b.sectionId);
      if (sectionAIndex !== sectionBIndex) {
        return sectionAIndex - sectionBIndex;
      }
      return a.questionNumber - b.questionNumber;
    });

    // 3. Reassign the global consecutive serial numbers
    return sortedQuestions.map((q, index) => ({
      ...q,
      questionNumber: index + 1,
    }));
  };

  // Obtain the filtering conditions
  const fetchQuestionFilters = useCallback(
    async (questionBankId: string | null = null) => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        params.append("courseId", courseId);
        if (questionBankId) params.append("questionBankId", questionBankId);

        const response = await fetch(
          `/api/templates/question-filter?${params.toString()}`
        );
        if (!response.ok) throw new Error("Failed to fetch filters");

        const data: FilterData = await response.json();

        setQuestionBanks(data.questionBanks || []);
        setAvailableTopics(data.topics || []);
        setAvailableDifficulties(data.difficulties || []);
        setAvailablePoints(data.points || []);

        if (initialLoadRef.current && data.questionBanks?.length > 0) {
          // Fetch questions from ALL banks initially so "All Question Banks" works
          data.questionBanks.forEach((bank) => {
            fetchQuestionsByBank(bank.id);
          });
          initialBankLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error fetching filters:", error);
        toast.error("Failed to load question banks");
      } finally {
        setLoading(false);
        initialLoadRef.current = false;
      }
    },
    [courseId]
  );

  // Get the questions in the question bank
  const fetchQuestionsByBank = useCallback(
    async (bankId: string) => {
      if (
        !bankId ||
        availableQuestions.some((q) => q.questionBankId === bankId)
      )
        return;

      try {
        const response = await fetch(`/api/question-banks/${bankId}`);
        if (!response.ok) throw new Error("Failed to fetch questions");

        const bankData = await response.json();
        const safeQuestions = (bankData.questions || []).map((q: any) => ({
          ...q,
          topic: q.topic || "",
          questionBankName: bankData.name || "Unknown Bank", // Use bank name from API response
        }));
        setAvailableQuestions((prev) => [...prev, ...safeQuestions]);
      } catch (error) {
        console.error("Error fetching questions:", error);
        toast.error("Failed to load questions for this bank");
      }
    },
    [availableQuestions, questionBanks]
  );

  // Initialize data loading
  useEffect(() => {
    if (status !== "authenticated") return;

    const initData = async () => {
      // Create mode: load from localStorage
      console.log(
        "🔍 QUESTION SELECTION: Create mode - loading from localStorage"
      );
      const savedTemplate = localStorage.getItem(`templateDraft_${courseId}`);
      if (!savedTemplate) {
        toast.error("No template data found");
        router.back();
        return;
      }

      const parsedTemplate = JSON.parse(savedTemplate);
      setTemplateData(parsedTemplate);

      let initialQuestions: QuestionConfig[] = [];
      if (parsedTemplate.questions && parsedTemplate.questions.length > 0) {
        console.log(
          "🔍 QUESTION SELECTION: Using existing questions from template"
        );
        initialQuestions = parsedTemplate.questions;
      } else {
        console.log(
          "🔍 QUESTION SELECTION: Creating new questions from sections"
        );
        // Initialize the title of the new template
        initialQuestions = parsedTemplate.sections.flatMap((section: any) =>
          Array.from({ length: section.end - section.start + 1 }, (_, i) => ({
            id: crypto.randomUUID(),
            questionNumber: section.start + i,
            type: section.type,
            selectionMode: "auto", // Initialize selection mode
            selectedQuestionId: undefined,
            difficulty: "",
            topic: "",
            questionBankId: "",
            sectionId: section.id, // Fix: Add the missing sectionId
          }))
        );
      }

      // Ensure that the global serial numbers are consecutive during initialization
      const renumbered = renumberAllQuestions(initialQuestions);
      setQuestions(renumbered);

      // Save the initialized state back to localStorage to ensure consistency
      if (renumbered.length > 0) {
        const updatedTemplate = {
          ...parsedTemplate,
          questions: renumbered.map((q) => ({
            ...q,
            sectionId: q.sectionId,
          })),
          totalQuestions: renumbered.length,
        };
        localStorage.setItem(
          `templateDraft_${courseId}`,
          JSON.stringify(updatedTemplate)
        );
      }

      await fetchQuestionFilters();
    };

    initData();
  }, [status, courseId, router, fetchQuestionFilters]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, router]);

  // Reload the questions when the question bank changes
  useEffect(() => {
    if (currentQuestionBankId && initialBankLoadedRef.current) {
      fetchQuestionsByBank(currentQuestionBankId);
    }
  }, [currentQuestionBankId, fetchQuestionsByBank]);

  // Handle the results of the question selection
  const handleSelectQuestion = (question: Question) => {
    if (currentQuestionIndex === null) return;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      selectedQuestionId: question.id,
      selectedQuestionData: question, // Store complete question data for persistence
      questionBankId: question.questionBankId,
      questionBankName: question.questionBankName, // Store the bank name
      difficulty: question.difficulty,
      topic: question.topic,
      points: question.points,
    };

    setQuestions(updatedQuestions);
    setShowQuestionSelector(false);
    setCurrentQuestionIndex(null);
    saveToLocalStorage();
  };

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");

      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error("Error fetching course:", error);
    }
  };

  // Issue configuration change handling
  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    const currentQuestion = updatedQuestions[index];
    const sectionType = templateData?.sections.find(
      (s) => s.id === currentQuestion.sectionId
    )?.type;

    if (field === "selectionMode") {
      if (value === "auto") {
        // When switching to auto mode, clear the selected question and related data
        updatedQuestions[index] = {
          ...updatedQuestions[index],
          [field]: value,
          selectedQuestionId: undefined,
          selectedQuestionData: undefined, // Clear stored question data
          questionBankName: undefined, // Clear the stored bank name
          sectionId: updatedQuestions[index].sectionId,
        };
      } else {
        // When switching to manual mode, clear all filter fields until a question is selected
        updatedQuestions[index] = {
          ...updatedQuestions[index],
          [field]: value,
          selectedQuestionId: undefined,
          selectedQuestionData: undefined,
          questionBankId: undefined,
          questionBankName: undefined,
          difficulty: undefined,
          topic: undefined,
          points: undefined,
          sectionId: updatedQuestions[index].sectionId,
        };
      }
    } else if (field === "questionBankId") {
      // Update the field
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value,
        sectionId: updatedQuestions[index].sectionId,
      };

      // Clear incompatible filters
      if (sectionType) {
        const newFilters = { questionBankId: value };
        const compatibleDifficulties = getFilteredDifficulties(
          sectionType,
          newFilters
        );
        const compatibleTopics = getFilteredTopics(sectionType, newFilters);
        const compatiblePoints = getFilteredPoints(sectionType, newFilters);

        // Clear fields that are no longer compatible
        if (
          currentQuestion.difficulty &&
          !compatibleDifficulties.includes(currentQuestion.difficulty)
        ) {
          updatedQuestions[index].difficulty = "";
        }
        if (
          currentQuestion.topic &&
          !compatibleTopics.includes(currentQuestion.topic)
        ) {
          updatedQuestions[index].topic = "";
        }
        if (
          currentQuestion.points &&
          !compatiblePoints.includes(Number(currentQuestion.points))
        ) {
          updatedQuestions[index].points = "";
        }
      }

      if (value) {
        setCurrentQuestionBankId(value);
        fetchQuestionsByBank(value);
      }
    } else {
      // Update the field
      updatedQuestions[index] = {
        ...updatedQuestions[index],
        [field]: value,
        sectionId: updatedQuestions[index].sectionId,
      };

      // Clear incompatible filters for other fields
      if (
        sectionType &&
        (field === "difficulty" || field === "topic" || field === "points")
      ) {
        const currentFilters = {
          questionBankId: currentQuestion.questionBankId,
          difficulty:
            field === "difficulty" ? value : currentQuestion.difficulty,
          topic: field === "topic" ? value : currentQuestion.topic,
          points: field === "points" ? value : currentQuestion.points,
        };

        if (field === "difficulty") {
          const compatibleTopics = getFilteredTopics(
            sectionType,
            currentFilters
          );
          const compatiblePoints = getFilteredPoints(
            sectionType,
            currentFilters
          );
          const compatibleBanks = getFilteredQuestionBanks(
            sectionType,
            currentFilters
          );

          if (
            currentQuestion.topic &&
            !compatibleTopics.includes(currentQuestion.topic)
          ) {
            updatedQuestions[index].topic = "";
          }
          if (
            currentQuestion.points &&
            !compatiblePoints.includes(Number(currentQuestion.points))
          ) {
            updatedQuestions[index].points = "";
          }
          if (
            currentQuestion.questionBankId &&
            !compatibleBanks.find(
              (b) => b.id === currentQuestion.questionBankId
            )
          ) {
            updatedQuestions[index].questionBankId = "";
          }
        } else if (field === "topic") {
          const compatibleDifficulties = getFilteredDifficulties(
            sectionType,
            currentFilters
          );
          const compatiblePoints = getFilteredPoints(
            sectionType,
            currentFilters
          );
          const compatibleBanks = getFilteredQuestionBanks(
            sectionType,
            currentFilters
          );

          if (
            currentQuestion.difficulty &&
            !compatibleDifficulties.includes(currentQuestion.difficulty)
          ) {
            updatedQuestions[index].difficulty = "";
          }
          if (
            currentQuestion.points &&
            !compatiblePoints.includes(Number(currentQuestion.points))
          ) {
            updatedQuestions[index].points = "";
          }
          if (
            currentQuestion.questionBankId &&
            !compatibleBanks.find(
              (b) => b.id === currentQuestion.questionBankId
            )
          ) {
            updatedQuestions[index].questionBankId = "";
          }
        } else if (field === "points") {
          const compatibleDifficulties = getFilteredDifficulties(
            sectionType,
            currentFilters
          );
          const compatibleTopics = getFilteredTopics(
            sectionType,
            currentFilters
          );
          const compatibleBanks = getFilteredQuestionBanks(
            sectionType,
            currentFilters
          );

          if (
            currentQuestion.difficulty &&
            !compatibleDifficulties.includes(currentQuestion.difficulty)
          ) {
            updatedQuestions[index].difficulty = "";
          }
          if (
            currentQuestion.topic &&
            !compatibleTopics.includes(currentQuestion.topic)
          ) {
            updatedQuestions[index].topic = "";
          }
          if (
            currentQuestion.questionBankId &&
            !compatibleBanks.find(
              (b) => b.id === currentQuestion.questionBankId
            )
          ) {
            updatedQuestions[index].questionBankId = "";
          }
        }
      }
    }

    setQuestions(updatedQuestions);
    saveToLocalStorage();
  };

  // Helper functions to filter options by question type with cascading filters
  const getCompatibleQuestions = (
    questionType: QuestionType,
    currentFilters: {
      questionBankId?: string;
      difficulty?: string;
      topic?: string;
      points?: number | string;
    }
  ) => {
    return availableQuestions.filter((q) => {
      if (q.type !== questionType) return false;
      if (
        currentFilters.questionBankId &&
        q.questionBankId !== currentFilters.questionBankId
      )
        return false;
      if (
        currentFilters.difficulty &&
        q.difficulty !== currentFilters.difficulty
      )
        return false;
      if (currentFilters.topic && q.topic !== currentFilters.topic)
        return false;
      if (currentFilters.points && q.points !== currentFilters.points)
        return false;
      return true;
    });
  };

  const getFilteredDifficulties = (
    questionType: QuestionType,
    currentFilters: {
      questionBankId?: string;
      topic?: string;
      points?: number | string;
    }
  ): string[] => {
    const compatibleQuestions = getCompatibleQuestions(
      questionType,
      currentFilters
    );
    return Array.from(
      new Set(compatibleQuestions.map((q) => q.difficulty).filter(Boolean))
    );
  };

  const getFilteredTopics = (
    questionType: QuestionType,
    currentFilters: {
      questionBankId?: string;
      difficulty?: string;
      points?: number | string;
    }
  ): string[] => {
    const compatibleQuestions = getCompatibleQuestions(
      questionType,
      currentFilters
    );
    return Array.from(
      new Set(compatibleQuestions.map((q) => q.topic).filter(Boolean))
    );
  };

  const getFilteredPoints = (
    questionType: QuestionType,
    currentFilters: {
      questionBankId?: string;
      difficulty?: string;
      topic?: string;
    }
  ): number[] => {
    const compatibleQuestions = getCompatibleQuestions(
      questionType,
      currentFilters
    );
    return Array.from(new Set(compatibleQuestions.map((q) => q.points))).sort(
      (a, b) => a - b
    );
  };

  const getFilteredQuestionBanks = (
    questionType: QuestionType,
    currentFilters: {
      difficulty?: string;
      topic?: string;
      points?: number | string;
    }
  ): QuestionBank[] => {
    const compatibleQuestions = getCompatibleQuestions(
      questionType,
      currentFilters
    );
    const bankIds = Array.from(
      new Set(compatibleQuestions.map((q) => q.questionBankId))
    );
    return questionBanks.filter((bank) => bankIds.includes(bank.id));
  };

  // Open the pop-up window for question selection
  const openQuestionSelector = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionSelector(true);
  };

  // Add a question to the section
  const addQuestionToSection = (sectionId: string) => {
    const section = templateData?.sections.find((s: any) => s.id === sectionId);
    if (!section) return;

    // Create a new topic (temporary serial number, which will be recalculated later)
    const newQuestion: QuestionConfig = {
      id: crypto.randomUUID(),
      questionNumber: questions.length + 1,
      type: section.type || QuestionType.MULTIPLE_CHOICE,
      selectionMode: "auto", // Initialize selection mode
      selectedQuestionId: undefined,
      difficulty: "",
      topic: "",
      questionBankId: "",
      sectionId: sectionId, // Fix: Add the missing sectionId
    };

    // Renumber after adding
    const updatedQuestions = [...questions, newQuestion];
    const renumbered = renumberAllQuestions(updatedQuestions);
    setQuestions(renumbered);
    saveToLocalStorage();
  };

  // delete question
  const removeQuestion = (index: number) => {
    const sectionId = questions[index].sectionId;
    const sectionQuestions = questions.filter((q) => q.sectionId === sectionId);

    if (sectionQuestions.length <= 1) {
      toast.error("Each section must have at least one question");
      return;
    }

    // Reorder after deletion
    const updatedQuestions = questions.filter((_, i) => i !== index);
    const renumbered = renumberAllQuestions(updatedQuestions);
    setQuestions(renumbered);
    saveToLocalStorage();
  };

  // Next step: Preview
  const handleNextStep = () => {
    const incomplete = questions.some(
      (q) => q.selectionMode === "manual" && !q.selectedQuestionId
    );

    if (incomplete) {
      toast.error("Please select questions for all required positions");
      return;
    }

    if (templateData) {
      const updatedTemplate = {
        ...templateData,
        questions: questions.map((q) => ({
          ...q,
          sectionId: q.sectionId,
        })),
        totalQuestions: questions.length,
      };

      localStorage.setItem(
        `templateDraft_${courseId}`,
        JSON.stringify(updatedTemplate)
      );
      const queryParams = new URLSearchParams();
      if (isSidebarAccess) queryParams.set("sidebar", "true");

      router.push(
        `/course/${courseId}/templates/playground/review${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`
      );
    }
  };

  // last step
  const handlePreviousStep = () => {
    const queryParams = new URLSearchParams();
    if (isSidebarAccess) queryParams.set("sidebar", "true");

    router.push(
      `/course/${courseId}/templates/playground${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`
    );
  };

  // Render the main content
  function renderContent() {
    if (!templateData) return null;

    return (
      <div className="max-w-6xl mx-auto p-4">
        {/* Step indicator */}
        <div className="flex items-center mb-8 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium">
              1
            </div>
            <div className="ml-2 text-sm font-medium text-brand-navy">
              Define Structure
            </div>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-brand-navy"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium">
              2
            </div>
            <div className="ml-2 text-sm font-medium text-brand-navy">
              Question Configuration
            </div>
          </div>
          <div className="mx-4 h-0.5 w-12 bg-gray-200"></div>
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium">
              3
            </div>
            <div className="ml-2 text-sm font-medium text-gray-500">
              Review & Save
            </div>
          </div>
        </div>

        <div className="mb-8 p-5 bg-white rounded-lg border border-gray-200 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">
            Configure Questions
          </h1>
          <p className="text-gray-600 mt-2">
            Set up details for each question in your template
          </p>
        </div>

        {/* Tips Box */}
        <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
              <div className="text-sm text-blue-800 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white/70 p-3 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-1">🎯 Auto Selection</h4>
                    <p className="text-xs text-blue-700">
                      Questions are automatically chosen based on filters you set (difficulty, topic, question bank). 
                      Perfect for creating balanced exams quickly.
                    </p>
                  </div>
                  <div className="bg-white/70 p-3 rounded-md">
                    <h4 className="font-medium text-blue-900 mb-1">✋ Manual Selection</h4>
                    <p className="text-xs text-blue-700">
                      You pick specific questions from your question banks. 
                      Ideal when you need exact questions or want full control.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1 mt-2 text-xs text-blue-700">
                  <span>💡</span>
                  <span><strong>Pro tip:</strong> Start with auto selection for faster setup, then switch specific questions to manual if needed!</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary of template information */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8 shadow-sm">
          <div className="flex items-center">
            <div
              className="w-4 h-4 rounded-full mr-3"
              style={{ backgroundColor: templateData.color }}
            ></div>
            <h3 className="font-medium text-gray-900">{templateData.name}</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {templateData.description}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Total Questions: {questions.length}
          </p>
        </div>

        {/* Display the question configuration by module */}
        <div className="space-y-8 mb-8">
          {templateData.sections.map((section: any) => {
            // Filter out the questions of the current section and sort them by global sequence number
            const sectionQuestions = questions
              .filter((q) => q.sectionId === section.id)
              .sort((a, b) => a.questionNumber - b.questionNumber);

            return (
              <div
                key={section.id}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
              >
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">
                      {section.name}
                    </h3>
                    <button
                      onClick={() => addQuestionToSection(section.id)}
                      className="flex items-center text-sm text-brand-navy font-medium hover:underline"
                    >
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add Question to Section
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {section.type === QuestionType.MULTIPLE_CHOICE
                      ? "Multiple Choice"
                      : "True/False"}
                    {/* Display the scope of the current section's questions */}
                    {sectionQuestions.length > 0 && (
                      <span className="ml-2 text-gray-500">
                        (Questions {sectionQuestions[0].questionNumber} -{" "}
                        {
                          sectionQuestions[sectionQuestions.length - 1]
                            .questionNumber
                        }
                        )
                      </span>
                    )}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Question #
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Selection Mode
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Question Bank
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Difficulty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Topic
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Points
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sectionQuestions.map((question) => {
                        const globalIndex = questions.findIndex(
                          (q) => q.id === question.id
                        );
                        // Get detailed information about the selected topic
                        // Use stored question data if available, otherwise look up in availableQuestions
                        const selectedQuestion =
                          question.selectedQuestionData ||
                          (question.selectedQuestionId
                            ? availableQuestions.find(
                                (q) => q.id === question.selectedQuestionId
                              )
                            : null);
                        // Get the name of the question bank
                        const questionBankName =
                          question.questionBankName ||
                          (question.questionBankId
                            ? questionBanks.find(
                                (b) => b.id === question.questionBankId
                              )?.name || "Unknown Bank"
                            : "");

                        return (
                          <tr
                            key={question.id}
                            className={`hover:bg-gray-50 transition-colors ${
                              question.selectionMode === "manual"
                                ? "bg-blue-50/50"
                                : ""
                            }`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                              <div className="text-sm font-medium text-gray-900">
                                {question.questionNumber}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap border-r border-gray-100">
                              <select
                                value={question.selectionMode}
                                onChange={(e) =>
                                  handleQuestionChange(
                                    globalIndex,
                                    "selectionMode",
                                    e.target.value
                                  )
                                }
                                className="text-sm w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy"
                              >
                                <option value="auto">Auto-select</option>
                                <option value="manual">Manual selection</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 border-r border-gray-100">
                              {question.selectionMode === "manual" ? (
                                question.selectedQuestionId ||
                                question.selectedQuestionData ? (
                                  <div className="flex flex-col space-y-1">
                                    <div
                                      className={`text-sm text-gray-900 p-2 rounded border ${
                                        question.selectionMode === "manual"
                                          ? "bg-blue-50 border-blue-100"
                                          : "bg-gray-50 border-gray-100"
                                      }`}
                                    >
                                      {question.selectedQuestionData?.text ||
                                        selectedQuestion?.text ||
                                        "Selected Question"}
                                    </div>
                                    <button
                                      onClick={() =>
                                        openQuestionSelector(globalIndex)
                                      }
                                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors text-left"
                                    >
                                      Change Question
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() =>
                                      openQuestionSelector(globalIndex)
                                    }
                                    className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors text-sm"
                                  >
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                      />
                                    </svg>
                                    Select Question
                                  </button>
                                )
                              ) : (
                                <span className="text-sm text-gray-500">
                                  Auto-selected
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 border-r border-gray-100">
                              {question.selectionMode === "manual" ? (
                                // Manual mode: only show data if a question is selected
                                <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                                  {question.selectedQuestionId ||
                                  question.selectedQuestionData ? (
                                    question.selectedQuestionData
                                      ?.questionBankName ||
                                    question.questionBankName ||
                                    selectedQuestion?.questionBankName ||
                                    questionBankName
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Select a question first
                                    </span>
                                  )}
                                </div>
                              ) : (
                                // Non-mandatory questions display selection boxes
                                <select
                                  value={question.questionBankId || ""}
                                  onChange={(e) =>
                                    handleQuestionChange(
                                      globalIndex,
                                      "questionBankId",
                                      e.target.value
                                    )
                                  }
                                  className="text-sm w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                >
                                  <option value="">All</option>
                                  {getFilteredQuestionBanks(section.type, {
                                    difficulty:
                                      question.difficulty || undefined,
                                    topic: question.topic || undefined,
                                    points: question.points || undefined,
                                  }).map((bank) => (
                                    <option key={bank.id} value={bank.id}>
                                      {bank.name}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4 border-r border-gray-100">
                              {question.selectionMode === "manual" ? (
                                <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                                  {question.selectedQuestionId ||
                                  question.selectedQuestionData ? (
                                    question.selectedQuestionData?.difficulty ||
                                    question.difficulty ||
                                    selectedQuestion?.difficulty ||
                                    ""
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Select a question first
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <select
                                  value={question.difficulty || ""}
                                  onChange={(e) =>
                                    handleQuestionChange(
                                      globalIndex,
                                      "difficulty",
                                      e.target.value
                                    )
                                  }
                                  className="text-sm w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                >
                                  <option value="">All Difficulties</option>
                                  {getFilteredDifficulties(section.type, {
                                    questionBankId:
                                      question.questionBankId || undefined,
                                    topic: question.topic || undefined,
                                    points: question.points || undefined,
                                  }).map((difficulty) => (
                                    <option key={difficulty} value={difficulty}>
                                      {difficulty}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4 border-r border-gray-100">
                              {question.selectionMode === "manual" ? (
                                <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                                  {question.selectedQuestionId ||
                                  question.selectedQuestionData ? (
                                    question.selectedQuestionData?.topic ||
                                    question.topic ||
                                    selectedQuestion?.topic ||
                                    ""
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Select a question first
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <select
                                  value={question.topic || ""}
                                  onChange={(e) =>
                                    handleQuestionChange(
                                      globalIndex,
                                      "topic",
                                      e.target.value
                                    )
                                  }
                                  className="text-sm w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                >
                                  <option value="">All Topics</option>
                                  {getFilteredTopics(section.type, {
                                    questionBankId:
                                      question.questionBankId || undefined,
                                    difficulty:
                                      question.difficulty || undefined,
                                    points: question.points || undefined,
                                  }).map((topic) => (
                                    <option key={topic} value={topic}>
                                      {topic}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4 border-r border-gray-100">
                              {question.selectionMode === "manual" ? (
                                <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                                  {question.selectedQuestionId ||
                                  question.selectedQuestionData ? (
                                    question.selectedQuestionData?.points ||
                                    question.points ||
                                    selectedQuestion?.points ||
                                    ""
                                  ) : (
                                    <span className="text-gray-400 italic">
                                      Select a question first
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <select
                                  value={question.points}
                                  onChange={(e) =>
                                    handleQuestionChange(
                                      globalIndex,
                                      "points",
                                      e.target.value
                                        ? parseInt(e.target.value)
                                        : ""
                                    )
                                  }
                                  className="text-sm w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                >
                                  <option value="">All Points</option>
                                  {getFilteredPoints(section.type, {
                                    questionBankId:
                                      question.questionBankId || undefined,
                                    difficulty:
                                      question.difficulty || undefined,
                                    topic: question.topic || undefined,
                                  }).map((point) => (
                                    <option key={point} value={point}>
                                      {point}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => removeQuestion(globalIndex)}
                                className="text-red-500 hover:text-red-700 hover:underline p-1 rounded border border-transparent hover:border-red-200"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* operating button */}
        <div className="flex justify-end space-x-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
          <button
            onClick={handlePreviousStep}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-4 h-4 mr-2 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Previous Step
          </button>
          <button
            onClick={handleNextStep}
            className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800 transition-colors font-medium"
          >
            Continue to Review
            <svg
              className="w-4 h-4 ml-2 inline"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14 5l7 7m0 0l-7 7m7-7H3"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Loading status processing
  if (status === "loading" || loading || !templateData) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={course}
        title="Configure Questions"
        description="Loading..."
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="templates" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  // Handling of unlogged status
  if (!session) return null;

  // Main rendering function
  return (
    <>
      {isSidebarAccess ? (
        <SimpleLayout
          course={course}
          title="Configure Questions"
          description="Set up question details"
        >
          {renderContent()}
        </SimpleLayout>
      ) : (
        <CourseLayout course={null} activeTab="templates">
          {renderContent()}
        </CourseLayout>
      )}

      {/* Select the pop-up window component for the problem */}
      <QuestionSelectorModal
        isOpen={showQuestionSelector}
        questionType={
          currentQuestionIndex !== null
            ? questions[currentQuestionIndex].type
            : QuestionType.MULTIPLE_CHOICE
        }
        availableQuestions={availableQuestions}
        questionBanks={questionBanks}
        availableDifficulties={
          // Filter difficulties to only show those available for the current question type
          currentQuestionIndex !== null
            ? Array.from(
                new Set(
                  availableQuestions
                    .filter(
                      (q) => q.type === questions[currentQuestionIndex].type
                    )
                    .map((q) => q.difficulty)
                    .filter(Boolean)
                )
              )
            : availableDifficulties
        }
        availableTags={
          // Filter topics to only show those available for the current question type
          currentQuestionIndex !== null
            ? Array.from(
                new Set(
                  availableQuestions
                    .filter(
                      (q) => q.type === questions[currentQuestionIndex].type
                    )
                    .map((q) => q.topic)
                    .filter(Boolean)
                )
              )
            : availableTopics
        }
        availablePoints={
          // Filter points to only show those available for the current question type
          currentQuestionIndex !== null
            ? Array.from(
                new Set(
                  availableQuestions
                    .filter(
                      (q) => q.type === questions[currentQuestionIndex].type
                    )
                    .map((q) => q.points)
                )
              ).sort((a, b) => a - b)
            : availablePoints
        }
        onSelectQuestion={handleSelectQuestion}
        onClose={() => {
          setShowQuestionSelector(false);
          setCurrentQuestionIndex(null);
        }}
      />
    </>
  );
}
