"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";
import { Question, Course } from "../../../../../types/mcqlist";
import { safeParseOptions } from "../../../../../lib/mcqlist";
import DeleteExamModal from "../../../../../components/exams/DeleteExamModal";
import { generateSectionOptions } from "../../../../../lib/sectionUtils";

function ExamPlaygroundContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const examId = searchParams.get("examId");
  const templateId = searchParams.get("templateId");
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const mode = examId ? "edit" : "create";

  // State management
  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionBanks, setQuestionBanks] = useState<any[]>([]);
  const [selectedQuestionBanks, setSelectedQuestionBanks] = useState<string[]>([
    "ALL",
  ]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Question[]>([]);
  const [examName, setExamName] = useState("");
  const [examDescription, setExamDescription] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("2025");
  const [availableTerms, setAvailableTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingQuestionBanks, setLoadingQuestionBanks] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("ALL");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [templateStatus, setTemplateStatus] = useState<{
    applied: boolean;
    templateName: string;
    successful: number;
    failed: number;
    duplicates: number;
    issues: string[];
  } | null>(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchQuestionBanks();
      fetchQuestionsForCourse(courseId);
      fetchTerms();
    }
    if (examId) {
      fetchExamData();
    }
    if (templateId && !examId) {
      loadTemplateAndApply();
    }
  }, [courseId, examId, templateId]);

  // Function to refresh question data
  const refreshQuestionData = async () => {
    setLoadingQuestionBanks(true);
    setLoading(true);
    await Promise.all([
      fetchQuestionBanks(),
      fetchQuestionsForCourse(courseId),
    ]);
    setLoadingQuestionBanks(false);
    setLoading(false);
    toast.success("Question data refreshed!");
  };

  // Auto-refresh when page gets focus (user comes back from another tab)
  useEffect(() => {
    const handleFocus = () => {
      // Refresh data when user comes back to this tab
      if (courseId) {
        fetchQuestionBanks();
        fetchQuestionsForCourse(courseId);
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [courseId]);

  // Generate section options based on selected term
  const getSectionOptions = (): string[] => {
    return generateSectionOptions(selectedTerm);
  };

  // Reset selected section when term changes
  useEffect(() => {
    setSelectedSection("");
  }, [selectedTerm]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        toast.error("Failed to load course");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course");
    }
  };

  const fetchQuestionBanks = async () => {
    try {
      setLoadingQuestionBanks(true);
      const response = await fetch(`/api/question-banks?courseId=${courseId}`);
      if (response.ok) {
        const questionBanksData = await response.json();
        setQuestionBanks(questionBanksData);
      } else {
        toast.error("Failed to load question banks");
      }
    } catch (error) {
      console.error("Error fetching question banks:", error);
      toast.error("Failed to load question banks");
    } finally {
      setLoadingQuestionBanks(false);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await fetch("/api/terms");
      if (response.ok) {
        const termsData = await response.json();
        setAvailableTerms(termsData);
      } else {
        console.error("Failed to fetch terms");
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  };

  const fetchExamData = async () => {
    if (!examId) return;

    try {
      const response = await fetch(`/api/exams/${examId}`);
      if (response.ok) {
        const examData = await response.json();
        setExamName(examData.name || examData.title);
        setExamDescription(examData.description || "");
        setSelectedQuestions(examData.questions || []);
        if (examData.term) {
          setSelectedTerm(examData.term.term);
          setSelectedYear(examData.term.year.toString());
        }
        if (examData.section) {
          setSelectedSection(examData.section);
        }
      } else {
        toast.error("Failed to load exam data");
        router.push(`/course/${courseId}/exams`);
      }
    } catch (error) {
      console.error("Error fetching exam data:", error);
      toast.error("Failed to load exam data");
    }
  };

  const fetchQuestionsForCourse = async (courseId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/questions`);
      if (response.ok) {
        const questionsData = await response.json();
        const processedQuestions = questionsData.map((q: any) => ({
          ...q,
          options: safeParseOptions(q.options),
          negativePoints: q.negativePoints ?? null,
        }));
        setQuestions(processedQuestions);
      } else {
        toast.error("Failed to load questions for course");
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions for course");
    } finally {
      setLoading(false);
    }
  };

  // Load template and apply it to exam questions with duplicate detection
  const loadTemplateAndApply = async () => {
    if (!templateId) return;

    try {
      setLoading(true);

      // Fetch template data and questions in parallel
      const [templateResponse, questionsResponse] = await Promise.all([
        fetch(`/api/templates/${templateId}`),
        fetch(`/api/courses/${courseId}/questions`),
      ]);

      if (!templateResponse.ok) {
        throw new Error("Failed to fetch template");
      }
      if (!questionsResponse.ok) {
        throw new Error("Failed to fetch questions");
      }

      const templateData = await templateResponse.json();
      const questionsData = await questionsResponse.json();

      console.log("Loading template:", templateData.name);
      console.log("Questions available:", questionsData.length);

      // Process questions the same way as fetchQuestionsForCourse
      const processedQuestions = questionsData.map((q: any) => ({
        ...q,
        options: safeParseOptions(q.options),
        negativePoints: q.negativePoints ?? null,
      }));

      // Update state with questions first
      setQuestions(processedQuestions);

      // Also fetch question banks for the UI
      await fetchQuestionBanks();

      // Apply template with the fresh questions data
      applyTemplateToExam(templateData, processedQuestions);
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load template");
    } finally {
      setLoading(false);
    }
  };

  // Apply template logic with duplicate detection and feedback
  const applyTemplateToExam = (
    templateData: any,
    availableQuestions: Question[]
  ) => {
    const appliedQuestions: Question[] = [];
    const issues: string[] = [];
    let successful = 0;
    let failed = 0;
    let duplicates = 0;

    // Set exam name from template
    setExamName(`${templateData.name} - Exam`);

    console.log(
      "Applying template with",
      availableQuestions.length,
      "available questions"
    );

    templateData.questions.forEach((templateQ: any, index: number) => {
      const questionNumber = templateQ.questionNumber;

      if (templateQ.isRequired && templateQ.selectedQuestionId) {
        // Manual selection - find the specific question
        const specificQuestion = availableQuestions.find(
          (q) => q.id === templateQ.selectedQuestionId
        );

        if (specificQuestion) {
          // Check for duplicates
          const isDuplicate = appliedQuestions.some(
            (q) => q.id === specificQuestion.id
          );

          if (isDuplicate) {
            duplicates++;
            const duplicatePos =
              appliedQuestions.findIndex((q) => q.id === specificQuestion.id) +
              1;
            issues.push(
              `Q${questionNumber}: "${specificQuestion.text.substring(
                0,
                50
              )}..." is a duplicate (same as Q${duplicatePos})`
            );
          } else {
            appliedQuestions.push(specificQuestion);
            successful++;
          }
        } else {
          failed++;
          issues.push(`Q${questionNumber}: Selected question not found`);
        }
      } else {
        // Auto-selection - find questions based on filters
        let candidateQuestions = availableQuestions.filter(
          (q) => q.type === templateQ.type
        );

        // Apply filters
        if (templateQ.questionBankId) {
          candidateQuestions = candidateQuestions.filter(
            (q) => q.questionBankId === templateQ.questionBankId
          );
        }
        if (templateQ.difficulty) {
          candidateQuestions = candidateQuestions.filter(
            (q) => q.difficulty === templateQ.difficulty
          );
        }
        if (templateQ.topic) {
          candidateQuestions = candidateQuestions.filter(
            (q) => q.topic === templateQ.topic
          );
        }
        if (templateQ.points) {
          candidateQuestions = candidateQuestions.filter(
            (q) => q.points === templateQ.points
          );
        }

        // Remove already selected questions to avoid duplicates
        candidateQuestions = candidateQuestions.filter(
          (q) => !appliedQuestions.some((selected) => selected.id === q.id)
        );

        if (candidateQuestions.length > 0) {
          // Pick first available question
          appliedQuestions.push(candidateQuestions[0]);
          successful++;
        } else {
          failed++;

          // Build detailed filter description
          const filterDetails: string[] = [];
          if (templateQ.questionBankId) {
            const bank = questionBanks.find(
              (b) => b.id === templateQ.questionBankId
            );
            const bankName =
              bank?.name || `Bank ID: ${templateQ.questionBankId}`;
            filterDetails.push(`Bank: "${bankName}"`);
          }
          if (templateQ.difficulty) {
            filterDetails.push(`Difficulty: ${templateQ.difficulty}`);
          }
          if (templateQ.topic) {
            filterDetails.push(`Topic: "${templateQ.topic}"`);
          }
          if (templateQ.points) {
            filterDetails.push(`Points: ${templateQ.points}`);
          }

          const filterText =
            filterDetails.length > 0
              ? filterDetails.join(", ")
              : "No specific filters";

          // Count questions at each filter step for debugging
          const typeMatches = availableQuestions.filter(
            (q) => q.type === templateQ.type
          );
          const bankMatches = templateQ.questionBankId
            ? typeMatches.filter(
                (q) => q.questionBankId === templateQ.questionBankId
              )
            : typeMatches;
          const difficultyMatches = templateQ.difficulty
            ? bankMatches.filter((q) => q.difficulty === templateQ.difficulty)
            : bankMatches;
          const topicMatches = templateQ.topic
            ? difficultyMatches.filter((q) => q.topic === templateQ.topic)
            : difficultyMatches;
          const pointsMatches = templateQ.points
            ? topicMatches.filter((q) => q.points === templateQ.points)
            : topicMatches;

          let debugInfo = `Total ${templateQ.type}: ${typeMatches.length}`;
          if (templateQ.questionBankId)
            debugInfo += `, in bank: ${bankMatches.length}`;
          if (templateQ.difficulty)
            debugInfo += `, with difficulty: ${difficultyMatches.length}`;
          if (templateQ.topic)
            debugInfo += `, with topic: ${topicMatches.length}`;
          if (templateQ.points)
            debugInfo += `, with points: ${pointsMatches.length}`;
          debugInfo += `, after excluding duplicates: ${candidateQuestions.length}`;

          issues.push(
            `Q${questionNumber}: No ${templateQ.type} questions match ${filterText}. (${debugInfo})`
          );
        }
      }
    });

    // Apply the questions
    setSelectedQuestions(appliedQuestions);

    // Set template status for feedback
    setTemplateStatus({
      applied: true,
      templateName: templateData.name,
      successful,
      failed,
      duplicates,
      issues,
    });

    // Show summary toast
    if (successful > 0) {
      const totalIssues = failed + duplicates;
      if (totalIssues === 0) {
        toast.success(
          `Template "${templateData.name}" applied successfully! ${successful} questions loaded.`
        );
      } else {
        toast(
          `Template "${templateData.name}" partially applied. ${successful} successful, ${totalIssues} issues.`,
          {
            icon: "⚠️",
            duration: 5000,
          }
        );
      }
    } else {
      toast.error(
        `Template "${templateData.name}" could not be applied. Check template configuration.`
      );
    }
  };

  // Update available questions whenever questions, selectedQuestions, or questionBank selection changes
  useEffect(() => {
    if (questions.length > 0) {
      let filteredQuestions = questions;

      // Filter by selected question banks
      if (!selectedQuestionBanks.includes("ALL")) {
        filteredQuestions = questions.filter(
          (q) =>
            q.questionBankId && selectedQuestionBanks.includes(q.questionBankId)
        );
      }

      // Remove already selected questions
      const availableQs = filteredQuestions.filter(
        (q: Question) =>
          !selectedQuestions.some((selected) => selected.id === q.id)
      );
      setAvailableQuestions(availableQs);
    }
  }, [questions, selectedQuestions, selectedQuestionBanks]);

  const handleQuestionBankSelection = (questionBankId: string) => {
    if (questionBankId === "ALL") {
      setSelectedQuestionBanks(["ALL"]);
    } else {
      setSelectedQuestionBanks((prev) => {
        const newSelection = prev.filter((id) => id !== "ALL");
        if (newSelection.includes(questionBankId)) {
          const updated = newSelection.filter((id) => id !== questionBankId);
          return updated.length === 0 ? ["ALL"] : updated;
        } else {
          return [...newSelection, questionBankId];
        }
      });
    }
  };

  const addQuestionToExam = (question: Question) => {
    setSelectedQuestions([...selectedQuestions, question]);
    setAvailableQuestions(
      availableQuestions.filter((q) => q.id !== question.id)
    );
  };

  const addAllQuestionsToExam = () => {
    if (filteredAvailableQuestions.length === 0) {
      toast.error("No questions available to add");
      return;
    }

    setSelectedQuestions([...selectedQuestions, ...filteredAvailableQuestions]);
    setAvailableQuestions(
      availableQuestions.filter(
        (q) =>
          !filteredAvailableQuestions.some((filtered) => filtered.id === q.id)
      )
    );

    toast.success(
      `Added ${filteredAvailableQuestions.length} questions to exam`
    );
  };

  const removeQuestionFromExam = (questionId: string) => {
    const questionToRemove = selectedQuestions.find((q) => q.id === questionId);
    if (questionToRemove) {
      setSelectedQuestions(
        selectedQuestions.filter((q) => q.id !== questionId)
      );
      setAvailableQuestions([...availableQuestions, questionToRemove]);
    }
  };

  const moveQuestionUp = (index: number) => {
    if (index > 0) {
      const newQuestions = [...selectedQuestions];
      [newQuestions[index], newQuestions[index - 1]] = [
        newQuestions[index - 1],
        newQuestions[index],
      ];
      setSelectedQuestions(newQuestions);
    }
  };

  const moveQuestionDown = (index: number) => {
    if (index < selectedQuestions.length - 1) {
      const newQuestions = [...selectedQuestions];
      [newQuestions[index], newQuestions[index + 1]] = [
        newQuestions[index + 1],
        newQuestions[index],
      ];
      setSelectedQuestions(newQuestions);
    }
  };

  const handleSaveExam = async () => {
    if (!examName.trim()) {
      toast.error("Please enter an exam name");
      return;
    }

    if (selectedQuestions.length === 0) {
      toast.error("Please add at least one question to the exam");
      return;
    }

    if (!selectedTerm) {
      toast.error("Please select a term for the exam");
      return;
    }

    if (!selectedSection) {
      toast.error("Please select a section for the exam");
      return;
    }

    try {
      // Find the matching term from available terms
      const matchingTerm = availableTerms.find(
        (term) =>
          term.term === selectedTerm && term.year.toString() === selectedYear
      );

      if (!matchingTerm) {
        toast.error("Selected term not found. Please refresh and try again.");
        return;
      }

      const questionIds = selectedQuestions.map((q) => q.id);
      const url = mode === "edit" ? `/api/exams/${examId}` : "/api/exams";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: examName,
          description: examDescription,
          courseId: courseId,
          questionIds,
          termId: matchingTerm.id,
          section: selectedSection,
        }),
      });

      if (response.ok) {
        // Get response data and extract exam ID
        const responseData = await response.json();
        const examIdForRedirect = mode === "create" ? responseData.id : examId;

        toast.success(
          mode === "create"
            ? "Exam created successfully!"
            : "Exam updated successfully!"
        );

        // Redirect to exam view page
        const viewUrl = `/course/${courseId}/exams/view?examId=${examIdForRedirect}${
          isSidebarAccess ? "&sidebar=true" : ""
        }`;
        router.push(viewUrl);
      } else {
        toast.error(`Failed to ${mode} exam`);
      }
    } catch (error) {
      console.error(`Error ${mode}ing exam:`, error);
      toast.error(`Failed to ${mode} exam`);
    }
  };

  const handleDeleteExam = async () => {
    if (!examId) return;

    try {
      const response = await fetch(`/api/exams/${examId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Exam deleted successfully!");
        const examsUrl = `/course/${courseId}/exams${
          isSidebarAccess ? "?sidebar=true" : ""
        }`;
        router.push(examsUrl);
      } else {
        toast.error("Failed to delete exam");
      }
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam");
    }
  };

  const filteredAvailableQuestions = availableQuestions.filter((question) => {
    const matchesSearch = question.text
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType = filterType === "ALL" || question.type === filterType;
    const matchesDifficulty =
      filterDifficulty === "ALL" || question.difficulty === filterDifficulty;
    return matchesSearch && matchesType && matchesDifficulty;
  });

  const totalPoints = selectedQuestions.reduce((sum, q) => sum + q.points, 0);

  if (status === "loading" || !course) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title={mode === "edit" ? "Edit Exam" : "Create Exam"}
        description="Build your exam by selecting and organizing questions"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="exams" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    if (typeof window !== "undefined") router.push("/auth/login");
    return null;
  }

  const content = (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: { background: "#363636", color: "#fff" },
          success: {
            duration: 2000,
            style: { background: "#4aed88", color: "#fff" },
          },
          error: {
            duration: 3000,
            style: { background: "#ff4b4b", color: "#fff" },
          },
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {mode === "edit" ? "Edit Exam" : "Create New Exam"}
            </h1>
            <p className="text-gray-600 mt-2">
              {mode === "edit"
                ? "Modify your exam questions and settings"
                : "Build your exam by selecting and organizing questions"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const templatesUrl = `/course/${courseId}/templates${
                  isSidebarAccess ? "?sidebar=true" : ""
                }`;
                router.push(templatesUrl);
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
              title="Browse templates and use one to start your exam"
            >
              Browse Templates
            </button>

            <button
              onClick={refreshQuestionData}
              disabled={loading || loadingQuestionBanks}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              title="Refresh question data"
            >
              <svg
                className={`w-4 h-4 ${
                  loading || loadingQuestionBanks ? "animate-spin" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => {
                const examsUrl = `/course/${courseId}/exams${
                  isSidebarAccess ? "?sidebar=true" : ""
                }`;
                router.push(examsUrl);
              }}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {mode === "edit" && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Delete Exam
              </button>
            )}
            <button
              onClick={handleSaveExam}
              className="bg-brand-navy hover:bg-navy-800 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {mode === "edit" ? "Save Changes" : "Create Exam"}
            </button>
          </div>
        </div>

        {/* Exam Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Exam Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Exam Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="Enter exam name"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-900 font-medium">
                  {course?.name || "Loading..."}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Term <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              >
                <option value="">Select a term</option>
                {Array.from(
                  new Set(availableTerms.map((term) => term.term))
                ).map((termName) => (
                  <option key={termName} value={termName}>
                    {termName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Section <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
                disabled={!selectedTerm}
              >
                <option value="">Select a section</option>
                {getSectionOptions().map((section) => (
                  <option key={section} value={section}>
                    Section {section}
                  </option>
                ))}
              </select>
              {!selectedTerm && (
                <p className="text-sm text-gray-500 mt-1">
                  Select a term first to see available sections
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                required
              >
                <option value="">Select a year</option>
                {Array.from(new Set(availableTerms.map((term) => term.year)))
                  .sort((a, b) => b - a)
                  .map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={examDescription}
                onChange={(e) => setExamDescription(e.target.value)}
                placeholder="Enter exam description (optional)"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
              />
            </div>
          </div>
        </div>

        {/* Exam Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-blue-800">
              <span className="font-medium">{selectedQuestions.length}</span>{" "}
              questions selected
            </div>
            <div className="text-blue-800">
              Total: <span className="font-medium">{totalPoints}</span> points
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Selected Questions Panel */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Exam Questions ({selectedQuestions.length})
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Questions in your exam (drag to reorder)
              </p>
            </div>

            {/* Template Status Display */}
            {templateStatus && (
              <div
                className={`mx-6 mb-4 p-4 rounded-lg border ${
                  templateStatus.failed === 0 && templateStatus.duplicates === 0
                    ? "bg-green-50 border-green-200"
                    : "bg-orange-50 border-orange-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4
                      className={`font-medium text-sm ${
                        templateStatus.failed === 0 &&
                        templateStatus.duplicates === 0
                          ? "text-green-800"
                          : "text-orange-800"
                      }`}
                    >
                      Template "{templateStatus.templateName}" Applied
                    </h4>
                    <div
                      className={`text-sm mt-1 ${
                        templateStatus.failed === 0 &&
                        templateStatus.duplicates === 0
                          ? "text-green-700"
                          : "text-orange-700"
                      }`}
                    >
                      ✅ {templateStatus.successful} questions applied
                      successfully
                      {templateStatus.duplicates > 0 && (
                        <span>
                          {" "}
                          • ⚠️ {templateStatus.duplicates} duplicates skipped
                        </span>
                      )}
                      {templateStatus.failed > 0 && (
                        <span>
                          {" "}
                          • ❌ {templateStatus.failed} questions failed
                        </span>
                      )}
                    </div>

                    {templateStatus.issues.length > 0 && (
                      <details className="mt-2">
                        <summary
                          className={`text-xs cursor-pointer hover:underline ${
                            templateStatus.failed === 0 &&
                            templateStatus.duplicates === 0
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          View details ({templateStatus.issues.length} issues)
                        </summary>
                        <ul
                          className={`text-xs mt-2 space-y-1 ml-4 ${
                            templateStatus.failed === 0 &&
                            templateStatus.duplicates === 0
                              ? "text-green-600"
                              : "text-orange-600"
                          }`}
                        >
                          {templateStatus.issues.map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                  <button
                    onClick={() => setTemplateStatus(null)}
                    className={`ml-4 text-xs px-2 py-1 rounded hover:bg-opacity-80 ${
                      templateStatus.failed === 0 &&
                      templateStatus.duplicates === 0
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className="p-6 max-h-[calc(100vh-420px)] min-h-[400px] overflow-y-auto">
              {selectedQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
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
                  </div>
                  <p className="text-gray-600">No questions added yet</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Select questions from the available questions panel
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedQuestions.map((question, index) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                            <span className="bg-brand-navy text-white px-2 py-1 rounded text-sm font-medium">
                              Q{index + 1}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {question.points} pts
                              {question.negativePoints != null &&
                                question.negativePoints !== 0 && (
                                  <span className="ml-2 text-red-500">
                                    ({question.negativePoints} points)
                                  </span>
                                )}
                            </span>
                            {question.difficulty && (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  question.difficulty === "EASY"
                                    ? "bg-green-100 text-green-800"
                                    : question.difficulty === "MEDIUM"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {question.difficulty}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {question.text}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 ml-4">
                          <button
                            onClick={() => moveQuestionUp(index)}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveQuestionDown(index)}
                            disabled={index === selectedQuestions.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => removeQuestionFromExam(question.id)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Questions Panel */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Available Questions ({filteredAvailableQuestions.length})
                </h3>
                <button
                  onClick={addAllQuestionsToExam}
                  disabled={filteredAvailableQuestions.length === 0}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                  title={`Add all ${filteredAvailableQuestions.length} filtered questions to exam`}
                >
                  Add All ({filteredAvailableQuestions.length})
                </button>
              </div>

              {/* Question Bank Selection */}
              <div className="mt-4 mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Question Banks
                </label>
                {loadingQuestionBanks ? (
                  <div className="text-sm text-gray-500">
                    Loading question banks...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedQuestionBanks.includes("ALL")}
                        onChange={() => handleQuestionBankSelection("ALL")}
                        className="text-brand-navy rounded"
                      />
                      <span className="text-sm font-medium text-gray-900">
                        All Question Banks
                      </span>
                      <span className="text-xs text-gray-500">
                        ({questions.length} questions)
                      </span>
                    </label>
                    {questionBanks.map((qb) => (
                      <label
                        key={qb.id}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuestionBanks.includes(qb.id)}
                          onChange={() => handleQuestionBankSelection(qb.id)}
                          className="text-brand-navy rounded"
                        />
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: qb.color }}
                          ></div>
                          <span className="text-sm text-gray-900">
                            {qb.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            ({qb.questionCount} questions)
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex space-x-4">
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ALL">All Types</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True/False</option>
                </select>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>
            <div className="p-6 max-h-[calc(100vh-420px)] min-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading questions...</p>
                </div>
              ) : filteredAvailableQuestions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No available questions</p>
                  <p className="text-sm text-gray-500 mt-1">
                    All questions have been added to the exam
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAvailableQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => addQuestionToExam(question)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2 flex-wrap gap-y-1">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                question.type === "MULTIPLE_CHOICE"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-green-100 text-green-800"
                              }`}
                            >
                              {question.type.replace("_", " ")}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {question.points} pts
                              {question.negativePoints != null &&
                                question.negativePoints !== 0 && (
                                  <span className="ml-2 text-red-500">
                                    ({question.negativePoints} points)
                                  </span>
                                )}
                            </span>
                            {question.difficulty && (
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  question.difficulty === "EASY"
                                    ? "bg-green-100 text-green-800"
                                    : question.difficulty === "MEDIUM"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {question.difficulty}
                              </span>
                            )}
                            {/* Question Bank indicator */}
                            {(() => {
                              const qb = questionBanks.find(
                                (bank) => bank.id === question.questionBankId
                              );
                              if (qb) {
                                return (
                                  <div className="flex items-center space-x-1">
                                    <div
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: qb.color }}
                                    ></div>
                                    <span className="text-xs text-gray-500">
                                      {qb.name}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <p className="text-gray-900 font-medium text-sm">
                            {question.text}
                          </p>
                        </div>
                        <button className="text-brand-navy hover:text-navy-800 text-sm font-medium">
                          Add +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteExamModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteExam}
        examName={examName}
      />
    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title={mode === "edit" ? "Edit Exam" : "Create Exam"}
      description="Build your exam by selecting and organizing questions"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="exams">
      {content}
    </CourseLayout>
  );
}

export default function ExamPlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ExamPlaygroundContent />
    </Suspense>
  );
}
