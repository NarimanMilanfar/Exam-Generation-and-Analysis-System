"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

interface QuestionInfo {
  id: string;
  text: string;
  correctAnswer: string;
  points: number;
  negativePoints?: number | null;
  options?: Record<string, string>;
  type?: string;
}

interface VariantAnswer {
  variantNumber: number;
  variantCode: string;
  questions: {
    questionId: string;
    questionNumber: number;
    text: string;
    correctAnswer: string;
    originalAnswer: string;
    points: number;
  }[];
}

interface UploadInfo {
  course: {
    id: string;
    name: string;
    description: string;
  };
  term: {
    id: string;
    term: string;
    year: number;
  } | null;
  exam: {
    id: string;
    title: string;
    description: string;
    timeLimit?: number;
    term: {
      id: string;
      term: string;
      year: number;
    } | null;
  } | null;
  variants: {
    id: string;
    variantNumber: number;
    variantCode: string;
    questionOrder?: string;
  }[];
  students: {
    id: string;
    name: string;
    studentId?: string;
  }[];
  examQuestions: {
    id: string;
    questionId: string;
    question: QuestionInfo;
    points?: number;
    negativePoints?: number | null;
  }[];
  variantAnswers?: VariantAnswer[];
}

interface ParsedCSV {
  headers: string[];
  data: string[][];
  isValid: boolean;
  errors: string[];
}

interface ResultUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  generationId?: string;
  courseId?: string;
  onSuccess?: () => void;
  onStudentsChanged?: () => void;
}

interface EnrollmentResponse {
  enrollments: {
    student: {
      id: string;
      name: string;
      studentId?: string;
    };
  }[];
}

