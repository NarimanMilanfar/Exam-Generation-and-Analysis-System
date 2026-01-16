// uploadCSVFile.tsx

import React, { useState, useRef, useEffect } from "react";
import toast, { Toaster } from "react-hot-toast";
import { validateStudentId } from "@/app/lib/studentValidation";

interface StudentData {
  id: string;
  name: string;
  studentId: string;
}

interface Enrollment {
  id: string;
  term: Term;
  student: {
    id: string;
    name: string;
    studentId: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
}

interface UploadCSVFileProps {
  show: boolean;
  onClose: () => void;
  courseId: string;
  termId?: string;
  onSuccess: (newEnrollments: Enrollment[]) => void;
}

interface Term {
  id: string;
  year: number;
  term: string;
}

// Interface for invalid student ID records
interface InvalidStudent {
  row: number; // Original row number (1-based)
  id: string;
  reason: string;
}

// Interface for editable student data
interface EditableStudent {
  originalRow: number; // To track original position
  studentId: string;
  name: string;
}

export default function UploadCSVFile({
  show,
  onClose,
  courseId,
  onSuccess,
}: UploadCSVFileProps) {
  const [parsedData, setParsedData] = useState<string[][] | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [invalidStudents, setInvalidStudents] = useState<InvalidStudent[]>([]);
  const [editableStudents, setEditableStudents] = useState<EditableStudent[]>(
    []
  );
  const [editingIndex, setEditingIndex] = useState<number | null>(null); // Track which row is being edited
  const [editStudentId, setEditStudentId] = useState("");
  const [editName, setEditName] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedTermName, setSelectedTermName] = useState("");

  // Convert parsed data to editable format when parsedData changes
  useEffect(() => {
    if (parsedData && parsedData.length > 0) {
      // Skip header row (index 0), start from data rows
      const students: EditableStudent[] = [];
      for (let i = 1; i < parsedData.length; i++) {
        const row = parsedData[i];
        students.push({
          originalRow: i + 1, // 1-based row number
          studentId: row[0]?.trim() || "",
          name: row[1]?.trim() || "",
        });
      }
      setEditableStudents(students);
      validateAllStudents(students); // Initial validation
    } else {
      setEditableStudents([]);
      setInvalidStudents([]);
    }
  }, [parsedData]);

  // Validate all students and update invalid list
  const validateAllStudents = (students: EditableStudent[]) => {
    const invalid: InvalidStudent[] = [];
    students.forEach((student, index) => {
      const { valid, message } = validateStudentId(student.studentId);
      if (!valid) {
        invalid.push({
          row: student.originalRow,
          id: student.studentId || "empty",
          reason: message,
        });
      }
    });
    setInvalidStudents(invalid);

    // Show validation feedback
    if (invalid.length > 0) {
    } else if (students.length > 0) {
      toast.success("All student IDs are valid");
    }
  };

  useEffect(() => {
    if (!show) return;
    const fetchTerms = async () => {
      try {
        const res = await fetch("/api/terms");
        const data = await res.json();
        setTerms(data || []);
      } catch (err) {
        console.error("Failed to fetch terms", err);
        toast.error("Cannot load terms");
      }
    };
    fetchTerms();
  }, [show]);

