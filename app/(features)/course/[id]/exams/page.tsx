"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { Document, Paragraph, TextRun, Packer } from "docx";
import CourseLayout from "../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../components/layouts/SimpleLayout";
import ConfirmationModal from "../../../../components/shared/ConfirmationModal";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface ExamQuestion {
  id: string;
  text: string;
  type: string;
  options: string[];
  correctAnswer: string;
  points: number;
  negativePoints?: number | null;
  difficulty?: string;
  topic?: string;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  timeLimit: number;
  questionCount: number;
  createdAt: string;
  term?: {
    term: string;
    year: number;
  } | null;
  section?: string;
}

export default function CourseExamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.id as string;
  const isSidebarAccess = searchParams.get("sidebar") === "true";
  const [course, setCourse] = useState<Course | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [examToDelete, setExamToDelete] = useState<string | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([]);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchExams();
      fetchTerms();
    }
  }, [courseId]);

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
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/exams`);
      if (response.ok) {
        const examsData = await response.json();
        setExams(examsData);
      } else {
        console.error("Failed to fetch exams");
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  const fetchTerms = async () => {
    try {
      const response = await fetch("/api/terms");
      if (response.ok) {
        const termsData = await response.json();
        setTerms(termsData);
      } else {
        console.error("Failed to fetch terms");
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      const response = await fetch(`/api/exams/${examToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Exam deleted successfully!");
        fetchExams(); // Refresh the list
      } else {
        toast.error("Failed to delete exam");
      }
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam");
    } finally {
      setDeleteModalOpen(false);
      setExamToDelete(null);
    }
  };

  const openDeleteModal = (examId: string) => {
    setExamToDelete(examId);
    setDeleteModalOpen(true);
  };

  const openExportModal = () => {
    setSelectedExamIds([]);
    setExportModalOpen(true);
  };

  const handleSelectAllExams = () => {
    setSelectedExamIds(filteredExams.map(exam => exam.id));
  };

  const handleDeselectAllExams = () => {
    setSelectedExamIds([]);
  };

  const handleExamToggle = (examId: string) => {
    setSelectedExamIds(prev => 
      prev.includes(examId) 
        ? prev.filter(id => id !== examId)
        : [...prev, examId]
    );
  };

  const handleExportConfirm = () => {
    exportExamsToDocx(selectedExamIds);
  };

  const exportExamsToDocx = async (examIds: string[]) => {
    if (examIds.length === 0) {
      toast.error("No exams selected for export");
      return;
    }

    try {
      const loadingToast = toast.loading("Generating DOCX export...");
      
      // Fetch detailed exam data including questions for selected exams
      const examPromises = examIds.map(async (examId) => {
        const response = await fetch(`/api/exams/${examId}`);
        if (response.ok) {
          return await response.json();
        }
        return null;
      });

      const detailedExams = (await Promise.all(examPromises)).filter(Boolean);
      
      if (detailedExams.length === 0) {
        toast.dismiss(loadingToast);
        toast.error("Failed to fetch exam details");
        return;
      }

      // Create document content
      const docContent: any[] = [];

      // Add title
      docContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${course?.name || 'Course'} - Exam Export`,
              bold: true,
              size: 32, // 16pt
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Add export date
      docContent.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Exported on: ${new Date().toLocaleDateString()}`,
              size: 24, // 12pt
            }),
          ],
          spacing: { after: 400 },
        })
      );

      // Add each exam
      for (const exam of detailedExams) {
        // Exam header
        docContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `EXAM: ${exam.title}`,
                bold: true,
                size: 28, // 14pt
              }),
            ],
            spacing: { before: 400, after: 200 },
          })
        );

        // Exam details
        const examDetails: string[] = [];
        if (exam.description) {
          examDetails.push(`Description: ${exam.description}`);
        }
        if (exam.term) {
          examDetails.push(`Term: ${exam.term.term}, ${exam.term.year}`);
        }
        if (exam.section) {
          examDetails.push(`Section: ${exam.section}`);
        }
        if (exam.timeLimit) {
          examDetails.push(`Time Limit: ${exam.timeLimit} minutes`);
        }
        examDetails.push(`Total Questions: ${exam.questions?.length || 0}`);
        examDetails.push(`Created: ${new Date(exam.createdAt).toLocaleDateString()}`);

        docContent.push(
          new Paragraph({
            children: [
              new TextRun({
                text: examDetails.join(' | '),
                size: 22, // 11pt
              }),
            ],
            spacing: { after: 300 },
          })
        );

        // Add questions
        if (exam.questions && exam.questions.length > 0) {
          for (let i = 0; i < exam.questions.length; i++) {
            const question = exam.questions[i];
            
            // Question text
            docContent.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${i + 1}. ${question.text}`,
                    size: 24, // 12pt
                  }),
                ],
                spacing: { before: 200, after: 100 },
              })
            );

            // Options for multiple choice
            if (question.type === "MULTIPLE_CHOICE" && question.options && question.options.length > 0) {
              for (let j = 0; j < question.options.length; j++) {
                const optionLetter = String.fromCharCode(65 + j); // A, B, C, D...
                docContent.push(
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `${optionLetter}. ${question.options[j]}`,
                        size: 24, // 12pt
                      }),
                    ],
                    spacing: { after: 50 },
                  })
                );
              }
            }

            // Answer
            let answerText = "";
            if (question.type === "MULTIPLE_CHOICE" && question.options && question.options.length > 0) {
              const answerIndex = question.options.findIndex(
                (option: string) => option === question.correctAnswer
              );
              if (answerIndex !== -1) {
                const answerLetter = String.fromCharCode(65 + answerIndex); // A, B, C, D...
                answerText = answerLetter;
              } else {
                answerText = question.correctAnswer;
              }
            } else if (question.type === "TRUE_FALSE") {
              answerText = question.correctAnswer;
            } else {
              answerText = question.correctAnswer;
            }

            docContent.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Answer: ${answerText}`,
                    size: 24, // 12pt
                    bold: true,
                  }),
                ],
                spacing: { after: 50 },
              })
            );

            // Points
            docContent.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Point: ${question.points}`,
                    size: 24, // 12pt
                  }),
                ],
                spacing: { after: 50 },
              })
            );

            // Negative points if present
            if (question.negativePoints !== null && question.negativePoints !== undefined) {
              docContent.push(
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `Negative Point: ${question.negativePoints}`,
                      size: 24, // 12pt
                    }),
                  ],
                  spacing: { after: 100 },
                })
              );
            }

            // Add spacing between questions
            if (i < exam.questions.length - 1) {
              docContent.push(
                new Paragraph({
                  children: [new TextRun({ text: "" })],
                  spacing: { after: 200 },
                })
              );
            }
          }
        } else {
          docContent.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "No questions found in this exam.",
                  italics: true,
                  size: 24, // 12pt
                }),
              ],
              spacing: { after: 200 },
            })
          );
        }

        // Add separator between exams
        if (detailedExams.indexOf(exam) < detailedExams.length - 1) {
          docContent.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: "═".repeat(60),
                  size: 24,
                }),
              ],
              spacing: { before: 400, after: 400 },
            })
          );
        }
      }

      // Create document
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: docContent,
          },
        ],
      });

      // Generate and download file
      const buffer = await Packer.toBuffer(doc);
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      
      // Generate filename with course name and date
      const filename = `${course?.name.replace(/[^a-z0-9]/gi, '_')}_exams_${new Date().toISOString().split('T')[0]}.docx`;
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.dismiss(loadingToast);
      toast.success(`Exported ${detailedExams.length} exam${detailedExams.length !== 1 ? 's' : ''} to DOCX`);
      
      // Close modal after successful export
      setExportModalOpen(false);
      setSelectedExamIds([]);
      
    } catch (error) {
      console.error("Error exporting to DOCX:", error);
      toast.error("Failed to export exams");
    }
  };

  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Exam Builder"
        description="Create and manage custom exams from your courses"
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

  // Filter exams based on selected term, year, and section
  const filteredExams = exams.filter((exam) => {
    const termMatches = !selectedTerm || exam.term?.term === selectedTerm;
    const yearMatches =
      !selectedYear || exam.term?.year.toString() === selectedYear;
    const sectionMatches = !selectedSection || exam.section === selectedSection;
    return termMatches && yearMatches && sectionMatches;
  });

  // Get unique terms and years from available terms (from API)
  const uniqueTerms = Array.from(new Set(terms.map((term) => term.term)));
  const uniqueYears = Array.from(new Set(terms.map((term) => term.year))).sort(
    (a, b) => b - a
  );
  
  // Get unique sections from exams data
  const uniqueSections = Array.from(new Set(exams.map((exam) => exam.section).filter(Boolean))).sort();

  const content = (
    <>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
            <p className="text-gray-600 mt-2">
              Create and manage exams for your course
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {exams.length > 0 && (
              <button
                onClick={openExportModal}
                className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center space-x-2"
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
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Export DOCX</span>
              </button>
            )}
            <button
              onClick={() => {
                const playgroundUrl = `/course/${courseId}/exams/playground${
                  isSidebarAccess ? "?sidebar=true" : ""
                }`;
                router.push(playgroundUrl);
              }}
              className="bg-brand-navy text-white px-6 py-3 rounded-lg hover:bg-navy-800 transition-colors font-medium flex items-center space-x-2"
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
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <span>Create Exam</span>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {exams.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Filter Exams
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Term
                </label>
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                >
                  <option value="">All Terms</option>
                  {uniqueTerms.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                >
                  <option value="">All Years</option>
                  {uniqueYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section
                </label>
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end space-x-2">
                <button
                  onClick={() => {
                    setSelectedTerm("");
                    setSelectedYear("");
                    setSelectedSection("");
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
                {filteredExams.length > 0 && filteredExams.length < exams.length && (
                  <button
                    onClick={openExportModal}
                    className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center space-x-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Export Filtered</span>
                  </button>
                )}
              </div>
            </div>
            {(selectedTerm || selectedYear) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  Showing {filteredExams.length} exam
                  {filteredExams.length !== 1 ? "s" : ""}
                  {selectedTerm && ` for ${selectedTerm}`}
                  {selectedYear && ` in ${selectedYear}`}
                  {filteredExams.length < exams.length && (
                    <>
                      {" "}
                      •{" "}
                      <span className="text-blue-600">
                        {exams.length - filteredExams.length} filtered out
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Exams Grid */}
        {filteredExams.length === 0 && exams.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
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
              No exams created yet
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first exam
            </p>
            <button
              onClick={() => {
                const playgroundUrl = `/course/${courseId}/exams/playground${
                  isSidebarAccess ? "?sidebar=true" : ""
                }`;
                router.push(playgroundUrl);
              }}
              className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
            >
              Create Your First Exam
            </button>
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-12 h-12 text-gray-400"
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
              No exams match your filters
            </h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or create a new exam
            </p>
            <button
              onClick={() => {
                setSelectedTerm("");
                setSelectedYear("");
                setSelectedSection("");
              }}
              className="bg-brand-navy text-white px-6 py-2 rounded-lg hover:bg-navy-800 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => (
              <div
                key={exam.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors flex flex-col h-full"
              >
                <div className="p-6 flex flex-col h-full">
                  {/* Header with exam icon */}
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-4 h-4 text-orange-600"
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
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                        {exam.title}
                      </h3>
                      {exam.term && (
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                          {exam.term.term}, {exam.term.year}
                          {exam.section && `, Section ${exam.section}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Content area - grows to fill space */}
                  <div className="flex-1 flex flex-col">
                    {/* Fixed height area for description */}
                    <div className="h-12 mb-4">
                      {exam.description && (
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {exam.description}
                        </p>
                      )}
                    </div>

                    {/* Stats area */}
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>
                        {exam.questionCount} question
                        {exam.questionCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Created date */}
                    <div className="text-xs text-gray-400 mb-4">
                      Created {new Date(exam.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Buttons area - always at bottom */}
                  <div className="flex space-x-2 mt-auto">
                    <button
                      onClick={() => {
                        const editUrl = `/course/${courseId}/exams/playground?examId=${
                          exam.id
                        }${isSidebarAccess ? "&sidebar=true" : ""}`;
                        router.push(editUrl);
                      }}
                      className="flex-1 bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        // Check if exam has any generated variants
                        try {
                          const response = await fetch(`/api/exams/${exam.id}/generations`);
                          if (response.ok) {
                            const generations = await response.json();
                            if (generations && generations.length > 0) {
                              // Has generations, navigate to similarity page
                              const similarityUrl = `/course/${courseId}/exams/similarity?examId=${
                                exam.id
                              }${isSidebarAccess ? "&sidebar=true" : ""}`;
                              router.push(similarityUrl);
                            } else {
                              // No generations, show toast
                              toast.error("No similarity report is available. Generate exam variants to view similarity.");
                            }
                          } else {
                            // API error, show toast
                            toast.error("No similarity report is available. Generate exam variants to view similarity.");
                          }
                        } catch (error) {
                          console.error("Error checking exam generations:", error);
                          toast.error("No similarity report is available. Generate exam variants to view similarity.");
                        }
                      }}
                      className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      Similarity
                    </button>
                    <button
                      onClick={() => {
                        const viewUrl = `/course/${courseId}/exams/view?examId=${
                          exam.id
                        }${isSidebarAccess ? "&sidebar=true" : ""}`;
                        router.push(viewUrl);
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

             {/* Export Selection Modal */}
       {exportModalOpen && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-gray-900">Export Exams</h3>
               <button
                 onClick={() => setExportModalOpen(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                 </svg>
               </button>
             </div>
             
             <p className="text-gray-600 mb-4">
               Select which exams you want to export. You can select all or specific exams.
             </p>
             
             <div className="space-y-4 mb-6">
               <div className="flex items-center justify-between">
                 <div className="flex items-center">
                   <input
                     type="checkbox"
                     id="selectAll"
                     checked={selectedExamIds.length === filteredExams.length && filteredExams.length > 0}
                     onChange={selectedExamIds.length === filteredExams.length ? handleDeselectAllExams : handleSelectAllExams}
                     className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                   />
                   <label htmlFor="selectAll" className="text-sm font-medium text-gray-700">
                     Select All ({filteredExams.length} exams)
                   </label>
                 </div>
                 {selectedExamIds.length > 0 && (
                   <span className="text-sm text-blue-600">
                     {selectedExamIds.length} selected
                   </span>
                 )}
               </div>
               
                               <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3 space-y-2" data-testid="exam-list">
                 {filteredExams.map((exam) => (
                   <div key={exam.id} className="flex items-start space-x-2">
                     <input
                       type="checkbox"
                       id={`exam-${exam.id}`}
                       checked={selectedExamIds.includes(exam.id)}
                       onChange={() => handleExamToggle(exam.id)}
                       className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                     />
                     <div className="flex-1 min-w-0">
                       <label htmlFor={`exam-${exam.id}`} className="text-sm text-gray-700 cursor-pointer">
                         <div className="font-medium">{exam.title}</div>
                         <div className="text-gray-500 text-xs">
                           {exam.questionCount} questions
                           {exam.term && ` • ${exam.term.term} ${exam.term.year}`}
                           {exam.section && ` • Section ${exam.section}`}
                         </div>
                       </label>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
             
             <div className="flex items-center justify-end space-x-3">
               <button
                 onClick={() => setExportModalOpen(false)}
                 className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={handleExportConfirm}
                 disabled={selectedExamIds.length === 0}
                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
               >
                 Export Selected ({selectedExamIds.length})
               </button>
             </div>
           </div>
         </div>
       )}
    </>
  );

  // Use SimpleLayout for sidebar access, CourseLayout for course navigation
  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Exam Builder"
      description="Create and manage custom exams from your courses"
      loading={!course}
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="exams" loading={!course}>
      {content}
    </CourseLayout>
  );
}
