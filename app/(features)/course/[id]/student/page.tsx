"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "../../../../components/Sidebar";
import { AddStudentModal } from './addSingleStudent';
import EditStudentModal from './EditStudent';
import UploadCSVFile from "./uploadCSVFile";

// define the type
interface Student {
  id: string;
  name: string;
  studentId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface Term {
  id: string;
  term: string;
  year: number;
}

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
}

interface Enrollment {
  id: string;
  student: Student;
  term: Term;
  courseId: string;
}

export default function StudentManagementPage() {
  // Authentication and Routing
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;

  // loaded state
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  // Core data status
  const [course, setCourse] = useState<Course | null>(null);
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // status filter rule
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedTermName, setSelectedTermName] = useState<string>(""); // Change to store the term name instead of the ID

  // Modal box state
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);

  // Calculate the derived data
  const availableYears = useMemo(() => 
    Array.from(new Set(terms.map(t => t.year))).sort((a, b) => b - a), 
    [terms]
  );

  const availableTerms = useMemo(() => {
    // Only retain the unique term name (year not considered)
    const uniqueTermNames = Array.from(new Set(terms.map(t => t.term)));
    return uniqueTermNames.sort(); // sort by name
  }, [terms]);

  const filteredEnrollments = useMemo(() => {
    let result = [...allEnrollments];
    
    // 1. Filter by year (if a year is selected)
    if (selectedYear) {
      result = result.filter(e => e.term.year === selectedYear);
    }
    
    // 2. Filter by term name (if term is selected)
    if (selectedTermName) {
      result = result.filter(e => e.term.term === selectedTermName);
    }
    
    // 3. Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.student.name.toLowerCase().includes(term) || 
        e.student.studentId.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [allEnrollments, selectedYear, selectedTermName, searchTerm]); // change to selectedTermName

  const students = useMemo(() => 
    filteredEnrollments.map(e => e.student), 
    [filteredEnrollments]
  );

  // Data acquisition function
  const fetchCourseData = useCallback(async () => {
    const response = await fetch(`/api/courses/${courseId}`);
    if (!response.ok) throw new Error("Failed to fetch course");
    setCourse(await response.json());
  }, [courseId]);

  const fetchAllEnrollments = useCallback(async () => {
    try {
      const res = await fetch(`/api/courses/${courseId}/student`);
      if (!res.ok) throw new Error("Failed to fetch enrollments");
      
      const data = await res.json();
      const enrollments = Array.isArray(data.enrollments) ? data.enrollments : [];
      setAllEnrollments(enrollments);
    } catch (error) {
      console.error("Error fetching enrollments:", error);
      toast.error("Failed to load enrollments");
      setAllEnrollments([]);
    }
  }, [courseId]);

  const fetchTerms = useCallback(async () => {
    const res = await fetch("/api/terms");
    if (!res.ok) throw new Error("Failed to fetch terms");
    setTerms(await res.json());
  }, []);

  // Initialization loading
  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchCourseData(),
          fetchAllEnrollments(),
          fetchTerms()
        ]);
      } catch (error) {
        toast.error("Failed to load initial data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [courseId, fetchCourseData, fetchAllEnrollments, fetchTerms]);

  // operating function
  const handleStudentAdded = useCallback(async () => {
    await fetchAllEnrollments();
    setShowAddStudentModal(false);
    toast.success("Student added successfully");
  }, [fetchAllEnrollments]);

  const handleDelete = useCallback(async (studentId: string, termId: string) => {
    try {
      setIsMutating(true);
      const res = await fetch(
        `/api/courses/${courseId}/student/${studentId}?termId=${termId}`,
        { method: "DELETE" }
      );
      
      if (!res.ok) throw new Error("Failed to delete student");
      
      await fetchAllEnrollments();
      toast.success("Student deleted successfully");
    } finally {
      setIsMutating(false);
    }
  }, [courseId, fetchAllEnrollments]);

  const handleDeleteAllStudents = useCallback(async () => {
    try {
      setIsMutating(true);
      let url = `/api/courses/${courseId}/student`;
      // Build deleted query parameters (supporting both year and term filtering simultaneously)）
      const params = new URLSearchParams();
      if (selectedYear) params.append("year", selectedYear.toString());
      if (selectedTermName) params.append("term", selectedTermName);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await fetch(url, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete students");
      
      await fetchAllEnrollments();
      toast.success("All students deleted successfully");
    } finally {
      setIsMutating(false);
      setShowConfirmModal(false);
    }
  }, [courseId, selectedYear, selectedTermName, fetchAllEnrollments]); // change to selectedTermName

  const handleEditSuccess = useCallback(async () => {
    await fetchAllEnrollments();
    setShowEditModal(false);
    toast.success("Student updated successfully");
  }, [fetchAllEnrollments]);

  const handleUploadSuccess = useCallback(async () => {
    await fetchAllEnrollments();
    setShowUploadModal(false);
    toast.success("Students uploaded successfully");
  }, [fetchAllEnrollments]);

  // Reset all filter conditions
  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedYear("");
    setSelectedTermName(""); // reset term name
  };

  // loaded state
  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    );
  }

  if (!session || !course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-center" />
      <Sidebar />

      {/* Main content area */}
      <div className="main-content flex-1">
        {/* ShowOnTop */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Dashboard
                </button>
                <div className="text-gray-300">→</div>
                <button
                  onClick={() => router.push(`/course/${courseId}`)}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  {course.name}
                </button>
                <div className="text-gray-300">→</div>
                <span className="text-brand-navy font-semibold text-sm">
                  Student Management
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: course.color }}></div>
                <span className="text-sm font-medium text-gray-700">
                  {students.length} Students
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Student management content */}
        <div className="p-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Students Management</h2>
                <div className="flex space-x-4">
                  <button
                    className="bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
                    onClick={() => setShowAddStudentModal(true)}
                    disabled={isMutating}
                  >
                    Add Student
                  </button>
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    onClick={() => setShowUploadModal(true)}
                    disabled={isMutating}
                  >
                    Upload CSV
                  </button>
                  <button
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isMutating || students.length === 0}
                  >
                    Delete All
                  </button>
                </div>
              </div>

              {/* selector with reset button */}
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search by name or student ID"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-grow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isMutating}
                />

                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value) || "");
                  }}
                  disabled={isMutating}
                >
                  <option value="">All Years</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>

                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={selectedTermName}
                  onChange={(e) => setSelectedTermName(e.target.value)}
                  disabled={isMutating}
                >
                  <option value="">All Terms</option>
                  {availableTerms.map(termName => (
                    <option key={termName} value={termName}>
                      {termName} {/* term name */}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetAllFilters}
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
                  disabled={isMutating}
                >
                  Reset Filters
                </button>
              </div>
            </div>

            {/* student list */}
            {filteredEnrollments.length > 0 ? (
              <div className="space-y-4 mt-6">
                {filteredEnrollments.map((enrollment) => (
                  <div
                    key={`${enrollment.student.id}-${enrollment.term.id}`}
                    className="border-b border-gray-200 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors last:border-b-0"
                  >
                    <div className="flex items-center space-x-4">
                      <p className="font-semibold text-gray-900">{enrollment.student.name}</p>
                      <p className="text-sm text-gray-500">
                        {enrollment.student.studentId} — {enrollment.term.term} {enrollment.term.year}
                      </p>
                    </div>
                    <div className="flex space-x-3">
                      <button
                        className="bg-[#335066] text-white px-3 py-1 rounded-md font-medium hover:bg-[#2A4357] transition-colors"
                        onClick={() => {
                          setEditStudent(enrollment.student);
                          setShowEditModal(true);
                        }}
                        disabled={isMutating}
                      >
                        Edit
                      </button>
                      <button
                        className="bg-[#E46A76] text-white px-3 py-1 rounded-md font-medium hover:bg-[#CC5A66] transition-colors"
                        onClick={() => handleDelete(enrollment.student.id, enrollment.term.id)}
                        disabled={isMutating}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-6 text-center py-12 mt-6">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Students Found
                </h3>
                <p className="text-gray-600 mb-6">
                  Add individual students or upload a CSV file to bulk import
                </p>
                <div className="flex justify-center space-x-4">
                  <button 
                    className="bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
                    onClick={() => setShowAddStudentModal(true)}
                    disabled={isMutating}
                  >
                    Add Student
                  </button>
                  <button
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    onClick={() => setShowUploadModal(true)}
                    disabled={isMutating}
                  >
                    Upload CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* modal box */}
      {showAddStudentModal && (
        <AddStudentModal
          courseId={courseId}
          onClose={() => setShowAddStudentModal(false)}
          onStudentAdded={handleStudentAdded}
        />
      )}
      
      {showUploadModal && (
        <UploadCSVFile
          show={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          courseId={courseId}
          onSuccess={handleUploadSuccess}
        />
      )}
      
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              Delete {selectedTermName || selectedYear 
                ? `filtered students (${selectedTermName ? selectedTermName : ''} ${selectedYear ? selectedYear : ''})` 
                : 'all students'}?
            </h2>
            <p className="text-sm text-gray-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAllStudents}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                disabled={isMutating}
              >
                {isMutating ? "Deleting..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showEditModal && editStudent && (
        <EditStudentModal
          courseId={courseId}
          student={editStudent}
          enrollmentId={
            allEnrollments.find(e => e.student.id === editStudent.id)?.id || ""
          }
          onClose={() => setShowEditModal(false)}
          onStudentUpdated={handleEditSuccess}
        />
      )}
    </div>
  );
}