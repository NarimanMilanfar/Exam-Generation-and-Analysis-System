"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import JSZip from "jszip";
import Sidebar from "../../../components/Sidebar";
import RecentActivityWidget from "../../../components/activity/RecentActivityWidget";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface QuickStats {
  exams: number;
  questions: number;
  students: number;
  recentActivity: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface Term {
  id: string;
  term: string;
  year: number;
}

interface Enrollment {
  id: string;
  student: Student;
  term: Term;
  courseId: string;
}

// Course Archive Export Modal Component
function CourseArchiveExportModal({
  isOpen,
  onClose,
  courseId,
  course,
}: {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  course: Course | null;
}) {
  const [loading, setLoading] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeQuestionBanks: true,
    includeExams: true,
    includeStudentData: true,
    includeAnalytics: true,
    includeExamResults: true,
    formatType: "comprehensive" as
      | "comprehensive"
      | "data-only"
      | "readable-only",
  });

  const generateCourseArchive = async () => {
    if (!course) {
      toast.error("Course information not available");
      return;
    }

    setLoading(true);
    try {
      // Fetch comprehensive course data
      const response = await fetch(`/api/courses/${courseId}/export`);
      if (!response.ok) {
        throw new Error("Failed to fetch course data");
      }

      const courseData = await response.json();

      // Create ZIP archive
      const zip = new JSZip();
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const folderName = `${course.name.replace(
        /[^a-zA-Z0-9]/g,
        "_"
      )}_Archive_${timestamp}`;

      // Add course metadata
      const courseInfo = {
        course: courseData.course,
        exportInfo: courseData.exportInfo,
        summary: {
          totalQuestionBanks: courseData.questionBanks.length,
          totalExams: courseData.exams.length,
          totalStudents: courseData.students.length,
          totalQuestions: courseData.questionBanks.reduce(
            (sum: number, bank: any) => sum + bank.questionCount,
            0
          ),
        },
      };

      zip.file(
        `${folderName}/course-info.json`,
        JSON.stringify(courseInfo, null, 2)
      );

      // Add question banks
      if (
        exportOptions.includeQuestionBanks &&
        courseData.questionBanks.length > 0
      ) {
        const questionBanksFolder = zip.folder(`${folderName}/question-banks`);

        // JSON data
        questionBanksFolder?.file(
          "question-banks.json",
          JSON.stringify(courseData.questionBanks, null, 2)
        );

        // Generate readable DOCX for each question bank
        for (const bank of courseData.questionBanks) {
          const doc = await generateQuestionBankDOCX(bank, true);
          const docxBlob = await Packer.toBlob(doc);
          questionBanksFolder?.file(
            `${bank.name.replace(/[^a-zA-Z0-9]/g, "_")}.docx`,
            docxBlob
          );
        }
      }

      // Add exams
      if (exportOptions.includeExams && courseData.exams.length > 0) {
        const examsFolder = zip.folder(`${folderName}/exams`);

        // JSON data
        examsFolder?.file(
          "exams.json",
          JSON.stringify(courseData.exams, null, 2)
        );

        // Generate readable DOCX for each exam
        for (const exam of courseData.exams) {
          const doc = await generateExamDOCX(exam, true);
          const docxBlob = await Packer.toBlob(doc);
          examsFolder?.file(
            `${exam.title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`,
            docxBlob
          );
        }
      }

      // Add student data
      if (exportOptions.includeStudentData && courseData.students.length > 0) {
        const studentsFolder = zip.folder(`${folderName}/students`);

        // JSON data
        studentsFolder?.file(
          "students.json",
          JSON.stringify(courseData.students, null, 2)
        );

        // Generate CSV for students
        const studentCSV = generateStudentCSV(courseData.students);
        studentsFolder?.file("students.csv", studentCSV);
      }

      // Add exam results
      if (
        exportOptions.includeExamResults &&
        courseData.examResults.length > 0
      ) {
        const resultsFolder = zip.folder(`${folderName}/exam-results`);

        // JSON data
        resultsFolder?.file(
          "exam-results.json",
          JSON.stringify(courseData.examResults, null, 2)
        );

        // Generate CSV for results
        const resultsCSV = generateResultsCSV(courseData.examResults);
        resultsFolder?.file("exam-results.csv", resultsCSV);

        // Generate detailed results report
        const resultsDoc = await generateResultsReportDOCX(
          courseData.examResults,
          courseData.course
        );
        const resultsDocxBlob = await Packer.toBlob(resultsDoc);
        resultsFolder?.file("exam-results-report.docx", resultsDocxBlob);
      }

      // Add analytics
      if (exportOptions.includeAnalytics) {
        const analyticsFolder = zip.folder(`${folderName}/analytics`);

        // JSON data
        analyticsFolder?.file(
          "analytics.json",
          JSON.stringify(courseData.analytics, null, 2)
        );

        // Generate analytics report
        const analyticsDoc = await generateAnalyticsReportDOCX(
          courseData.analytics,
          courseData.course
        );
        const analyticsDocxBlob = await Packer.toBlob(analyticsDoc);
        analyticsFolder?.file("analytics-report.docx", analyticsDocxBlob);
      }

      // Add exam generations and variants
      if (courseData.examGenerations.length > 0) {
        const generationsFolder = zip.folder(`${folderName}/exam-generations`);
        generationsFolder?.file(
          "exam-generations.json",
          JSON.stringify(courseData.examGenerations, null, 2)
        );
        generationsFolder?.file(
          "exam-variants.json",
          JSON.stringify(courseData.examVariants, null, 2)
        );
      }

      // Add README
      const readme = generateReadmeContent(courseData);
      zip.file(`${folderName}/README.md`, readme);

      // Generate and download ZIP
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${folderName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Course archive exported successfully!");
      onClose();
    } catch (error) {
      console.error("Error generating course archive:", error);
      toast.error("Failed to generate course archive");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to generate Question Bank DOCX
  const generateQuestionBankDOCX = async (
    bank: any,
    includeAnswers: boolean = true
  ) => {
    const children: any[] = [];

    // Header
    children.push(
      new Paragraph({
        text: `Question Bank: ${bank.name}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Description: ${bank.description || "No description"}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `Topic: ${bank.topic || "General"}`,
      }),
      new Paragraph({
        text: `Total Questions: ${bank.questionCount}`,
      }),
      new Paragraph({
        text: `Total Points: ${bank.totalPoints}`,
      }),
      new Paragraph({
        text: `Created: ${new Date(bank.createdAt).toLocaleDateString()}`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Questions following the template format
    bank.questions.forEach((question: any, qIndex: number) => {
      // Question text with number
      children.push(
        new Paragraph({
          text: `${qIndex + 1}. ${question.text}`,
        })
      );

      // Options for multiple choice questions
      if (question.type === "MULTIPLE_CHOICE") {
        let options = question.options || [];

        options.forEach((option: string, optIndex: number) => {
          const label = String.fromCharCode(65 + optIndex); // A, B, C, D
          children.push(
            new Paragraph({
              text: `${label}. ${option}`,
            })
          );
        });

        // Find the correct answer letter
        const correctIndex = options.findIndex(
          (opt: string) => opt === question.correctAnswer
        );
        const answerLetter =
          correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";

        children.push(
          new Paragraph({
            text: includeAnswers ? `Answer: ${answerLetter}` : "Answer: _____",
          })
        );
      } else if (question.type === "TRUE_FALSE") {
        // For True/False questions, show the answer directly
        children.push(
          new Paragraph({
            text: includeAnswers
              ? `Answer: ${question.correctAnswer}`
              : "Answer: _____",
          })
        );
      }

      // Points line
      children.push(
        new Paragraph({
          text: `Point: ${question.points || 1}`,
        })
      );

      // Additional metadata (optional)
      if (question.difficulty) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Difficulty: ${question.difficulty}`,
                italics: true,
              }),
            ],
          })
        );
      }

      if (question.topic) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Topic: ${question.topic}`,
                italics: true,
              }),
            ],
          })
        );
      }

      // Empty line after each question
      children.push(new Paragraph({ text: "" }));
    });

    return new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
  };

  // Helper function to generate Exam DOCX
  const generateExamDOCX = async (
    exam: any,
    includeAnswers: boolean = true
  ) => {
    const children: any[] = [];

    // Header
    children.push(
      new Paragraph({
        text: `Exam: ${exam.title}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Description: ${exam.description || "No description"}`,
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `Total Questions: ${exam.questionCount}`,
      }),
      new Paragraph({
        text: `Total Points: ${exam.totalPoints}`,
      }),
      new Paragraph({
        text: `Time Limit: ${
          exam.timeLimit ? `${exam.timeLimit} minutes` : "No limit"
        }`,
      }),
      new Paragraph({
        text: `Status: ${exam.isPublished ? "Published" : "Draft"}`,
      }),
      new Paragraph({
        text: `Created: ${new Date(exam.createdAt).toLocaleDateString()}`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Exam configuration
    children.push(
      new Paragraph({
        text: "Exam Configuration",
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `Shuffle Questions: ${exam.shuffleQuestions ? "Yes" : "No"}`,
      }),
      new Paragraph({
        text: `Shuffle Answers: ${exam.shuffleAnswers ? "Yes" : "No"}`,
      }),
      new Paragraph({
        text: `Negative Marking: ${exam.negativeMarking ? "Yes" : "No"}`,
      }),
      new Paragraph({
        text: `Passing Score: ${exam.passingScore || "Not set"}`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Questions following the template format
    children.push(
      new Paragraph({
        text: "Questions",
        heading: HeadingLevel.HEADING_2,
      })
    );

    exam.questions.forEach((examQuestion: any, qIndex: number) => {
      const question = examQuestion.question;

      // Question text with number
      children.push(
        new Paragraph({
          text: `${qIndex + 1}. ${question.text}`,
        })
      );

      // Options for multiple choice questions
      if (question.type === "MULTIPLE_CHOICE") {
        let options = question.options || [];

        options.forEach((option: string, optIndex: number) => {
          const label = String.fromCharCode(65 + optIndex); // A, B, C, D
          children.push(
            new Paragraph({
              text: `${label}. ${option}`,
            })
          );
        });

        // Find the correct answer letter
        const correctIndex = options.findIndex(
          (opt: string) => opt === question.correctAnswer
        );
        const answerLetter =
          correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : "A";

        children.push(
          new Paragraph({
            text: includeAnswers ? `Answer: ${answerLetter}` : "Answer: _____",
          })
        );
      } else if (question.type === "TRUE_FALSE") {
        // For True/False questions, show the answer directly
        children.push(
          new Paragraph({
            text: includeAnswers
              ? `Answer: ${question.correctAnswer}`
              : "Answer: _____",
          })
        );
      }

      // Points line
      children.push(
        new Paragraph({
          text: `Point: ${examQuestion.points || question.points || 1}`,
        })
      );

      // Additional metadata (optional)
      if (examQuestion.questionBank) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Question Bank: ${examQuestion.questionBank.name}`,
                italics: true,
              }),
            ],
          })
        );
      }

      // Empty line after each question
      children.push(new Paragraph({ text: "" }));
    });

    return new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
  };

  // Helper function to generate Student CSV
  const generateStudentCSV = (students: any[]) => {
    // Follow the exact template format: id,name
    const headers = ["id", "name"];
    const rows = students.map((enrollment) => [
      enrollment.student.studentId || enrollment.student.id,
      enrollment.student.name,
    ]);

    // Create CSV with exact formatting from template
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    return csvContent;
  };

  // Helper function to generate Results CSV
  const generateResultsCSV = (results: any[]) => {
    const headers = [
      "Student ID",
      "Student Name",
      "Exam",
      "Score",
      "Total Points",
      "Percentage",
      "Date",
    ];
    const rows = results.map((result) => [
      result.student.studentId || result.student.id,
      result.student.name,
      result.exam.title,
      result.score.toString(),
      result.totalPoints.toString(),
      result.percentage ? `${result.percentage.toFixed(2)}%` : "N/A",
      new Date(result.createdAt).toLocaleDateString(),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  };

  // Helper function to generate Results Report DOCX
  const generateResultsReportDOCX = async (results: any[], course: any) => {
    const children: any[] = [];

    children.push(
      new Paragraph({
        text: `Exam Results Report - ${course.name}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString()}`,
      }),
      new Paragraph({
        text: `Total Results: ${results.length}`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Group results by exam
    const resultsByExam = results.reduce((acc, result) => {
      const examTitle = result.exam.title;
      if (!acc[examTitle]) {
        acc[examTitle] = [];
      }
      acc[examTitle].push(result);
      return acc;
    }, {} as Record<string, any[]>);

    Object.entries(resultsByExam).forEach(([examTitle, examResults]) => {
      const typedExamResults = examResults as any[];
      children.push(
        new Paragraph({
          text: `Exam: ${examTitle}`,
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({
          text: `Total Submissions: ${typedExamResults.length}`,
        }),
        new Paragraph({
          text: `Average Score: ${(
            typedExamResults.reduce((sum: number, r: any) => sum + r.score, 0) /
            typedExamResults.length
          ).toFixed(2)}`,
        }),
        new Paragraph({
          text: `Average Percentage: ${(
            typedExamResults.reduce(
              (sum: number, r: any) => sum + (r.percentage || 0),
              0
            ) / typedExamResults.length
          ).toFixed(2)}%`,
        }),
        new Paragraph({ text: "" }) // Empty line
      );

      typedExamResults.forEach((result: any) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${result.student.name} (${
                  result.student.studentId || result.student.id
                })`,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            text: `  Score: ${result.score}/${result.totalPoints} (${
              result.percentage?.toFixed(2) || "N/A"
            }%)`,
          }),
          new Paragraph({
            text: `  Date: ${new Date(result.createdAt).toLocaleDateString()}`,
          }),
          new Paragraph({ text: "" }) // Empty line
        );
      });
    });

    return new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
  };

  // Helper function to generate Analytics Report DOCX
  const generateAnalyticsReportDOCX = async (analytics: any, course: any) => {
    const children: any[] = [];

    children.push(
      new Paragraph({
        text: `Analytics Report - ${course.name}`,
        heading: HeadingLevel.HEADING_1,
      }),
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString()}`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Overview
    children.push(
      new Paragraph({
        text: "Course Overview",
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `Total Questions: ${analytics.overview.totalQuestions}`,
      }),
      new Paragraph({
        text: `Total Exams: ${analytics.overview.totalExams}`,
      }),
      new Paragraph({
        text: `Total Question Banks: ${analytics.overview.totalQuestionBanks}`,
      }),
      new Paragraph({
        text: `Total Students: ${analytics.overview.totalStudents}`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Exam Results Analytics
    children.push(
      new Paragraph({
        text: "Exam Results Analytics",
        heading: HeadingLevel.HEADING_2,
      }),
      new Paragraph({
        text: `Total Results: ${analytics.examResults.totalResults}`,
      }),
      new Paragraph({
        text: `Average Score: ${analytics.examResults.averageScore.toFixed(2)}`,
      }),
      new Paragraph({
        text: `Average Percentage: ${analytics.examResults.averagePercentage.toFixed(
          2
        )}%`,
      }),
      new Paragraph({
        text: `Completion Rate: ${analytics.examResults.completionRate.toFixed(
          2
        )}%`,
      }),
      new Paragraph({ text: "" }) // Empty line
    );

    // Question Bank Analytics
    children.push(
      new Paragraph({
        text: "Question Bank Analytics",
        heading: HeadingLevel.HEADING_2,
      })
    );

    analytics.questionBanks.forEach((bank: any) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${bank.name}`,
              bold: true,
            }),
          ],
        }),
        new Paragraph({
          text: `  Questions: ${bank.questionCount}`,
        }),
        new Paragraph({
          text: `  Total Points: ${bank.totalPoints}`,
        }),
        new Paragraph({
          text: `  Average Points per Question: ${bank.averageQuestionPoints.toFixed(
            2
          )}`,
        }),
        new Paragraph({ text: "" }) // Empty line
      );
    });

    return new Document({
      sections: [
        {
          properties: {},
          children: children,
        },
      ],
    });
  };

  // Helper function to generate README
  const generateReadmeContent = (courseData: any) => {
    return `# Course Archive Export

## Course Information
- **Course**: ${courseData.course.name}
- **Description**: ${courseData.course.description || "No description"}
- **Instructor**: ${courseData.course.instructor.name} (${
      courseData.course.instructor.email
    })
- **Exported**: ${new Date(
      courseData.exportInfo.exportedAt
    ).toLocaleDateString()}
- **Export Version**: ${courseData.exportInfo.version}

## Archive Contents

### 1. Course Information
- \`course-info.json\` - Basic course metadata and export summary

### 2. Question Banks (${courseData.questionBanks.length} banks)
- \`question-banks/\` - Contains all question banks
  - \`question-banks.json\` - Raw data in JSON format
  - Individual DOCX files for each question bank (human-readable)

### 3. Exams (${courseData.exams.length} exams)
- \`exams/\` - Contains all exams
  - \`exams.json\` - Raw data in JSON format
  - Individual DOCX files for each exam (human-readable)

### 4. Student Data (${courseData.students.length} students)
- \`students/\` - Contains student enrollment data
  - \`students.json\` - Raw data in JSON format
  - \`students.csv\` - CSV format for easy import

### 5. Exam Results (${courseData.examResults.length} results)
- \`exam-results/\` - Contains all exam results and analytics
  - \`exam-results.json\` - Raw data in JSON format
  - \`exam-results.csv\` - CSV format for easy analysis
  - \`exam-results-report.docx\` - Formatted report

### 6. Analytics
- \`analytics/\` - Contains course analytics and insights
  - \`analytics.json\` - Raw analytics data
  - \`analytics-report.docx\` - Formatted analytics report

### 7. Exam Generations & Variants
- \`exam-generations/\` - Contains exam generation data
  - \`exam-generations.json\` - Generated exam instances
  - \`exam-variants.json\` - Exam variant data

## File Formats
- **JSON**: Machine-readable data for system imports
- **DOCX**: Human-readable documents for review and printing
- **CSV**: Spreadsheet-compatible format for data analysis

## Usage
This archive contains a complete backup of your course data and can be used for:
- Course backup and archival
- Data migration to other systems
- Academic record keeping
- Performance analysis
- Course content review

For questions about this export, contact the system administrator.
`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-brand-navy">
            Export Course Archive
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Export a complete archive of your course including question banks,
            exams, student data, and analytics.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Archive Contents:
            </h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Question banks with all questions (JSON + DOCX)</li>
              <li>• Exams with configurations and questions (JSON + DOCX)</li>
              <li>• Student enrollment data (JSON + CSV)</li>
              <li>• Exam results and performance data (JSON + CSV + Report)</li>
              <li>• Course analytics and insights (JSON + Report)</li>
              <li>• Exam generations and variants</li>
              <li>• Complete documentation (README)</li>
            </ul>
          </div>
        </div>

        {/* Export Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Export Options
          </h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeQuestionBanks}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeQuestionBanks: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Include Question Banks</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeExams}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeExams: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Include Exams</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeStudentData}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeStudentData: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Include Student Data</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeExamResults}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeExamResults: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Include Exam Results</span>
            </label>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={exportOptions.includeAnalytics}
                onChange={(e) =>
                  setExportOptions({
                    ...exportOptions,
                    includeAnalytics: e.target.checked,
                  })
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">Include Analytics</span>
            </label>
          </div>
        </div>

        {/* Course Info */}
        {course && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              Course Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Course:</span>
                <p className="text-gray-600">{course.name}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Description:</span>
                <p className="text-gray-600">
                  {course.description || "No description"}
                </p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Exams:</span>
                <p className="text-gray-600">{course.examCount}</p>
              </div>
              <div>
                <span className="font-medium text-gray-700">Questions:</span>
                <p className="text-gray-600">{course.questionCount}</p>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={generateCourseArchive}
            disabled={loading}
            className="px-6 py-2 bg-brand-navy text-white rounded-lg hover:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating Archive..." : "Export Course Archive"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoursePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();

  // Initialize all hooks at the top of the component
  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState<QuickStats>({
    exams: 0,
    questions: 0,
    students: 0,
    recentActivity: "Active",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isArchiveExportModalOpen, setIsArchiveExportModalOpen] =
    useState(false);

  // useEffect needs to be initialized before conditional returns
  useEffect(() => {
    if (params?.id) {
      fetchCourseData();
      fetchEnrollments();
    }
  }, [params?.id]);

  // Handle conditional logic after hooks are initialized
  if (!params) {
    return <div>Loading...</div>;
  }

  const courseId = params.id as string;

  const fetchCourseData = async () => {
    try {
      setIsLoading(true);
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      if (courseResponse.ok) {
        const courseData = await courseResponse.json();
        setCourse(courseData);
        setStats({
          exams: courseData.examCount || 0,
          questions: courseData.questionCount || 0,
          students: 0, // TODO: Add student count from API
          recentActivity: "Active",
        });
      } else {
        toast.error("Failed to load course");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
      toast.error("Failed to load course");
      router.push("/dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/student`);
      const data = await res.json();
      const enrollments = data.enrollments || [];

      setEnrollments(enrollments);
      setStats((prev) => ({
        ...prev,
        students: enrollments.length,
      }));
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast.error("Failed to load enrollments");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!session || !course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
      <Sidebar />

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Thin Consistent Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Dashboard
                </button>
                <div className="text-gray-300">→</div>
                <span className="text-brand-navy font-semibold text-sm">
                  {course?.name}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: course?.color }}
                ></div>
                <span className="text-sm font-medium text-gray-700">
                  Course Dashboard
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Side - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Course Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {course.name}
                    </h1>
                    <p className="text-gray-600 mb-4">{course.description}</p>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-gray-600">
                          {stats.questions} Questions
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-gray-600">
                          {stats.exams} Exams
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-gray-600">
                          {stats.students} Students
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push(`/course/${courseId}/settings`)}
                    className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-3 rounded-lg transition-colors text-sm"
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span>Settings</span>
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Questions Management */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <svg
                        className="w-6 h-6 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.questions}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Question Bank
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Manage your course questions
                  </p>
                  <button
                    onClick={() =>
                      router.push(`/course/${courseId}/question-bank`)
                    }
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Manage Questions
                  </button>
                </div>

                {/* Exams Management */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                      <svg
                        className="w-6 h-6 text-green-600"
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
                    <span className="text-2xl font-bold text-gray-900">
                      {stats.exams}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">Exams</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create and manage exams
                  </p>
                  <button
                    onClick={() => router.push(`/course/${courseId}/exams`)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Manage Exams
                  </button>
                </div>

                {/* Analytics */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <svg
                        className="w-6 h-6 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Analytics
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    View course performance insights
                  </p>
                  <button
                    onClick={() => router.push(`/course/${courseId}/analytics`)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    View Analytics
                  </button>
                </div>

                {/* Manage Templates - Replaces Settings */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow group h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                      <svg
                        className="w-6 h-6 text-orange-600"
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
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Manage Templates
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Create and manage reusable exam templates
                  </p>
                  <button
                    onClick={() => router.push(`/course/${courseId}/templates`)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Manage Templates
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Student Management */}
            <div className="space-y-6">
              {/* Export Archive */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    Export Course Archive
                  </h3>
                  <button
                    className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                    onClick={() => setIsArchiveExportModalOpen(true)}
                  >
                    Export Archive
                  </button>
                </div>
                <p className="text-gray-600 text-sm">
                  Export complete course data and materials for backup or
                  transfer
                </p>
              </div>

              {/* Student Overview */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Students</h3>
                  <button
                    className="bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-navy-800 transition-colors"
                    onClick={() => router.push(`/course/${courseId}/student`)}
                  >
                    Manage Students
                  </button>
                </div>

                {enrollments.length === 0 ? (
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
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 text-sm mb-4">
                      No students enrolled yet
                    </p>
                    <p className="text-gray-500 text-xs">
                      Add students to see them here
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {enrollments.map((enrollment) => (
                      <li
                        key={`${enrollment.student.id}-${enrollment.term.id}`}
                        className="flex justify-between items-center bg-gray-50 px-4 py-2 rounded-lg"
                      >
                        <span className="text-gray-800 font-medium">
                          {enrollment.student.name}
                        </span>
                        <span className="text-gray-500 text-sm">
                          {enrollment.student.studentId}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Recent Activity */}
              <RecentActivityWidget courseId={courseId} />

              {/* Course Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-40">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Course Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Active
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Visibility</span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Private
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-xs text-gray-500">Recently</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Archive Export Modal */}
      <CourseArchiveExportModal
        isOpen={isArchiveExportModalOpen}
        onClose={() => setIsArchiveExportModalOpen(false)}
        courseId={courseId}
        course={course}
      />
    </div>
  );
}