  const parseCSV = (text: string): string[][] => {
    const lines = text.trim().split("\n");
    return lines.map((line) => {
      return line.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim());
    });
  };

  /**
   * Validates CSV file format for student roster upload.
   *
   * @param parsedData - Parsed CSV data as 2D string array
   * @returns Object with validation result and error messages
   */
  const validateCSVFormat = (
    parsedData: string[][]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    // Check if file has content
    if (parsedData.length === 0) {
      errors.push("CSV file is empty");
      return { isValid: false, errors };
    }

    // Check if file has at least header + 1 data row
    if (parsedData.length < 2) {
      errors.push(
        "CSV file must contain at least a header row and one student record"
      );
      return { isValid: false, errors };
    }

    const headers = parsedData[0];
    const dataRows = parsedData.slice(1);

    // Check header format - must be exactly "id,name"
    if (headers.length !== 2) {
      errors.push("CSV must have exactly 2 columns. Expected: id,name");
    } else {
      const expectedHeaders = ["id", "name"];
      const actualHeaders = headers.map((h) => h.toLowerCase().trim());

      if (actualHeaders[0] !== "id" || actualHeaders[1] !== "name") {
        errors.push(
          `Invalid headers. Expected: "id,name" but got: "${headers.join(
            ","
          )}" - headers are case sensitive`
        );
      }
    }

    // Check data rows
    const invalidRows: number[] = [];
    const emptyRows: number[] = [];
    const duplicateIds: string[] = [];
    const seenIds = new Set<string>();

    dataRows.forEach((row, index) => {
      const rowNumber = index + 2; // +2 because we start from row 2 (after header)

      // Check for empty rows
      if (
        row.length === 0 ||
        row.every((cell) => !cell || cell.trim() === "")
      ) {
        emptyRows.push(rowNumber);
        return;
      }

      // Check column count
      if (row.length !== 2) {
        invalidRows.push(rowNumber);
        return;
      }

      const id = row[0].trim();
      const name = row.slice(1).join(" ").trim(); // Combine all name parts

      // Check for missing ID or name
      if (!id || !name) {
        if (!id && !name) {
          invalidRows.push(rowNumber);
        } else if (!id) {
          errors.push(`Row ${rowNumber}: Missing student ID`);
        } else if (!name) {
          errors.push(`Row ${rowNumber}: Missing student name`);
        }
        return;
      }

      // Check for duplicate IDs
      if (seenIds.has(id)) {
        duplicateIds.push(id);
      } else {
        seenIds.add(id);
      }

      // Validate ID format (should be numeric, typically 8 digits)
      if (!/^\d+$/.test(id)) {
        errors.push(
          `Row ${rowNumber}: Student ID "${id}" should contain only numbers`
        );
      }

      // Check ID length (warn if not 8 digits, but don't fail)
      if (id.length !== 8) {
        // This is a warning, not an error - some institutions use different ID lengths
        errors.push(
          `Row ${rowNumber}: Student ID "${id}" is ${id.length} digits (typically 8 digits expected)`
        );
      }
    });

    // Report invalid rows
    if (invalidRows.length > 0) {
      errors.push(
        `Invalid data format in rows: ${invalidRows.join(
          ", "
        )}. Each row must have exactly 2 columns: id,name`
      );
    }

    // Report empty rows
    if (emptyRows.length > 0) {
      errors.push(
        `Empty rows found at: ${emptyRows.join(", ")}. Please remove empty rows`
      );
    }

    // Report duplicate IDs
    if (duplicateIds.length > 0) {
      errors.push(
        `Duplicate student IDs found: ${Array.from(new Set(duplicateIds)).join(
          ", "
        )}`
      );
    }

    // Check if we have any valid student records after validation
    const validDataRows = dataRows.filter(
      (row) =>
        row.length === 2 && row[0] && row[0].trim() && row[1] && row[1].trim()
    );

    if (validDataRows.length === 0) {
      errors.push("No valid student records found in the CSV file");
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile && !selectedFile.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }
    setFile(selectedFile);
    setParsedData(null);
    setEditableStudents([]);
    setInvalidStudents([]);
    setEditingIndex(null);
    setValidationErrors([]);

    // Auto-parse the file immediately after selection
    if (selectedFile) {
      setIsParsingFile(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          const parsed = parseCSV(text);
          const validation = validateCSVFormat(parsed);

          if (!validation.isValid) {
            // Store validation errors for display in UI
            setValidationErrors(validation.errors);
            setParsedData(parsed);

            // Show toast notification
            toast.error(
              validation.errors.length === 1
                ? validation.errors[0]
                : `Found ${validation.errors.length} format errors. Check details below.`,
              {
                duration: 6000,
              }
            );
          } else {
            // Clear any previous errors and set parsed data
            setValidationErrors([]);
            setParsedData(parsed);
            toast.success("File parsed successfully");
          }
        }
        setIsParsingFile(false);
      };
      reader.onerror = () => {
        setIsParsingFile(false);
        toast.error("Failed to read file");
      };
      reader.readAsText(selectedFile);
    }
  };

  // Edit functionality
  const handleEdit = (index: number) => {
    const student = editableStudents[index];
    setEditingIndex(index);
    setEditStudentId(student.studentId);
    setEditName(student.name);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditStudentId("");
    setEditName("");
  };

  // Save edited student
  const handleSaveEdit = () => {
    if (editingIndex === null) return;

    // Create updated students array
    const updatedStudents = [...editableStudents];
    updatedStudents[editingIndex] = {
      ...updatedStudents[editingIndex],
      studentId: editStudentId.trim(),
      name: editName.trim(),
    };

    // Update state
    setEditableStudents(updatedStudents);
    setEditingIndex(null);

    // Re-validate all students after edit
    validateAllStudents(updatedStudents);
  };

  // Delete student
  const handleDelete = (index: number) => {
    const updatedStudents = editableStudents.filter((_, i) => i !== index);
    setEditableStudents(updatedStudents);

    // Re-validate after deletion
    validateAllStudents(updatedStudents);
    toast.success("Student record deleted");
  };

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
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleSave = async () => {
    if (!parsedData) {
      toast.error("Please parse the file first");
      return;
    }

    if (editableStudents.length === 0) {
      toast.error("No student data available");
      return;
    }

    // Block upload if there are invalid student IDs
    if (invalidStudents.length > 0) {
      toast.error(
        `Cannot upload: ${invalidStudents.length} invalid student ID(s) found`
      );
      return;
    }

    if (!selectedYear || !selectedTermName) {
      toast.error("Please select both year and term");
      return;
    }

    const matchingTerm = terms.find(
      (t) => t.year === parseInt(selectedYear) && t.term === selectedTermName
    );

    if (!matchingTerm) {
      toast.error("Selected term not found");
      return;
    }

    const termId = matchingTerm.id;

    const dataToSave = editableStudents.map((student) => ({
      id: student.studentId,
      name: student.name,
    }));

    try {
      const res = await fetch(`/api/courses/${courseId}/student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ students: dataToSave, termId }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error("Upload failed: " + err.error);
        return;
      }

      const latestResponse = await fetch(
        `/api/courses/${courseId}/student?termId=${termId}`
      );
      const latestData = await latestResponse.json();

      onSuccess(latestData.enrollments);
      onClose();
      toast.success("Students uploaded successfully");
    } catch (error) {
      console.error("upload error", error);
      toast.error("Upload failed, please try again");
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#002144] text-white px-6 py-4">
          <h2 className="text-lg font-semibold">Upload CSV File</h2>
          <button
            onClick={onClose}
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
          {/* File Upload Section */}
          <div className="mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                isDragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-4">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Choose CSV file to upload
                    </span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      accept=".csv"
                      ref={fileInputRef}
                      className="sr-only"
                      onChange={(e) =>
                        handleFileChange(e.target.files?.[0] || null)
                      }
                    />
                    <span className="mt-2 block text-sm text-gray-500">
                      or drag and drop your CSV file here
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {file && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  Selected file:{" "}
                  <span className="font-medium">{file.name}</span>
                </p>
                {isParsingFile && (
                  <div className="mt-2 text-sm text-blue-600">
                    Parsing file...
                  </div>
                )}
              </div>
            )}

            {/* Validation Errors Section */}
            {validationErrors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
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
                      CSV Format Errors ({validationErrors.length})
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc pl-5 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3">
                      <p className="text-sm text-red-600">
                        Please fix these errors or try uploading again. Use the
                        format guide below for help.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Parsed Data Preview with Edit/Delete */}
            {parsedData && editableStudents.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Parsed Data Preview ({editableStudents.length} students)
                </h3>
                <div className="overflow-auto max-h-64 border border-gray-300 rounded-lg">
                  <table className="table-auto border-collapse w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 font-medium">
                        <th className="border border-gray-300 px-3 py-2 text-left w-36">
                          Student ID
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left">
                          Name
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-left w-32">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {editableStudents.map((student, index) => {
                        // Check if this student ID is invalid
                        const isInvalid = invalidStudents.some(
                          (item) => item.row === student.originalRow 
                        );

                        // Edit mode for current row
                        if (editingIndex === index) {
                          return (
                            <tr
                              key={index}
                              className={
                                index % 2 === 1 ? "bg-blue-50" : "bg-white"
                              }
                            >
                              <td
                                className={`border border-gray-300 px-3 py-2 ${
                                  isInvalid ? "bg-red-50" : ""
                                }`}
                              >
                                <input
                                  type="text"
                                  value={editStudentId}
                                  onChange={(e) =>
                                    setEditStudentId(e.target.value)
                                  }
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                  placeholder="8-digit ID"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded"
                                  placeholder="Student name"
                                />
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleSaveEdit}
                                    className="text-green-600 hover:text-green-800 text-xs"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-gray-600 hover:text-gray-800 text-xs"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        // Normal view
                        return (
                          <tr
                            key={index}
                            className={
                              index % 2 === 1 ? "bg-blue-50" : "bg-white"
                            }
                          >
                            <td
                              className={`border border-gray-300 px-3 py-2 ${
                              isInvalid ? "bg-red-50 text-red-700" : ""
                            }`}
                          >
                            {student.studentId || (
                              <span className="text-gray-400">Empty</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            {student.name || (
                              <span className="text-gray-400">Empty</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-3 py-2">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(index)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(index)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Empty state when no data */}
          {parsedData && editableStudents.length === 0 && (
            <div className="mb-6 p-6 bg-gray-50 rounded-lg text-center">
              <p className="text-gray-500">No student data found in the file</p>
            </div>
          )}

          {/* Term Selection */}
          <div className="mb-4">
            <label
              htmlFor="year-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Year
            </label>
            <select
              id="year-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002144]"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="">-- Select Year --</option>
              {Array.from(new Set(terms.map((t) => t.year))).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label
              htmlFor="term-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Term
            </label>
            <select
              id="term-select"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#002144]"
              value={selectedTermName}
              onChange={(e) => setSelectedTermName(e.target.value)}
              disabled={!selectedYear}
            >
              <option value="">-- Select Term --</option>
              {terms
                .filter((t) => String(t.year) === selectedYear)
                .map((t) => (
                  <option key={t.id} value={t.term}>
                    {t.term}
                  </option>
                ))}
            </select>
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
                  // Open format guide in new tab
                  window.open("/templates/csv-format-guide.txt", "_blank");
                }}
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg transition-colors"
              >
                View Format Guide
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="border border-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                editableStudents.length === 0 ||
                invalidStudents.length > 0 ||
                editingIndex !== null
              }
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save and Upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
