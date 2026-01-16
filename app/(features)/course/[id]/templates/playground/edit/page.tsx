"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseLayout from "../../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../../components/layouts/SimpleLayout";
import { QuestionType } from "../../../../../../types/course";
import QuestionSelectorModal from "../questionSelection/questionSelectorModal/questionSelectorModal";

// Color options for templates
const colorOptions = [
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#10b981", // Green
  "#f59e0b", // Yellow
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#84cc16", // Lime
  "#ec4899", // Pink
  "#6b7280", // Gray
];

interface TemplateSection {
  id: string;
  key: string;
  name: string;
  type: QuestionType;
  start: number | "";
  end: number | "";
}

interface QuestionConfig {
  id: string;
  questionNumber: number;
  type: QuestionType;
  selectionMode: "auto" | "manual";
  selectedQuestionId?: string;
  selectedQuestionData?: Question;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "";
  topic?: string;
  questionBankId?: string;
  questionBankName?: string;
  points?: number | "";
  sectionId: string;
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

interface QuestionBank {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

export default function CombinedTemplateEditor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const templateId = searchParams.get("templateId");
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const mode = templateId ? "edit" : "create";

  // Template basic info
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateColor, setTemplateColor] = useState("#3b82f6");
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [questions, setQuestions] = useState<QuestionConfig[]>([]);

  // Question banks and available questions
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [availableQuestions, setAvailableQuestions] = useState<Question[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showQuestionSelector, setShowQuestionSelector] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<
    number | null
  >(null);
  const [course, setCourse] = useState<Course | null>(null);