export default function ResultUploader({
  isOpen,
  onClose,
  generationId,
  courseId,
  onSuccess,
  onStudentsChanged,
}: ResultUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null);
  const [parsedData, setParsedData] = useState<ParsedCSV | null>(null);
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [autoCreateStudents, setAutoCreateStudents] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [studentScores, setStudentScores] = useState<{
    [studentId: string]: {
      totalScore: number;
      percentage: number;
      details: {
        questionNumber: number;
        answer: string;
        isCorrect: boolean;
        points: number;
      }[];
    };
  }>({});

  const handleClose = () => {
    setFile(null);
    setParsedData(null);
    setPreviewData([]);
    setStudentScores({});
    setAutoCreateStudents(false);
    setIsLoading(false);
    onClose();
  };

  useEffect(() => {
    if (isOpen && generationId && courseId) {
      const fetchData = async () => {
        try {
          const res = await fetch(
            `/api/resultUploader?generationId=${generationId}&courseId=${courseId}`
          );

          if (!res.ok) throw new Error(await res.text());

          const data = await res.json();
          setUploadInfo(data);
          console.log("setUploadInfo (fetchData):", data);
        } catch (error) {
          console.error("Failed to obtain the uploaded information:", error);
          toast.error("Failed to obtain the uploaded information");
        }
      };

      fetchData();
    }
  }, [isOpen, generationId, courseId]);

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split("\n");
    return lines.map((line) => {
      const regex = /(".*?"|[^",\s]+)(?=\s*,|\s*$)/g;
      const matches = line.match(regex) || [];
      return matches.map((match) => match.replace(/^"|"$/g, "").trim());
    });
  };

  /**
   * Validates that the uploaded OMR data has the same number of questions as the exam
   */
  const validateQuestionCount = (
    headers: string[],
    examQuestions: UploadInfo["examQuestions"]
  ): { isValid: boolean; error?: string } => {
    if (!examQuestions || examQuestions.length === 0) {
      return {
        isValid: false,
        error: "No exam questions found. Please ensure the exam has questions before uploading results."
      };
    }

    // Count question columns in CSV (headers starting with "Q")
    const questionHeaders = headers.filter((header) => header.startsWith("Q"));
    const csvQuestionCount = questionHeaders.length;
    const examQuestionCount = examQuestions.length;

    if (csvQuestionCount === 0) {
      return {
        isValid: false,
        error: "No question columns found in CSV. Expected columns like Q1, Q2, Q3, etc."
      };
    }

    if (csvQuestionCount !== examQuestionCount) {
      return {
        isValid: false,
        error: `Question count mismatch! CSV has ${csvQuestionCount} questions (${questionHeaders.join(", ")}) but exam has ${examQuestionCount} questions. Please ensure your OMR scan results match the exam structure.`
      };
    }

    return { isValid: true };
  };

  /**
   * Validates that the uploaded OMR data has variant numbers that match the available exam variants exactly
   */
  const validateVariantNumbers = (
    data: string[][],
    headers: string[],
    variants: UploadInfo["variants"]
  ): { isValid: boolean; error?: string } => {
    if (!variants || variants.length === 0) {
      return {
        isValid: false,
        error: "No exam variants found. Please ensure the exam has variants before uploading results."
      };
    }

    if (!headers.includes("variant")) {
      return {
        isValid: false,
        error: "No variant column found in CSV. Expected column named 'variant'."
      };
    }

    // Get available variant numbers from the exam
    const availableVariantNumbers = variants.map(v => v.variantNumber);
    const variantColumnIndex = headers.indexOf("variant");

    // Check each row for valid variant numbers
    const invalidVariants: string[] = [];
    const usedVariants = new Set<number>();

    data.forEach((row, rowIndex) => {
      const variantValue = row[variantColumnIndex];
      const variantNumber = parseInt(variantValue);

      if (isNaN(variantNumber)) {
        invalidVariants.push(`Row ${rowIndex + 1}: "${variantValue}" (not a number)`);
      } else if (!availableVariantNumbers.includes(variantNumber)) {
        invalidVariants.push(`Row ${rowIndex + 1}: ${variantNumber} (not available)`);
      } else {
        usedVariants.add(variantNumber);
      }
    });

    if (invalidVariants.length > 0) {
      return {
        isValid: false,
        error: `Invalid variant numbers found: ${invalidVariants.slice(0, 5).join(", ")}${invalidVariants.length > 5 ? ` and ${invalidVariants.length - 5} more` : ""}. Available variants: ${availableVariantNumbers.join(", ")}.`
      };
    }

    // Check for exact match - all variants must be used and no extra variants
    const usedVariantArray = Array.from(usedVariants).sort((a, b) => a - b);
    const availableVariantArray = availableVariantNumbers.sort((a, b) => a - b);

    if (usedVariantArray.length !== availableVariantArray.length) {
      return {
        isValid: false,
        error: `Variant count mismatch! CSV contains ${usedVariantArray.length} variants (${usedVariantArray.join(", ")}) but exam has ${availableVariantArray.length} variants (${availableVariantArray.join(", ")}). All variants must be used exactly.`
      };
    }

    // Check if the variant numbers match exactly
    for (let i = 0; i < usedVariantArray.length; i++) {
      if (usedVariantArray[i] !== availableVariantArray[i]) {
        return {
          isValid: false,
          error: `Variant mismatch! CSV contains variants ${usedVariantArray.join(", ")} but exam has variants ${availableVariantArray.join(", ")}. All variants must be used exactly.`
        };
      }
    }

    return { isValid: true };
  };

  // Helper function to handle grading and submission
  const submitResultsWithStudents = async (
    students: UploadInfo["students"]
  ) => {
    if (!uploadInfo) return;
    if (!uploadInfo.exam) return;
    // 2. Create a student ID mapping table (now includes any newly created students)
    const studentIdMap = new Map<string, string>();
    students.forEach((student) => {
      studentIdMap.set(student.id, student.id);
      if (student.studentId) {
        studentIdMap.set(student.studentId, student.id);
      }
    });

    // 3. Calculate the total score of the exam (the sum of the scores of all the questions)
    const totalPoints = uploadInfo!.examQuestions.reduce(
      (sum, q) => sum + (q.points || q.question.points),
      0
    );

    // 4. Calculate the grade
    const scores: {
      [dbStudentId: string]: {
        totalScore: number;
        percentage: number;
        details: {
          questionNumber: number;
          answer: string;
          isCorrect: boolean;
          points: number;
          questionId: string;
        }[];
        variantCode: string;
      };
    } = {};

    // Create a question mapping table (using original question order)
    const questionMap = new Map<
      string,
      {
        correctAnswer: string;
        points: number;
        negativePoints: number | null;
        questionId: string;
        originalNumber: number; // Store original question number
      }
    >();

    uploadInfo!.examQuestions.forEach((q, index) => {
      questionMap.set(`Q${index + 1}`, {
        correctAnswer: q.question.correctAnswer,
        points: q.points || q.question.points,
        negativePoints: q.negativePoints ?? q.question.negativePoints ?? null,
        questionId: q.questionId,
        originalNumber: index + 1, // Store original question number
      });
    });

    // Process each row of data
    parsedData?.data.forEach((row) => {
      const studentIdentifier = row[parsedData.headers.indexOf("studentId")];
      const variant = row[parsedData.headers.indexOf("variant")];

      // Convert to the database ID
      const dbStudentId = studentIdMap.get(studentIdentifier);
      if (!dbStudentId) {
        // This should not happen after auto-create, but just in case
        return;
      }

      // Get variant info including questionOrder
      const variantInfo = uploadInfo!.variants.find(
        (v) => v.variantNumber === parseInt(variant)
      );

      if (!variantInfo) return;

      // Get question order for this variant
      const questionOrder = variantInfo.questionOrder
        ? (JSON.parse(variantInfo.questionOrder) as number[])
        : null;

      // Get the correct answer to this variant
      const variantAnswers = uploadInfo!.variantAnswers?.find(
        (v) => v.variantNumber === parseInt(variant)
      );

      if (!variantAnswers) return;

      let totalScore = 0;
      const details: {
        questionNumber: number;
        answer: string;
        isCorrect: boolean;
        points: number;
        questionId: string;
      }[] = [];

      // Check the answers to each question
      parsedData.headers.forEach((header, index) => {
        if (header.startsWith("Q")) {
          const csvQuestionNumber = parseInt(header.substring(1));
          const studentAnswer = row[index];

          // Map CSV question number to actual question number using questionOrder
          let actualQuestionNumber = csvQuestionNumber;
          if (questionOrder && questionOrder.length > 0) {
            // questionOrder array contains the mapping from variant to original
            // e.g. questionOrder = [2,4,1,0,5,3] means:
            // Variant Q1 -> Original Q3 (index 2 + 1)
            // Variant Q2 -> Original Q5 (index 4 + 1)
            // etc.
            const originalIndex = questionOrder[csvQuestionNumber - 1];
            actualQuestionNumber = originalIndex + 1;
          }

          const questionKey = `Q${actualQuestionNumber}`;
          const questionInfo = questionMap.get(questionKey);

          if (questionInfo) {
            // Find the correct answer for this question
            const correctAnswer = variantAnswers.questions.find(
              (q) => q.questionNumber === actualQuestionNumber
            )?.correctAnswer;

            const isCorrect = studentAnswer === correctAnswer;

            // Apply negative marking logic:
            // - Correct answer: get positive points
            // - Empty/no answer: get 0 points
            // - Wrong answer: get negative points (if negative marking enabled)
            let points: number;
            if (isCorrect) {
              points = questionInfo.points;
            } else if (!studentAnswer || studentAnswer.trim() === "") {
              points = 0; // Empty answer gets 0 points
            } else {
              points = questionInfo.negativePoints ?? 0; // Wrong answer gets negative points
            }

            totalScore += points;

            details.push({
              questionNumber: actualQuestionNumber,
              answer: studentAnswer,
              isCorrect,
              points,
              questionId: questionInfo.questionId,
            });
          }
        }
      });

      // Use the database ID as the key
      scores[dbStudentId] = {
        totalScore, // student's grade
        percentage: (totalScore / totalPoints) * 100, // percentage
        details,
        variantCode: variantInfo.variantCode,
      };
    });

    // 5. Save to the database
    const response = await fetch("/api/resultUploader/saveExamResults", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        examId: uploadInfo!.exam!.id,
        termId: uploadInfo!.term?.id || "",
        courseId,
        studentScores: scores,
        totalPoints,
      }),
    });

    if (!response.ok) throw new Error(await response.text());

    toast.success("Results saved successfully!");
    if (onSuccess) onSuccess();
    onClose();
  };

  /**
   * Automatically creates student records for any students found in the uploaded CSV
   * who are not already enrolled in the course. Updates the student list and state accordingly.
   * with auto-generated names like Student-01, Student-02, etc.
   *
   * @param {Object} params - Parameters for student creation and state update.
   * @returns {Promise<Array>} - The updated list of students after auto-creation.
   */
  async function autoCreateMissingStudents({
    parsedData,
    uploadInfo,
    courseId,
    generationId,
    setUploadInfo,
  }: {
    parsedData: ParsedCSV;
    uploadInfo: UploadInfo;
    courseId: string;
    generationId: string;
    setUploadInfo: React.Dispatch<React.SetStateAction<UploadInfo | null>>;
  }): Promise<UploadInfo["students"]> {
    let updatedStudents = [...uploadInfo.students];
    const existingStudentIds = new Set(
      uploadInfo.students.map((s) => s.studentId || s.id)
    );
    const allStudentIds = parsedData.data.map(
      (row) => row[parsedData.headers.indexOf("studentId")]
    );
    const missingStudents = Array.from(
      new Set(allStudentIds.filter((id) => !existingStudentIds.has(id)))
    );

    if (missingStudents.length > 0) {
      // Create missing students with auto-generated names
      const newStudents = missingStudents.map((studentId, index) => {
        const existingCount = updatedStudents.length;
        return {
          id: `temp-${studentId}`,
          name: `Student-${String(existingCount + index + 1).padStart(2, "0")}`,
          studentId: studentId,
        };
      });

      // Add students to the course via API
      const termId = uploadInfo.term?.id || uploadInfo.exam?.term?.id;
      if (termId && courseId) {
        const createStudentsRes = await fetch(
          `/api/courses/${courseId}/student`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              students: newStudents.map((s) => ({
                id: s.studentId,
                name: s.name,
              })),
              termId,
            }),
          }
        );

        if (createStudentsRes.ok) {
          try {
            const createdData: EnrollmentResponse =
              await createStudentsRes.json();
            if (
              createdData &&
              createdData.enrollments &&
              createdData.enrollments.length > 0
            ) {
              updatedStudents = [
                ...updatedStudents,
                ...createdData.enrollments.map((e) => ({
                  id: e.student.id,
                  name: e.student.name,
                  studentId: e.student.studentId,
                })),
              ];
            }
          } catch (error) {
            // If the response is malformed, do not update students
            toast.error(
              "Failed to auto-create missing students: " +
              (error instanceof Error ? error.message : "Unknown error")
            );
          }
          setUploadInfo((prev) => ({ ...prev!, students: updatedStudents }));
          // Refetch uploadInfo from /api/resultUploader to ensure full sync
          try {
            const infoRes = await fetch(
              `/api/resultUploader?generationId=${generationId}&courseId=${courseId}`
            );
            if (infoRes.ok) {
              const newInfo = await infoRes.json();
              setUploadInfo(() => newInfo);
              updatedStudents = newInfo.students;
            }
          } catch (error) {
            toast.error(
              "Failed to auto-create missing students. Please check your CSV and try again."
            );
          }
        } else {
          toast.error(
            "Failed to auto-create students. Proceeding with existing students only."
          );
        }
      }
    }
    return updatedStudents;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !generationId || !courseId || !uploadInfo?.exam?.id) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parsedData && !parsedData.isValid) {
      toast.error("Please correct the errors in the CSV file first");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Auto-create missing students if enabled
      let updatedStudents = [...uploadInfo.students];
      if (autoCreateStudents && parsedData) {
        updatedStudents = await autoCreateMissingStudents({
          parsedData,
          uploadInfo,
          courseId,
          generationId,
          setUploadInfo,
        });
        // If students were auto-created, the function already handled refetching uploadInfo and updating state
        // Proceed with submission using the updated students
        await submitResultsWithStudents(updatedStudents);
        setIsLoading(false);
        return;
      } else {
        // If no missing students or auto-create is not enabled, proceed as normal
        await submitResultsWithStudents(updatedStudents);
      }
    } catch (error) {
      console.error("Failed to save:", error);
      toast.error(
        "Failed to save: " +
        (error instanceof Error ? error.message : "unknown error")
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.toLowerCase().endsWith(".csv")) {
      handleFileSelection(droppedFile);
    }
  };

  // Extract file processing logic into a separate function
  const handleFileSelection = (selectedFile: File) => {
    setFile(selectedFile);
    setParsedData(null);
    setPreviewData([]);

    // Auto-parse the CSV file immediately
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      try {
        const text = readerEvent.target?.result as string;
        const parsed = parseCSV(text);

        if (parsed.length < 2) {
          throw new Error(
            "CSV file must contain at least a header row and one data row"
          );
        }

        const headers = parsed[0];
        const data = parsed.slice(1);

        // Validation logic
        const errors: string[] = [];

        if (!headers.includes("studentId")) {
          errors.push(
            "CSV must contain 'studentId' column for student identification"
          );
        }

        if (!headers.includes("variant")) {
          errors.push(
            "CSV must contain 'variant' column to identify exam variant"
          );
        }

        const studentIds = data.map((row) => row[headers.indexOf("studentId")]);
        const duplicateIds = studentIds.filter(
          (id, index) => studentIds.indexOf(id) !== index
        );

        if (duplicateIds.length > 0) {
          errors.push(
            `Duplicate student IDs found: ${Array.from(new Set(duplicateIds))
              .slice(0, 5)
              .join(", ")}${duplicateIds.length > 5
                ? ` and ${duplicateIds.length - 5} more`
                : ""
            }`
          );
        }

        const questionFields = headers.filter((h) => h.startsWith("Q"));
        if (questionFields.length === 0) {
          errors.push(
            "No question data found. CSV must include question columns (Q1, Q2, etc.)"
          );
        }

        // Validate question count against exam questions
        if (uploadInfo?.examQuestions) {
          const questionCountValidation = validateQuestionCount(headers, uploadInfo.examQuestions);
          if (!questionCountValidation.isValid) {
            errors.push(questionCountValidation.error!);
          }
        }

        // Validate variant numbers against available exam variants
        if (uploadInfo?.variants) {
          const variantValidation = validateVariantNumbers(data, headers, uploadInfo.variants);
          if (!variantValidation.isValid) {
            errors.push(variantValidation.error!);
          }
        }

        const result: ParsedCSV = {
          headers,
          data,
          isValid: errors.length === 0,
          errors,
        };

        setParsedData(result);
        setPreviewData(parsed.slice(0, 11));
      } catch (error: any) {
        const result: ParsedCSV = {
          headers: [],
          data: [],
          isValid: false,
          errors: [error.message || "Failed to parse CSV file"],
        };
        setParsedData(result);
      } finally {
        setIsLoading(false);
      }
    };

    reader.readAsText(selectedFile);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#002144] text-white px-6 py-4">
          <h2 className="text-lg font-semibold">Upload OMR Grades</h2>
          <button
            onClick={handleClose}
            className="text-white hover:text-gray-300 transition-colors"
            aria-label="Close modal"
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

        <div className="p-6 max-h-[80vh] overflow-auto">
          {/* Auto-Create Students Toggle */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-900">
                  Auto-Create Missing Students
                </h4>
                <p className="text-sm text-green-700">
                  {autoCreateStudents
                    ? "Students not enrolled will be automatically created with names like Student-01, Student-02, etc."
                    : "Only process results for students already enrolled in the course."}
                </p>
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoCreateStudents}
                  onChange={(e) => {
                    setAutoCreateStudents(e.target.checked);
                    // Clear validation when toggling
                    if (parsedData) {
                      setParsedData({
                        ...parsedData,
                        errors: [],
                        isValid: true,
                      });
                    }
                  }}
                  className="sr-only"
                  data-testid="auto-create-checkbox"
                />
                <div
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoCreateStudents ? "bg-green-600" : "bg-gray-200"
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoCreateStudents ? "translate-x-6" : "translate-x-1"
                      }`}
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Helper Note */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-400 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Important Requirements
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>
                      Exam term and year will be automatically matched from the
                      current exam
                    </li>
                    <li>
                      {autoCreateStudents
                        ? "Missing students will be auto-created with generated names (Student-01, Student-02, etc.)"
                        : "All student IDs in the CSV must exist in the course enrollment"}
                    </li>
                    <li>
                      CSV headers must include: "studentId", "variant", and
                      question columns ("Q1", "Q2", etc.)
                    </li>
                    <li>
                      No duplicate student IDs are allowed in the same file
                    </li>
                    <li>
                      Variant numbers must match the generated exam variants
                    </li>
                    <li>
                      Question columns must match the exam structure (Q1, Q2, ..., Q{uploadInfo?.examQuestions?.length || 0})
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* content area */}
          {uploadInfo ? (
            <div className="space-y-4">
              {/* Overview of Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Course</h3>
                  <p>{uploadInfo.course.name}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Term</h3>
                  <p>
                    {uploadInfo.term
                      ? `${uploadInfo.term.term} ${uploadInfo.term.year}`
                      : "None"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">Exam</h3>
                  <p className="font-semibold">
                    {uploadInfo.exam?.title || "None"}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">
                    Number of Variants
                  </h3>
                  <p className="text-lg font-semibold text-black-600">
                    {uploadInfo.variants?.length || 0}
                  </p>
                  {uploadInfo.variants && uploadInfo.variants.length > 0}
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">
                    Total Questions
                  </h3>
                  <p className="text-lg font-semibold text-black-600">
                    {uploadInfo.examQuestions?.length || 0}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700">
                    Number of Students
                  </h3>
                  <p className="text-lg font-semibold text-black-600">
                    {uploadInfo.students?.length ?? 0}
                  </p>
                </div>
              </div>

              {/* files upload */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload OMR Scan Results (CSV)
                </label>
                <div
                  className={`mt-1 flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-lg transition-colors ${isDragOver
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                    }`}
                  data-testid="drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <div className="mt-4 flex text-sm text-gray-600">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                      >
                        <span>Choose CSV file to upload</span>
                        <input
                          id="file-upload"
                          type="file"
                          className="sr-only"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const selectedFile = e.target.files[0];
                              setFile(selectedFile);
                              setParsedData(null);
                              setPreviewData([]);

                              // Auto-parse the CSV file immediately
                              setIsLoading(true);

                              const reader = new FileReader();
                              reader.onload = (readerEvent) => {
                                try {
                                  const text = readerEvent.target
                                    ?.result as string;
                                  const parsed = parseCSV(text);

                                  if (parsed.length < 2) {
                                    throw new Error(
                                      "CSV file must contain at least a header row and one data row"
                                    );
                                  }

                                  const headers = parsed[0];
                                  const data = parsed.slice(1);

                                  // Validation logic
                                  const errors: string[] = [];

                                  if (!headers.includes("studentId")) {
                                    errors.push(
                                      "CSV must contain 'studentId' column for student identification"
                                    );
                                  }

                                  if (!headers.includes("variant")) {
                                    errors.push(
                                      "CSV must contain 'variant' column to identify exam variant"
                                    );
                                  }

                                  const studentIds = data.map(
                                    (row) => row[headers.indexOf("studentId")]
                                  );
                                  const duplicateIds = studentIds.filter(
                                    (id, index) =>
                                      studentIds.indexOf(id) !== index
                                  );

                                  if (duplicateIds.length > 0) {
                                    errors.push(
                                      `Duplicate student IDs found: ${Array.from(
                                        new Set(duplicateIds)
                                      )
                                        .slice(0, 5)
                                        .join(", ")}${duplicateIds.length > 5
                                          ? ` and ${duplicateIds.length - 5
                                          } more`
                                          : ""
                                      }`
                                    );
                                  }

                                  const questionFields = headers.filter((h) =>
                                    h.startsWith("Q")
                                  );
                                  if (questionFields.length === 0) {
                                    errors.push(
                                      "No question data found. CSV must include question columns (Q1, Q2, etc.)"
                                    );
                                  }

                                  // Validate question count against exam questions
                                  if (uploadInfo?.examQuestions) {
                                    const questionCountValidation = validateQuestionCount(headers, uploadInfo.examQuestions);
                                    if (!questionCountValidation.isValid) {
                                      errors.push(questionCountValidation.error!);
                                    }
                                  }

                                  // Validate variant numbers against available exam variants
                                  if (uploadInfo?.variants) {
                                    const variantValidation = validateVariantNumbers(data, headers, uploadInfo.variants);
                                    if (!variantValidation.isValid) {
                                      errors.push(variantValidation.error!);
                                    }
                                  }

                                  const result: ParsedCSV = {
                                    headers,
                                    data,
                                    isValid: errors.length === 0,
                                    errors,
                                  };

                                  setParsedData(result);

                                  if (errors.length > 0) {
                                    toast.error(
                                      `CSV parse error: ${errors.join(", ")}`
                                    );
                                  } else {
                                    toast.success("CSV parsing successful!");
                                    setPreviewData([
                                      headers,
                                      ...data.slice(0, 5),
                                    ]);
                                  }
                                } catch (error) {
                                  console.error("CSV parse error:", error);
                                  toast.error(
                                    `CSV parsing error: ${error instanceof Error
                                      ? error.message
                                      : "Unknown error"
                                    }`
                                  );
                                } finally {
                                  setIsLoading(false);
                                }
                              };

                              reader.onerror = () => {
                                setIsLoading(false);
                                toast.error("Failed to read file");
                              };

                              reader.readAsText(selectedFile);
                            }
                          }}
                          accept=".csv"
                          required
                          data-testid="file-upload-input"
                        />
                      </label>
                      <p className="pl-1 text-sm text-gray-500">
                        or drag and drop your CSV file here
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Supports CSV format, with a size not exceeding 10MB
                    </p>
                    {file && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-800">
                          Selected file:{" "}
                          <span className="font-medium">{file.name}</span>
                        </p>
                        {isLoading && (
                          <div className="mt-2 text-sm text-blue-600">
                            Parsing file...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Format Help Section */}
              <div className="mb-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      Need help formatting your CSV file?
                    </h4>
                    <p className="text-sm text-gray-500">
                      Download our template to see the correct format
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      window.open(
                        "/templates/omr-results-template.txt",
                        "_blank"
                      );
                    }}
                    className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    View Format Guide
                  </button>
                </div>
              </div>

              {/* parsing result */}
              {parsedData && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    CSV Parsing Results
                    {parsedData.isValid ? (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Verification Successful
                      </span>
                    ) : (
                      <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                        Verification Error
                      </span>
                    )}
                  </h3>

                  {parsedData.errors.length > 0 && (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            Found {parsedData.errors.length} Error
                            {parsedData.errors.length > 1 ? "s" : ""}
                          </h3>
                          <div className="mt-2 text-sm text-red-700">
                            <ul className="list-disc pl-5 space-y-1">
                              {parsedData.errors.map((error, index) => (
                                <li key={index}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* data preview */}
                  {parsedData.isValid && previewData.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {previewData[0].map((header, index) => (
                                <th
                                  key={index}
                                  scope="col"
                                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {previewData.slice(1).map((row, rowIndex) => (
                              <tr key={rowIndex}>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500">
                        Displaying {previewData.length - 1} rows of data
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* submit button */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleSubmit}
                  data-testid="submit-button"
                  disabled={
                    !file || isLoading || !parsedData || !parsedData.isValid
                  }
                  className="px-4 py-2 bg-[#002144] text-white rounded-lg hover:bg-[#003366] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? "Uploading..." : "Submit"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}
