// app/(features)/course/[id]/student/EditStudent.tsx

"use client";

import React, { useState, useEffect } from "react";
import { validateStudentId } from "@/app/lib/studentValidation";

interface Student {
  id: string;
  name: string;
  studentId: string;
}

interface Props {
  courseId: string;
  termId?: string;
  student: Student;
  enrollmentId: string;
  onClose: () => void;
  onStudentUpdated: (updatedStudent: Student) => void;
}

interface Term {
  id: string;
  term: string;
  year: number;
}

const EditStudent: React.FC<Props> = ({
  student,
  courseId,
  onClose,
  onStudentUpdated,
  enrollmentId,
}) => {
  const [name, setName] = useState(student.name);
  const [studentId, setStudentId] = useState(student.studentId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>();
  const [selectedTermId, setSelectedTermId] = useState<string>("");
  const [studentIdError, setStudentIdError] = useState("");

  // Real-time verification of student number
  const handleStudentIdChange = (value: string) => {
    setStudentId(value);
    if (value.trim()) {
      const { valid, message } = validateStudentId(value);
      setStudentIdError(valid ? "" : message);
    } else {
      setStudentIdError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Student ID verification
    const { valid, message } = validateStudentId(studentId);
    if (!valid) {
      setStudentIdError(message);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(
        `/api/courses/${courseId}/student/${student.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            studentId,
          }),
        }
      );

      if (!response.ok) {
        const errRes = await response.json();
        throw new Error(errRes.error || "Failed to update student");
      }

      const data = await response.json();
      onStudentUpdated(data.student);
      onClose();
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch("/api/terms");
        const data = await res.json();
      } catch (err) {
        console.error("Failed to fetch terms", err);
      }
    };

    fetchTerms();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-lg w-96 overflow-hidden"
      >
        <div className="bg-[#002144] text-white text-center py-3 font-semibold text-lg">
          Edit Student
        </div>

        <div className="p-6">
          <label className="block mb-4">
            <span className="block text-gray-700 font-medium mb-1">Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#335066]"
              required
            />
          </label>

          <label className="block mb-4">
            <span className="block text-gray-700 font-medium mb-1">
              Student ID
            </span>
            <input
              type="text"
              value={studentId}
              onChange={(e) => handleStudentIdChange(e.target.value)}
              className={`border rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-[#002144] ${
                studentIdError ? "border-red-500" : "border-gray-300"
              }`}
              required
              placeholder="8-digit student number"
            />
            {studentIdError && (
              <p className="mt-1 text-sm text-red-500">{studentIdError}</p>
            )}
          </label>
          {error && <p className="text-red-500 mb-4">{error}</p>}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#002144] text-white px-4 py-2 rounded-md hover:bg-[#00162e] transition"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditStudent;
