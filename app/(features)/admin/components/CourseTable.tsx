"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Image from "next/image";
import CourseModal from "./CourseModal";
import CourseConfigModal from "./CourseConfigModal";
import DeleteConfirmationModal from "./DeleteConfirmationModal";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Term {
  id: string;
  term: string;
  year: number;
}

interface Course {
  id: string;
  name: string;
  description: string | null;
  color: string;
  section: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  term: Term | null;
  stats: {
    examCount: number;
    questionCount: number;
    enrollmentCount: number;
  };
}

interface CourseTableProps {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
  loading: boolean;
  onRefresh: () => void;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}

export default function CourseTable({
  courses,
  setCourses,
  loading,
  onRefresh,
  pagination,
  onPageChange,
}: CourseTableProps) {
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [configuringCourse, setConfiguringCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [termFilter, setTermFilter] = useState("all");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [terms, setTerms] = useState<Term[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);

  useEffect(() => {
    fetchTerms();
    fetchInstructors();
  }, []);

  const fetchTerms = async () => {
    try {
      const response = await fetch("/api/admin/terms");
      if (response.ok) {
        const termsData = await response.json();
        setTerms(termsData);
      }
    } catch (error) {
      console.error("Error fetching terms:", error);
    }
  };

  const fetchInstructors = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const usersData = await response.json();
        const teacherUsers = usersData.filter((user: User) => user.role === "TEACHER");
        setInstructors(teacherUsers);
      }
    } catch (error) {
      console.error("Error fetching instructors:", error);
    }
  };

  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCourseIds.length === courses.length) {
      setSelectedCourseIds([]);
    } else {
      setSelectedCourseIds(courses.map(course => course.id));
    }
  };

  const handleDeleteClick = () => {
    if (selectedCourseIds.length === 0) {
      toast.error("Please select courses to delete");
      return;
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const deletePromises = selectedCourseIds.map(courseId =>
        fetch(`/api/admin/courses/${courseId}`, { method: "DELETE" })
      );

      const responses = await Promise.all(deletePromises);
      const allSuccessful = responses.every(response => response.ok);

      if (allSuccessful) {
        toast.success(`${selectedCourseIds.length} course(s) deleted successfully`);
        setSelectedCourseIds([]);
        onRefresh();
      } else {
        toast.error("Some courses could not be deleted");
      }
    } catch (error) {
      console.error("Error deleting courses:", error);
      toast.error("Failed to delete courses");
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleAddCourse = () => {
    setEditingCourse(null);
    setShowCourseModal(true);
  };

  const handleEditCourse = (course: Course) => {
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleConfigCourse = (course: Course) => {
    setConfiguringCourse(course);
    setShowConfigModal(true);
  };

  const handleCourseModalClose = () => {
    setShowCourseModal(false);
    setEditingCourse(null);
  };

  const handleConfigModalClose = () => {
    setShowConfigModal(false);
    setConfiguringCourse(null);
  };

  const handleCourseSaved = () => {
    onRefresh();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setTermFilter("all");
    setInstructorFilter("all");
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch =
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTerm = termFilter === "all" || course.term?.id === termFilter;
    const matchesInstructor = instructorFilter === "all" || course.user.id === instructorFilter;

    return matchesSearch && matchesTerm && matchesInstructor;
  });

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">Loading courses...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Course Management</h2>
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteClick}
              disabled={selectedCourseIds.length === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedCourseIds.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              Delete Course{selectedCourseIds.length > 1 ? "s" : ""}
              {selectedCourseIds.length > 0 && ` (${selectedCourseIds.length})`}
            </button>
            <button
              onClick={handleAddCourse}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add New Course
            </button>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by course name, instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="flex gap-3 items-center">
            <select
              value={termFilter}
              onChange={(e) => setTermFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Terms</option>
              {terms.map((term) => (
                <option key={term.id} value={term.id}>
                  {term.term} {term.year}
                </option>
              ))}
            </select>

            <select
              value={instructorFilter}
              onChange={(e) => setInstructorFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">All Instructors</option>
              {instructors.map((instructor) => (
                <option key={instructor.id} value={instructor.id}>
                  {instructor.name || instructor.email}
                </option>
              ))}
            </select>

            {(searchQuery || termFilter !== "all" || instructorFilter !== "all") && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredCourses.length} of {pagination.totalCount} courses
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedCourseIds.length === filteredCourses.length && filteredCourses.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statistics</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <p className="mt-2 text-lg font-medium">No courses found</p>
                    <p className="text-sm">
                      {courses.length === 0 ? "Get started by adding your first course." : "Try adjusting your search or filter criteria."}
                    </p>
                    {courses.length > 0 && (
                      <button
                        onClick={clearFilters}
                        className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredCourses.map((course) => (
                <tr
                  key={course.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedCourseIds.includes(course.id) ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedCourseIds.includes(course.id)}
                      onChange={() => handleSelectCourse(course.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div
                        className="flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-white font-medium text-sm"
                        style={{ backgroundColor: course.color }}
                      >
                        {course.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{course.name}</div>
                        {course.description && (
                          <div className="text-sm text-gray-500">{course.description}</div>
                        )}
                        {course.section && (
                          <div className="text-xs text-gray-400">Section {course.section}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{course.user.name}</div>
                    <div className="text-sm text-gray-500">{course.user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {course.term ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {course.term.term} {course.term.year}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">No term</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>{course.stats.examCount} exams</div>
                      <div>{course.stats.questionCount} questions</div>
                      <div>{course.stats.enrollmentCount} students</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => handleEditCourse(course)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleConfigCourse(course)}
                        className="text-purple-600 hover:text-purple-900 font-medium"
                      >
                        Config
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)}
                </span>{" "}
                of <span className="font-medium">{pagination.totalCount}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pagination.page === pageNum
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Course Modal */}
      <CourseModal
        isOpen={showCourseModal}
        onClose={handleCourseModalClose}
        course={editingCourse}
        onSave={handleCourseSaved}
        terms={terms}
        instructors={instructors}
      />

      {/* Course Config Modal */}
      <CourseConfigModal
        isOpen={showConfigModal}
        onClose={handleConfigModalClose}
        course={configuringCourse}
        onSave={onRefresh}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete Courses"
        message={`Are you sure you want to delete ${selectedCourseIds.length} course(s)? This will permanently remove all associated exams, questions, and enrollments.`}
        confirmText="Delete"
        itemCount={selectedCourseIds.length}
      />
    </div>
  );
}