"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CourseLayout from "../../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../../components/layouts/SimpleLayout";
import { QuestionType } from "../../../../../types/course";
import ConfirmationModal from "../../../../../components/shared/ConfirmationModal";

// Add a stable key field as the React component identifier
interface TemplateSection {
  id: string;
  key: string;
  name: string;
  type: QuestionType;
  start: number | string; // Allow string for editing (empty values)
  end: number | string; // Allow string for editing (empty values)
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

export default function TemplatePlaygroundPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const mode = "create";

  // Color options
  const colorOptions = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#84cc16", // lime
    "#f97316", // orange
    "#ec4899", // pink
    "#6366f1", // indigo
  ];

  // Basic information of the template
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateColor, setTemplateColor] = useState("#3b82f6");
  const [sections, setSections] = useState<TemplateSection[]>([]);

  // Modal box state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);

  const totalQuestions =
    sections.length > 0
      ? sections.reduce((max, section) => {
          // Only count sections with valid numeric end values
          if (typeof section.end === "number" && section.end > 0) {
            return Math.max(max, section.end);
          }
          return max;
        }, 0)
      : 0;

  useEffect(() => {
    if (status === "authenticated") {
      fetchCourse();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, courseId, router]);
      
  // When initializing the page, load the draft data stored locally
  useEffect(() => {
    if (status !== "authenticated") return;

    const loadDraftData = () => {
      const savedTemplate = localStorage.getItem(`templateDraft_${courseId}`);
      if (savedTemplate) {
        try {
          const parsedTemplate = JSON.parse(savedTemplate);
          setTemplateName(parsedTemplate.name || "");
          setTemplateDescription(parsedTemplate.description || "");
          setTemplateColor(parsedTemplate.color || "#3b82f6");

          if (parsedTemplate.sections && parsedTemplate.sections.length > 0) {
            const sectionsWithKey = parsedTemplate.sections.map((s: any) => ({
              ...s,
              key: s.key || crypto.randomUUID(),
            }));

            // Ensure loaded sections are consecutive
            setTimeout(() => {
              recalculateRanges(sectionsWithKey);
            }, 0);
          } else {
            // Start with empty sections - let user create from scratch
            setSections([]);
          }
        } catch (error) {
          console.error("Failed to load template draft:", error);
          // Start with empty sections - let user create from scratch
          setSections([]);
        }
      } else {
        // Start with empty sections - let user create from scratch
        setSections([]);
      }
    };

    // Load draft data for create mode
    console.log("🔍 PLAYGROUND: Create mode - loading draft data");
    loadDraftData();
  }, [status, courseId]);

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

  // Clean up draft data for this course
  const clearDraft = () => {
    localStorage.removeItem(`templateDraft_${courseId}`);
  };

  // Move section up
  const moveSectionUp = (index: number) => {
    if (index === 0) return; // Can't move first section up

    const newSections = [...sections];
    // Swap with previous section
    [newSections[index - 1], newSections[index]] = [
      newSections[index],
      newSections[index - 1],
    ];

    // Recalculate consecutive question ranges
    recalculateRanges(newSections);
  };

  // Move section down
  const moveSectionDown = (index: number) => {
    if (index === sections.length - 1) return; // Can't move last section down

    const newSections = [...sections];
    // Swap with next section
    [newSections[index + 1], newSections[index]] = [
      newSections[index],
      newSections[index + 1],
    ];

    // Recalculate consecutive question ranges
    recalculateRanges(newSections);
  };

  // Add chapters
  const handleAddSection = () => {
    const lastEnd =
      sections.length > 0
        ? Math.max(
            ...sections.map((s) => (typeof s.end === "number" ? s.end : 0))
          )
        : 0;
    const newSectionName = `Section ${sections.length + 1}`;

    const newSection: TemplateSection = {
      id: newSectionName,
      key: crypto.randomUUID(),
      name: newSectionName,
      type: QuestionType.MULTIPLE_CHOICE,
      start: lastEnd + 1,
      end: lastEnd + 5, // Default to 5 questions per section
    };

    const updatedSections = [...sections, newSection];
    // Ensure consecutive ranges after adding
    recalculateRanges(updatedSections);
  };

  // Remove chapter
  const handleRemoveSection = (id: string) => {
    if (sections.length <= 1) {
      toast.error("You must have at least one section");
      return;
    }

    setSectionToDelete(id);
    setShowDeleteModal(true);
  };

  // Confirm deletion of chapters
  const confirmDeleteSection = () => {
    if (!sectionToDelete) return;

    const newSections = sections.filter((s) => s.id !== sectionToDelete);

    // Recalculate consecutive question ranges
    recalculateRanges(newSections);

    setShowDeleteModal(false);
    setSectionToDelete(null);
  };

  // Recalculate all section ranges to ensure they're consecutive
  const recalculateRanges = (sectionsToUpdate: TemplateSection[]) => {
    let currentStart = 1;
    const updatedSections = sectionsToUpdate.map((section) => {
      const sectionLength =
        typeof section.end === "number" && typeof section.start === "number"
          ? section.end - section.start + 1
          : 5; // Default length if invalid

      const updatedSection = {
        ...section,
        start: currentStart,
        end: currentStart + sectionLength - 1,
      };

      currentStart = updatedSection.end + 1;
      return updatedSection;
    });

    setSections(updatedSections);
  };

  // Chapter information change
  const handleSectionChange = (id: string, field: string, value: any) => {
    setSections((prevSections) => {
      const updatedSections = prevSections.map((section) => {
        if (section.id !== id) return section;

        if (field === "name") {
          return { ...section, id: value, name: value };
        }

        if (field === "type") {
          return { ...section, [field]: value };
        }

        if (field === "end") {
          // Only allow editing the end value
          if (
            value === "" ||
            (typeof value === "number" &&
              typeof section.start === "number" &&
              value >= section.start)
          ) {
            const updatedSection = { ...section, [field]: value };

            // After updating this section's end, recalculate subsequent sections
            const sectionIndex = prevSections.findIndex((s) => s.id === id);
            const newSections = [...prevSections];
            newSections[sectionIndex] = updatedSection;

            // Update subsequent sections to maintain consecutive ranges
            for (let i = sectionIndex + 1; i < newSections.length; i++) {
              const prevSection = newSections[i - 1];
              const currentSection = newSections[i];

              if (typeof prevSection.end === "number") {
                const currentLength =
                  typeof currentSection.end === "number" &&
                  typeof currentSection.start === "number"
                    ? currentSection.end - currentSection.start + 1
                    : 5;

                newSections[i] = {
                  ...currentSection,
                  start: prevSection.end + 1,
                  end: prevSection.end + currentLength,
                };
              }
            }

            return updatedSection;
          }
          return section;
        }

        return section;
      });

      // Return the full updated sections array to trigger the recalculation
      if (field === "end") {
        const targetIndex = updatedSections.findIndex((s) => s.id === id);
        const result = [...updatedSections];

        // Ensure consecutive ranges for all subsequent sections
        for (let i = targetIndex + 1; i < result.length; i++) {
          const prevSection = result[i - 1];
          const currentSection = result[i];

          if (typeof prevSection.end === "number") {
            const currentLength =
              typeof currentSection.end === "number" &&
              typeof currentSection.start === "number"
                ? currentSection.end - currentSection.start + 1
                : 5;

            result[i] = {
              ...currentSection,
              start: prevSection.end + 1,
              end: prevSection.end + currentLength,
            };
          }
        }

        return result;
      }

      return updatedSections;
    });
  };

  // next step
  const handleNextStep = () => {
    // Verify template information
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (sections.length === 0) {
      toast.error("Please add at least one section");
      return;
    }

    // Sort sections by start number to validate consecutive order
    const sortedSections = [...sections].sort((a, b) => {
      const startA = typeof a.start === "number" ? a.start : 0;
      const startB = typeof b.start === "number" ? b.start : 0;
      return startA - startB;
    });

    for (let i = 0; i < sortedSections.length; i++) {
      const section = sortedSections[i];

      // Check for empty or invalid values
      if (
        section.start === "" ||
        section.end === "" ||
        typeof section.start !== "number" ||
        typeof section.end !== "number"
      ) {
        toast.error(`Section "${section.name}" has incomplete question range`);
        return;
      }

      // First section must start at 1
      if (i === 0 && section.start !== 1) {
        toast.error("First section must start at question 1");
        return;
      }

      // Sections must be consecutive (no gaps)
      if (i > 0) {
        const previousSection = sortedSections[i - 1];
        if (
          typeof previousSection.end === "number" &&
          section.start !== previousSection.end + 1
        ) {
          toast.error(
            `Section "${
              section.name
            }" must start immediately after the previous section (expected ${
              previousSection.end + 1
            }, got ${section.start})`
          );
          return;
        }
      }

      if (section.start < 1 || section.end < 1) {
        toast.error(
          `Section "${section.name}" must have question numbers starting from 1`
        );
        return;
      }

      if (section.start > section.end) {
        toast.error(
          `Section "${section.name}" has invalid question range (start cannot be greater than end)`
        );
        return;
      }
    }

    // Save the current template information to local storage
    // Preserve existing questions from localStorage if available
    const existingTemplate = localStorage.getItem(`templateDraft_${courseId}`);
    let existingQuestions = [];
    if (existingTemplate) {
      try {
        const parsed = JSON.parse(existingTemplate);
        existingQuestions = parsed.questions || [];
      } catch (e) {
        console.error("Error parsing existing template:", e);
      }
    }

    const templateData = {
      name: templateName,
      description: templateDescription,
      color: templateColor,
      courseId,
      sections: sortedSections, // Use sorted sections to ensure proper order
      totalQuestions,
      questions: existingQuestions, // Preserve existing questions
    };

    localStorage.setItem(
      `templateDraft_${courseId}`,
      JSON.stringify(templateData)
    );

    // Navigate to the next step
    const queryParams = new URLSearchParams();
    if (isSidebarAccess) queryParams.set("sidebar", "true");

    router.push(
      `/course/${courseId}/templates/playground/questionSelection${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`
    );
  };

  // Loading status processing
  if (status === "loading") {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Create Template"
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

  const content = (
    <div className="max-w-6xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center mb-8">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-brand-navy text-white flex items-center justify-center font-medium">
            1
          </div>
          <div className="ml-2 text-sm font-medium text-brand-navy">
            Define Structure
          </div>
        </div>
        <div className="mx-4 h-0.5 w-12 bg-gray-200"></div>
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium">
            2
          </div>
          <div className="ml-2 text-sm font-medium text-gray-500">
            Question Selection
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

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Create New Template
        </h1>
        <p className="text-gray-600 mt-2">
          Define the basic structure of your exam template
        </p>
      </div>

      {/* basic information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
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
                  aria-label={`Select ${color} as template color`}
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

      {/* exam structure */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Exam Structure
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Total Questions: {totalQuestions}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {sections.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No sections yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first section to start building your exam template
              </p>
              <button
                onClick={handleAddSection}
                className="inline-flex items-center px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800 transition-colors font-medium"
              >
                <svg
                  className="w-5 h-5 mr-2"
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
                Add Your First Section
              </button>
            </div>
          ) : (
            sections.map((section, index) => (
              <div
                key={section.key}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-gray-900">
                    {section.name || `Section ${sections.indexOf(section) + 1}`}
                  </h3>
                  <div className="flex items-center space-x-3">
                    {/* Up Arrow Button */}
                    <button
                      onClick={() => moveSectionUp(index)}
                      disabled={index === 0}
                      className={`p-1 rounded ${
                        index === 0
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      aria-label="Move section up"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>

                    {/* Down Arrow Button */}
                    <button
                      onClick={() => moveSectionDown(index)}
                      disabled={index === sections.length - 1}
                      className={`p-1 rounded ${
                        index === sections.length - 1
                          ? "text-gray-300 cursor-not-allowed"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                      aria-label="Move section down"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleRemoveSection(section.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                      Questions Range
                    </label>
                    <div className="flex space-x-2">
                      <div className="relative">
                        <input
                          type="text"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
                          value={section.start}
                          placeholder="1"
                          aria-label="Start question number (auto-calculated)"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg
                            className="w-4 h-4 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                      </div>
                      <span className="flex items-center px-2 text-gray-500">
                        to
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy bg-white"
                          value={
                            section.end === null || section.end === undefined
                              ? ""
                              : section.end
                          }
                          onChange={(e) => {
                            const value =
                              e.target.value === ""
                                ? ""
                                : parseInt(e.target.value);
                            handleSectionChange(section.id, "end", value);
                          }}
                          onBlur={(e) => {
                            // Validate when user finishes editing
                            const value = e.target.value.trim();
                            const startValue =
                              typeof section.start === "number"
                                ? section.start
                                : 1;
                            if (value === "" || parseInt(value) < startValue) {
                              handleSectionChange(
                                section.id,
                                "end",
                                startValue
                              );
                            }
                          }}
                          placeholder={`${
                            typeof section.start === "number"
                              ? section.start + 4
                              : 5
                          }`}
                          aria-label="End question number (editable)"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Auto-calculated</span>
                      <span>Editable</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}

          {sections.length > 0 && (
            <button
              onClick={handleAddSection}
              className="flex items-center text-brand-navy font-medium mt-4 hover:text-navy-800 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Another Section
            </button>
          )}
        </div>
      </div>

      {/* preview area */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Template Preview
        </h2>

        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
          <div className="flex items-center mb-4">
            <div
              className="w-4 h-4 rounded-full mr-3"
              style={{ backgroundColor: templateColor }}
            ></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {templateName || "Untitled Template"}
              </h3>
            </div>
          </div>

          {templateDescription && (
            <p className="text-gray-600 mb-6">{templateDescription}</p>
          )}

          <div className="space-y-4">
            {sections.map((section) => (
              <div
                key={section.id}
                className="border-l-4 border-brand-navy pl-4 py-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {section.name}
                    </h4>
                  </div>
                  <div className="text-sm text-gray-500">
                    {typeof section.start === "number" &&
                    typeof section.end === "number"
                      ? `${section.end - section.start + 1} questions`
                      : "Questions: TBD"}
                  </div>
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  <span>
                    Questions{" "}
                    {typeof section.start === "number" &&
                    typeof section.end === "number"
                      ? `${section.start}-${section.end}`
                      : "Range: TBD"}
                  </span>
                  <span className="mx-2">•</span>
                  <span>{section.type.replace("_", " ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* operating button */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={() => {
            clearDraft();
            router.push(
              `/course/${courseId}/templates${
                isSidebarAccess ? "?sidebar=true" : ""
              }`
            );
          }}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleNextStep}
          className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800 transition-colors font-medium"
        >
          Continue to Next Step
          <svg
            className="w-4 h-4 ml-2 inline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
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

      {/* Delete the confirmation mode box */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteSection}
        title="Delete Section"
        message="Are you sure you want to delete this section? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );

  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Create Template"
      description="Design a new exam template"
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={null} activeTab="templates">
      {content}
    </CourseLayout>
  );
}
