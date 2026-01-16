"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "../../../../../components/Sidebar";

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

export default function StudentReportListPage() {
  // Authentication and Routing
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;

  // loaded state
  const [isLoading, setIsLoading] = useState(true);

  // Core data status
  const [course, setCourse] = useState<Course | null>(null);
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);

  // status filter rule
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number | "">("");
  const [selectedTermName, setSelectedTermName] = useState<string>("");

  // Calculate the derived data
  const availableYears = useMemo(() => 
    Array.from(new Set(terms.map(t => t.year))).sort((a, b) => b - a), 
    [terms]
  );

  const availableTerms = useMemo(() => {
    const uniqueTermNames = Array.from(new Set(terms.map(t => t.term)));
    return uniqueTermNames.sort();
  }, [terms]);

  const filteredEnrollments = useMemo(() => {
    let result = [...allEnrollments];
    
    if (selectedYear) {
      result = result.filter(e => e.term.year === selectedYear);
    }
    
    if (selectedTermName) {
      result = result.filter(e => e.term.term === selectedTermName);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.student.name.toLowerCase().includes(term) || 
        e.student.studentId.toLowerCase().includes(term)
      );
    }
    
    return result;
  }, [allEnrollments, selectedYear, selectedTermName, searchTerm]);

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

  // Reset all filter conditions
  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedYear("");
    setSelectedTermName("");
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
                <button
                  onClick={() => router.push(`/course/${courseId}/analytics`)}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  Analytics
                </button>
                <div className="text-gray-300">→</div>
                <span className="text-brand-navy font-semibold text-sm">
                  Student Reports
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

        {/* Student reports content */}
        <div className="p-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Student Reports</h2>
              </div>

              {/* selector with reset button */}
              <div className="flex items-center space-x-4 flex-wrap gap-2">
                <input
                  type="text"
                  placeholder="Search by name or student ID"
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-grow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(Number(e.target.value) || "");
                  }}
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
                >
                  <option value="">All Terms</option>
                  {availableTerms.map(termName => (
                    <option key={termName} value={termName}>
                      {termName}
                    </option>
                  ))}
                </select>

                <button
                  onClick={resetAllFilters}
                  className="bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors"
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
                    className="border-b border-gray-200 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors last:border-b-0 cursor-pointer"
                    onClick={() => router.push(`/course/${courseId}/analytics/studentReport/${enrollment.student.id}?termId=${enrollment.term.id}`)}
                  >
                    <div className="flex items-center space-x-4">
                      <p className="font-semibold text-gray-900">{enrollment.student.name}</p>
                      <p className="text-sm text-gray-500">
                        {enrollment.student.studentId} — {enrollment.term.term} {enrollment.term.year}
                      </p>
                    </div>
                    <svg 
                      className="w-5 h-5 text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
                  No students match your current filters
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}