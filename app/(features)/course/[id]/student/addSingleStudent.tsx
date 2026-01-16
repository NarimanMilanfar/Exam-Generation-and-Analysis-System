"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Student } from "@prisma/client";
import { validateStudentId } from "@/app/lib/studentValidation";

interface Term {
  id: string;
  term: string;
  year: number;
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

interface AddStudentModalProps {
  courseId: string;
  onClose: () => void;
  onStudentAdded: (
    student: {
      id: string;
      name: string;
      studentId: string;
      createdAt?: Date;
      updatedAt?: Date;
    },
    enrollment: Enrollment
  ) => void;
}

export function AddStudentModal({
  courseId,
  onClose,
  onStudentAdded,
}: AddStudentModalProps) {
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentIdError, setStudentIdError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [filteredTerms, setFilteredTerms] = useState<Term[]>([]);
  const [selectedTermId, setSelectedTermId] = useState("");

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const res = await fetch("/api/terms");
        const data = await res.json();
        setTerms(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError("Failed to load term options");
      }
    };
    fetchTerms();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      const filtered = terms.filter((term) => term.year === selectedYear);
      setFilteredTerms(filtered);
      setSelectedTermId("");
    }
  }, [selectedYear, terms]);

  const uniqueYears = Array.from(new Set(terms.map((term) => term.year))).sort(
    (a, b) => b - a
  );

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

    if (!selectedTermId) {
      setError("Please select a term.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/courses/${courseId}/student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          studentId,
          termId: selectedTermId,
        }),
      });

      if (!response.ok) {
        const resJson = await response.json();
        throw new Error(resJson.error || "Failed to add student");
      }

      const result = await response.json();
      onStudentAdded(result.data, result.enrollment);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add New Student</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Student Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="studentId"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Student ID
            </label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => handleStudentIdChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                studentIdError ? "border-red-500" : "border-gray-300"
              }`}
              required
              placeholder="8-digit student number"
            />
            {studentIdError && (
              <p className="mt-1 text-sm text-red-500">{studentIdError}</p>
            )}
          </div>

          <div className="mb-4">
            <label
              htmlFor="year-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Year
            </label>
            <select
              id="year-select"
              className="w-full border px-3 py-2 rounded"
              value={selectedYear !== undefined ? selectedYear.toString() : ""}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              required
            >
              <option value="">-- Select Year --</option>
              {Array.from(new Set(terms.map((t) => t.year))).map((year) => (
                <option key={year} value={year.toString()}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label
              htmlFor="term-select"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Term
            </label>
            <select
              id="term-select"
              value={selectedTermId}
              onChange={(e) => setSelectedTermId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
              disabled={!selectedYear}
            >
              <option value="">-- Select Term --</option>
              {filteredTerms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.term}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-navy text-white rounded-md hover:bg-navy-800 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