  // Initialize data
  useEffect(() => {
    if (status !== "authenticated") return;

    const initData = async () => {
      setLoading(true);
      try {
        if (templateId) {
          // Edit mode: fetch from API
          await fetchTemplateData();
        } else {
          // Create mode: start with default section
          addDefaultSection();
        }
        await fetchQuestionFilters();
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [status, courseId, templateId]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, router]);

  // Fetch existing template data
  const fetchTemplateData = async () => {
    if (!templateId) return;

    try {
      const response = await fetch(`/api/templates/${templateId}`);
      if (!response.ok) throw new Error("Template not found");

      const templateData = await response.json();

      // Set basic info
      setTemplateName(templateData.name);
      setTemplateDescription(templateData.description || "");
      setTemplateColor(templateData.color || "#3b82f6");

      // Set sections
      const processedSections = (templateData.sections || []).map(
        (section) => ({
          ...section,
          key: crypto.randomUUID(),
          start:
            typeof section.start === "number"
              ? section.start
              : parseInt(section.start) || 1,
          end:
            typeof section.end === "number"
              ? section.end
              : parseInt(section.end) || 1,
        })
      );
      setSections(processedSections);

      // Transform and set questions
      const transformedQuestions = (templateData.questions || []).map(
        (q: any) => ({
          id: q.id,
          questionNumber: q.questionNumber,
          type: q.type,
          selectionMode: q.isRequired ? "manual" : "auto",
          selectedQuestionId: q.selectedQuestionId,
          selectedQuestionData: q.question,
          difficulty: q.difficulty || "",
          topic: q.topic || "",
          questionBankId: q.questionBankId || "",
          questionBankName: q.question?.questionBankName || "",
          points: q.points || "",
          sectionId: q.sectionId,
        })
      );
      setQuestions(transformedQuestions);

      toast.success("Template loaded for editing");
    } catch (error) {
      console.error("Error loading template:", error);
      toast.error("Failed to load template");
      router.back();
    }
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

  // Fetch question filters and banks
  const fetchQuestionFilters = async () => {
    try {
      const response = await fetch(
        `/api/templates/question-filter?courseId=${courseId}`
      );
      if (!response.ok) throw new Error("Failed to fetch filters");

      const data = await response.json();
      setQuestionBanks(data.questionBanks || []);

      // Fetch questions from all banks
      if (data.questionBanks?.length > 0) {
        for (const bank of data.questionBanks) {
          await fetchQuestionsByBank(bank.id);
        }
      }
    } catch (error) {
      console.error("Error fetching filters:", error);
      toast.error("Failed to load question banks");
    }
  };

  // Fetch questions from a specific bank
  const fetchQuestionsByBank = async (bankId: string) => {
    if (!bankId || availableQuestions.some((q) => q.questionBankId === bankId))
      return;

    try {
      const response = await fetch(`/api/question-banks/${bankId}`);
      if (!response.ok) throw new Error("Failed to fetch questions");

      const bankData = await response.json();
      const safeQuestions = (bankData.questions || []).map((q: any) => ({
        ...q,
        topic: q.topic || "",
        questionBankName: bankData.name || "Unknown Bank",
      }));
      setAvailableQuestions((prev) => [...prev, ...safeQuestions]);
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  // Add default section for create mode
  const addDefaultSection = () => {
    const defaultSection: TemplateSection = {
      id: "Section 1",
      key: crypto.randomUUID(),
      name: "Section 1",
      type: QuestionType.MULTIPLE_CHOICE,
      start: 1,
      end: 5,
    };
    setSections([defaultSection]);
    updateQuestionsFromSections([defaultSection]);
  };

  // Smart question management - preserves existing configurations
  const updateQuestionsFromSections = (sectionsData: TemplateSection[]) => {
    const newQuestions: QuestionConfig[] = [];
    const existingQuestions = [...questions];

    sectionsData.forEach((section) => {
      const start = typeof section.start === "number" ? section.start : 1;
      const end = typeof section.end === "number" ? section.end : start;

      for (let i = start; i <= end; i++) {
        // Try to find existing question for this position
        const existingQuestion = existingQuestions.find(
          (q) => q.questionNumber === i
        );

        if (existingQuestion) {
          // Preserve existing configuration but update section info
          newQuestions.push({
            ...existingQuestion,
            questionNumber: i,
            type: section.type, // Update type if section type changed
            sectionId: section.id,
          });
        } else {
          // Create new question only if none exists
          newQuestions.push({
            id: crypto.randomUUID(),
            questionNumber: i,
            type: section.type,
            selectionMode: "auto",
            selectedQuestionId: undefined,
            difficulty: "",
            topic: "",
            questionBankId: "",
            points: "",
            sectionId: section.id,
          });
        }
      }
    });

    setQuestions(newQuestions);
  };

  // Add new section
  const handleAddSection = () => {
    const lastEnd =
      sections.length > 0
        ? Math.max(
            ...sections.map((s) => (typeof s.end === "number" ? s.end : 0))
          )
        : 0;

    const newSection: TemplateSection = {
      id: `Section ${sections.length + 1}`,
      key: crypto.randomUUID(),
      name: `Section ${sections.length + 1}`,
      type: QuestionType.MULTIPLE_CHOICE,
      start: lastEnd + 1,
      end: lastEnd + 5,
    };

    const updatedSections = [...sections, newSection];
    setSections(updatedSections);
    updateQuestionsFromSections(updatedSections);
  };

  // Remove section
  const handleRemoveSection = (sectionId: string) => {
    if (sections.length <= 1) {
      toast.error("You must have at least one section");
      return;
    }

    const updatedSections = sections.filter((s) => s.id !== sectionId);
    const recalculatedSections = recalculateRanges(updatedSections);
    setSections(recalculatedSections);
    updateQuestionsFromSections(recalculatedSections);
  };

  // Handle section changes
  const handleSectionChange = (
    sectionId: string,
    field: string,
    value: any
  ) => {
    setSections((prevSections) => {
      const updatedSections = prevSections.map((section) => {
        if (section.id !== sectionId) return section;

        if (field === "name") {
          return { ...section, id: value, name: value };
        }

        if (field === "type") {
          return { ...section, [field]: value };
        }

        if (field === "end") {
          if (
            value === "" ||
            (typeof value === "number" &&
              typeof section.start === "number" &&
              value >= section.start)
          ) {
            return { ...section, [field]: value };
          }
          return section;
        }

        return { ...section, [field]: value };
      });

      if (field === "end" || field === "type") {
        const recalculated = recalculateRanges(updatedSections);
        updateQuestionsFromSections(recalculated);
        return recalculated;
      }

      return updatedSections;
    });
  };

  // Recalculate section ranges
  const recalculateRanges = (sectionsToUpdate: TemplateSection[]) => {
    let currentStart = 1;
    return sectionsToUpdate.map((section) => {
      const sectionLength =
        typeof section.end === "number" && typeof section.start === "number"
          ? section.end - section.start + 1
          : 5;

      const updatedSection = {
        ...section,
        start: currentStart,
        end: currentStart + sectionLength - 1,
      };

      currentStart = updatedSection.end + 1;
      return updatedSection;
    });
  };

  // Handle question changes
  const handleQuestionChange = (index: number, field: string, value: any) => {
    const updatedQuestions = [...questions];
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    };
    setQuestions(updatedQuestions);
  };

  // Open question selector
  const openQuestionSelector = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowQuestionSelector(true);
  };

  // Handle question selection from modal
  const handleSelectQuestion = (question: Question) => {
    if (currentQuestionIndex === null) return;

    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex] = {
      ...updatedQuestions[currentQuestionIndex],
      selectedQuestionId: question.id,
      selectedQuestionData: question,
      difficulty: question.difficulty,
      topic: question.topic,
      questionBankId: question.questionBankId,
      questionBankName: question.questionBankName,
      points: question.points,
    };
    setQuestions(updatedQuestions);
    setShowQuestionSelector(false);
    setCurrentQuestionIndex(null);
  };

  // Save template
  const handleSaveTemplate = async () => {
    // Validation
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (sections.length === 0) {
      toast.error("Please add at least one section");
      return;
    }

    const incompleteQuestions = questions.filter(
      (q) => q.selectionMode === "manual" && !q.selectedQuestionId
    );

    if (incompleteQuestions.length > 0) {
      toast.error("Please select questions for all manual positions");
      return;
    }

    try {
      setSaving(true);

      const processedQuestions = questions.map((q) => ({
        id: q.id,
        questionNumber: q.questionNumber,
        type: q.type,
        isRequired: q.selectionMode === "manual",
        selectedQuestionId: q.selectedQuestionId,
        difficulty: q.difficulty || null,
        topic: q.topic || null,
        questionBankId: q.questionBankId || null,
        points: q.points === "" ? null : q.points,
        sectionId: q.sectionId,
      }));

      const templateToSave = {
        title: templateName,
        description: templateDescription || null,
        courseId: courseId,
        questions: processedQuestions,
        color: templateColor,
      };

      const url =
        mode === "edit" ? `/api/templates/${templateId}` : "/api/templates";
      const method = mode === "edit" ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templateToSave),
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.error || "Failed to save template");
      }

      toast.success(
        mode === "create"
          ? "Template created successfully"
          : "Template updated successfully"
      );

      // Navigate back to templates list
      router.push(
        `/course/${courseId}/templates${isSidebarAccess ? "?sidebar=true" : ""}`
      );
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save template"
      );
    } finally {
      setSaving(false);
    }
  };

  // Get question bank name
  const getQuestionBankName = (bankId: string) => {
    const bank = questionBanks.find((b) => b.id === bankId);
    return bank?.name || "Unknown Bank";
  };

  // Filter functions for auto mode
  const getFilteredQuestions = (questionType: QuestionType, filters: any) => {
    return availableQuestions.filter((q) => {
      if (q.type !== questionType) return false;
      if (filters.questionBankId && q.questionBankId !== filters.questionBankId)
        return false;
      if (filters.difficulty && q.difficulty !== filters.difficulty)
        return false;
      if (filters.topic && q.topic !== filters.topic) return false;
      if (filters.points && q.points !== filters.points) return false;
      return true;
    });
  };

  const getFilteredPoints = (questionType: QuestionType, filters: any) => {
    const compatibleQuestions = getFilteredQuestions(questionType, filters);
    return Array.from(new Set(compatibleQuestions.map((q) => q.points))).sort(
      (a, b) => a - b
    );
  };

  const getFilteredDifficulties = (
    questionType: QuestionType,
    filters: any
  ) => {
    const compatibleQuestions = getFilteredQuestions(questionType, filters);
    return Array.from(
      new Set(compatibleQuestions.map((q) => q.difficulty).filter(Boolean))
    );
  };

  const getFilteredTopics = (questionType: QuestionType, filters: any) => {
    const compatibleQuestions = getFilteredQuestions(questionType, filters);
    return Array.from(
      new Set(compatibleQuestions.map((q) => q.topic).filter(Boolean))
    );
  };

  const getFilteredQuestionBanks = (
    questionType: QuestionType,
    filters: any
  ) => {
    const compatibleQuestions = getFilteredQuestions(questionType, filters);
    const bankIds = Array.from(
      new Set(compatibleQuestions.map((q) => q.questionBankId))
    );
    return questionBanks.filter((bank) => bankIds.includes(bank.id));
  };

  // Get total questions count
  const totalQuestions = sections.reduce((max, section) => {
    if (typeof section.end === "number" && section.end > 0) {
      return Math.max(max, section.end);
    }
    return max;
  }, 0);

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title={mode === "edit" ? "Edit Template" : "Create Template"}
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

  if (!session) return null;

  const content = (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {mode === "edit" ? "Edit Template" : "Create New Template"}
        </h1>
        <p className="text-gray-600 mt-2">
          Define your exam template structure and configure questions all in one
          place
        </p>
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name *
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
              placeholder="e.g. Midterm Exam Template"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTemplateColor(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    templateColor === color
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
              placeholder="Describe the purpose of this template..."
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Exam Structure */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Exam Structure
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Total Questions: {totalQuestions}
            </span>
            <button
              onClick={handleAddSection}
              className="bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors text-sm"
            >
              Add Section
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {sections.map((section, index) => (
            <div
              key={section.key}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Section Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
                    value={section.name}
                    onChange={(e) =>
                      handleSectionChange(section.id, "name", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
                    value={section.type}
                    onChange={(e) =>
                      handleSectionChange(section.id, "type", e.target.value)
                    }
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="TRUE_FALSE">True/False</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Question #
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy"
                    value={section.end === "" ? "" : section.end}
                    onChange={(e) => {
                      const value =
                        e.target.value === "" ? "" : parseInt(e.target.value);
                      handleSectionChange(section.id, "end", value);
                    }}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Start: {section.start}
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => handleRemoveSection(section.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                    disabled={sections.length <= 1}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Question Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Question Configuration
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Q#
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Section
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Selection Mode
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Selected Question
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Question Bank
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Difficulty
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Topic
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Points
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {questions.map((question, index) => {
                const section = sections.find(
                  (s) => s.id === question.sectionId
                );
                return (
                  <tr key={question.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {question.questionNumber}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {section?.name || question.sectionId}
                    </td>
                    <td className="px-4 py-4">
                      <select
                        value={question.selectionMode}
                        onChange={(e) =>
                          handleQuestionChange(
                            index,
                            "selectionMode",
                            e.target.value
                          )
                        }
                        className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-navy"
                      >
                        <option value="auto">Auto-select</option>
                        <option value="manual">Manual selection</option>
                      </select>
                    </td>
                    <td className="px-4 py-4">
                      {question.selectionMode === "manual" ? (
                        question.selectedQuestionData ? (
                          <div className="space-y-1">
                            <div className="text-sm text-gray-900 p-2 bg-blue-50 rounded border">
                              {question.selectedQuestionData.text}
                            </div>
                            <button
                              onClick={() => openQuestionSelector(index)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Change Question
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => openQuestionSelector(index)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Select Question
                          </button>
                        )
                      ) : (
                        <span className="text-sm text-gray-500">
                          Auto-selected
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {question.selectionMode === "manual" ? (
                        <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                          {question.selectedQuestionData ? (
                            question.selectedQuestionData.questionBankName ||
                            question.questionBankName ||
                            getQuestionBankName(
                              question.questionBankId || ""
                            ) ||
                            ""
                          ) : (
                            <span className="text-gray-400 italic">
                              Select a question first
                            </span>
                          )}
                        </div>
                      ) : (
                        <select
                          value={question.questionBankId || ""}
                          onChange={(e) =>
                            handleQuestionChange(
                              index,
                              "questionBankId",
                              e.target.value
                            )
                          }
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-navy"
                        >
                          <option value="">All Banks</option>
                          {getFilteredQuestionBanks(question.type, {
                            difficulty: question.difficulty || undefined,
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
                    <td className="px-4 py-4">
                      {question.selectionMode === "manual" ? (
                        <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                          {question.selectedQuestionData ? (
                            question.selectedQuestionData.difficulty ||
                            question.difficulty ||
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
                              index,
                              "difficulty",
                              e.target.value
                            )
                          }
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-navy"
                        >
                          <option value="">All Difficulties</option>
                          {getFilteredDifficulties(question.type, {
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
                    <td className="px-4 py-4">
                      {question.selectionMode === "manual" ? (
                        <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                          {question.selectedQuestionData ? (
                            question.selectedQuestionData.topic ||
                            question.topic ||
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
                            handleQuestionChange(index, "topic", e.target.value)
                          }
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-navy"
                        >
                          <option value="">All Topics</option>
                          {getFilteredTopics(question.type, {
                            questionBankId:
                              question.questionBankId || undefined,
                            difficulty: question.difficulty || undefined,
                            points: question.points || undefined,
                          }).map((topic) => (
                            <option key={topic} value={topic}>
                              {topic}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {question.selectionMode === "manual" ? (
                        <div className="text-sm bg-gray-50 p-1.5 rounded border border-gray-200">
                          {question.selectedQuestionData ? (
                            question.selectedQuestionData.points ||
                            question.points ||
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
                          onChange={(e) => {
                            const value = e.target.value
                              ? parseInt(e.target.value)
                              : "";
                            handleQuestionChange(index, "points", value);
                          }}
                          className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-navy"
                        >
                          <option value="">All Points</option>
                          {getFilteredPoints(question.type, {
                            questionBankId:
                              question.questionBankId || undefined,
                            difficulty: question.difficulty || undefined,
                            topic: question.topic || undefined,
                          }).map((point) => (
                            <option key={point} value={point}>
                              {point}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() =>
            router.push(
              `/course/${courseId}/templates${
                isSidebarAccess ? "?sidebar=true" : ""
              }`
            )
          }
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveTemplate}
          disabled={saving || !templateName.trim() || sections.length === 0}
          className={`px-6 py-2 rounded-lg transition-colors font-medium flex items-center ${
            saving || !templateName.trim() || sections.length === 0
              ? "bg-gray-400 cursor-not-allowed text-white"
              : "bg-brand-navy hover:bg-navy-800 text-white"
          }`}
        >
          {saving ? (
            <>
              <svg
                className="w-4 h-4 mr-2 animate-spin"
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
              Saving...
            </>
          ) : mode === "edit" ? (
            "Save Changes"
          ) : (
            "Create Template"
          )}
        </button>
      </div>

      {/* Question Selector Modal */}
      <QuestionSelectorModal
        isOpen={showQuestionSelector}
        questionType={
          currentQuestionIndex !== null
            ? questions[currentQuestionIndex].type
            : QuestionType.MULTIPLE_CHOICE
        }
        availableQuestions={availableQuestions}
        questionBanks={questionBanks}
        availableDifficulties={Array.from(
          new Set(availableQuestions.map((q) => q.difficulty))
        )}
        availableTags={Array.from(
          new Set(availableQuestions.map((q) => q.topic).filter(Boolean))
        )}
        availablePoints={Array.from(
          new Set(availableQuestions.map((q) => q.points))
        ).sort((a, b) => a - b)}
        onSelectQuestion={handleSelectQuestion}
        onClose={() => {
          setShowQuestionSelector(false);
          setCurrentQuestionIndex(null);
        }}
      />
    </div>
  );

  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title={mode === "edit" ? "Edit Template" : "Create Template"}
      description="Design your exam template"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={null} activeTab="templates">
      {content}
    </CourseLayout>
  );
}
