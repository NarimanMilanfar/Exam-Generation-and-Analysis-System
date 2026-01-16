"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../components/layouts/CourseLayout";
import ShareCourseModal from "../../../../components/course/ShareCourseModal";
import {
  isValidCourseCode,
  formatCourseCode,
} from "../../../../lib/stringFormatting";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
  isOwner?: boolean;
}

export default function CourseSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "#10b981",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [courseNameError, setCourseNameError] = useState("");
  const [isCourseNameValid, setIsCourseNameValid] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const colorOptions = [
    { name: "Green", value: "#10b981" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Pink", value: "#ec4899" },
    { name: "Red", value: "#ef4444" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Indigo", value: "#6366f1" },
    { name: "Teal", value: "#14b8a6" },
  ];

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
        setFormData({
          name: courseData.name,
          description: courseData.description || "",
          color: courseData.color,
        });
        setIsCourseNameValid(isValidCourseCode(courseData.name));
        setIsOwner(courseData.isOwner || false);
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

  const handleCourseNameChange = (value: string) => {
    setCourseNameError("");
    const upperValue = value.toUpperCase();
    setFormData({ ...formData, name: upperValue });

    if (upperValue.trim()) {
      const formatted = formatCourseCode(upperValue);
      if (formatted) {
        setFormData({ ...formData, name: formatted });
        setIsCourseNameValid(true);
        if (formatted !== upperValue) {
          toast.success(`✨ Auto-formatted to: ${formatted}`, {
            duration: 2000,
            position: "top-right",
          });
        }
      } else {
        setIsCourseNameValid(false);
        setCourseNameError(
          "Course code must be 3-4 letters, 1 space, and 3 digits (e.g., CSC 101 or COSC 101)"
        );
      }
    } else {
      setIsCourseNameValid(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setCourseNameError("Course name is required");
      toast.error("Course name is required");
      return;
    }

    if (!isCourseNameValid) {
      setCourseNameError(
        "Course code must be 3-4 letters, 1 space, and 3 digits (e.g., CSC 101 or COSC 101)"
      );
      toast.error(
        "Invalid course code format! Use format like CSC 101 or COSC 101",
        {
          duration: 4000,
          position: "top-right",
        }
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
        }),
      });

      if (response.ok) {
        const updatedCourse = await response.json();
        setCourse(updatedCourse);
        setIsOwner(updatedCourse.isOwner || false);
        toast.success("Course updated successfully!");
      } else {
        toast.error("Failed to update course");
      }
    } catch (error) {
      console.error("Error updating course:", error);
      toast.error("Failed to update course");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(
          `Course deleted successfully! Removed ${result.deletedItems.exams} exams and ${result.deletedItems.questions} questions.`
        );
        router.push("/dashboard");
      } else {
        toast.error("Failed to delete course");
      }
    } catch (error) {
      console.error("Error deleting course:", error);
      toast.error("Failed to delete course");
    }
  };

  if (status === "loading" || loading) {
    return (
      <CourseLayout course={null} activeTab="settings" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session || !course) {
    return null;
  }

  return (
    <CourseLayout course={course} activeTab="settings">
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

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Course Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your course information and preferences
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          {/* Course Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Course Information
            </h3>

            <div className="space-y-6">
              {/* Course Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleCourseNameChange(e.target.value)}
                  placeholder="e.g., CSC 101, COSC 499, MATH 201"
                  className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 transition-colors ${
                    courseNameError
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : isCourseNameValid
                      ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                      : "border-gray-300 focus:ring-brand-navy focus:border-brand-navy"
                  }`}
                  maxLength={8}
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  Format: 3-4 letters + space + 3 digits (e.g., CSC 101, COSC
                  499, MATH 201)
                </p>
                {courseNameError && (
                  <p className="text-red-600 text-sm mt-1">{courseNameError}</p>
                )}
                {isCourseNameValid && !courseNameError && (
                  <p className="text-green-600 text-sm mt-1">
                    ✓ Valid course code format
                  </p>
                )}
              </div>

              {/* Course Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the course"
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-navy"
                />
              </div>

              {/* Course Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Course Color
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {colorOptions.map((colorOption) => (
                    <button
                      key={colorOption.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, color: colorOption.value })
                      }
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        formData.color === colorOption.value
                          ? "border-gray-800 ring-2 ring-gray-400"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      style={{ backgroundColor: colorOption.value }}
                    >
                      <div className="text-white text-sm font-medium">
                        {colorOption.name}
                      </div>
                      {formData.color === colorOption.value && (
                        <div className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Course Sharing - Only visible to course owners */}
          {isOwner && (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Course Sharing
              </h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Collaborate with other instructors by sharing this course. You
                  can give them view-only or edit access to help manage exams
                  and question banks.
                </p>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
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
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                    />
                  </svg>
                  Share Course
                </button>
              </div>
            </div>
          )}

          {/* Course Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Course Statistics
            </h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center p-6 bg-blue-50 rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {course.examCount}
                </div>
                <div className="text-sm text-gray-600 mt-1">Exams Created</div>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {course.questionCount}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  Questions Created
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            {/* Only show delete button to course owners */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg transition-colors font-medium"
              >
                Delete Course
              </button>
            )}

            {!isOwner && <div></div>}

            <button
              type="submit"
              disabled={isSaving}
              className="bg-brand-navy hover:bg-navy-800 text-white px-8 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Share Course Modal */}
      {showShareModal && (
        <ShareCourseModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          courseId={courseId}
          courseName={course.name}
        />
      )}

      {/* Delete Confirmation Modal - Only for owners */}
      {showDeleteModal && isOwner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 w-full max-w-md mx-4 shadow-2xl">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Course
                </h3>
                <p className="text-sm text-gray-600">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  "{course.name}"
                </span>
                ?
              </p>
              <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium">
                  This will permanently delete:
                </p>
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  <li>{course.examCount} exams</li>
                  <li>{course.questionCount} questions</li>
                  <li>All associated data</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDelete();
                }}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Delete Course
              </button>
            </div>
          </div>
        </div>
      )}
    </CourseLayout>
  );
}