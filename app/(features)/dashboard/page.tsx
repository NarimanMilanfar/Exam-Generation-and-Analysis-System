"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Sidebar from "../../components/Sidebar";
import {
  isValidCourseCode,
  formatCourseCode,
} from "../../lib/stringFormatting";
import { useOnboarding } from "../../hooks/useOnboarding";
import OnboardingModal from "../../components/onboarding/OnboardingModal";

// Course Card Component for Exam Management
interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
  createdAt: string;
}

function CourseCard({
  course,
  onClick,
}: {
  course: Course;
  onClick: () => void;
}) {
  const router = useRouter();

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent the card click from firing
    router.push(`/course/${course.id}/settings`);
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer"
    >
      <div className="h-32 relative" style={{ backgroundColor: course.color }}>
        <div
          className="absolute top-3 right-3 cursor-pointer hover:bg-white/20 rounded-full p-1 transition-colors duration-200 group"
          onClick={handleSettingsClick}
          title="Course Settings"
        >
          <div className="w-2 h-2 bg-white/60 group-hover:bg-white/90 rounded-full mb-1 transition-colors duration-200"></div>
          <div className="w-2 h-2 bg-white/60 group-hover:bg-white/90 rounded-full mb-1 transition-colors duration-200"></div>
          <div className="w-2 h-2 bg-white/60 group-hover:bg-white/90 rounded-full transition-colors duration-200"></div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-lg mb-2">
          {course.name}
        </h3>
        <p className="text-gray-600 text-sm mb-3">{course.description}</p>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{course.examCount} exams</span>
          <span>{course.questionCount} questions</span>
        </div>
      </div>
    </div>
  );
}

function AddCourseCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-brand-navy"
    >
      <div className="h-32 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-navy rounded-full flex items-center justify-center mx-auto mb-2">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-600">
            Create Course
          </span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 text-lg">New Course</h3>
        <p className="text-gray-600 text-sm mt-1">
          Organize your exams and questions
        </p>
      </div>
    </div>
  );
}

// Course Creation Modal
function CreateCourseModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (courseData: {
    name: string;
    description: string;
    color: string;
  }) => void;
}) {
  const [courseCode, setCourseCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#10b981");
  const [courseCodeError, setCourseCodeError] = useState("");
  const [isCourseCodeValid, setIsCourseCodeValid] = useState(false);

  const colors = [
    "#10b981",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#3b82f6",
    "#06b6d4",
    "#84cc16",
    "#f97316",
    "#ec4899",
    "#6366f1",
  ];

  const handleCourseCodeChange = (value: string) => {
    // Automatically capitalize input
    const upperValue = value.toUpperCase();
    setCourseCode(upperValue);

    // Clear previous errors
    setCourseCodeError("");

    if (upperValue.trim()) {
      // Try to format the course code
      const formatted = formatCourseCode(upperValue);

      if (formatted) {
        setCourseCode(formatted);
        setIsCourseCodeValid(true);
        // Show success toast for valid format
        if (formatted !== upperValue) {
          toast.success(`✨ Auto-formatted to: ${formatted}`, {
            duration: 2000,
            position: "top-right",
          });
        }
      } else {
        setIsCourseCodeValid(false);
        setCourseCodeError(
          "Course code must be 3-4 letters, 1 space, and 3 digits (e.g., CSC 101 or COSC 101)"
        );
      }
    } else {
      setIsCourseCodeValid(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate course code is required and valid
    if (!courseCode.trim()) {
      setCourseCodeError("Course code is required");
      toast.error("Please enter a course code", {
        duration: 3000,
        position: "top-right",
      });
      return;
    }

    if (!isCourseCodeValid) {
      setCourseCodeError(
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

    onSubmit({
      name: courseCode.trim(),
      description: description.trim(),
      color,
    });
    setDescription("");
    setColor("#10b981");
    setCourseCode("");
    setCourseCodeError("");
    setIsCourseCodeValid(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Create New Course
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Course Code
            </label>
            <input
              type="text"
              value={courseCode}
              onChange={(e) => handleCourseCodeChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy ${
                courseCodeError
                  ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                  : isCourseCodeValid
                  ? "border-green-300 focus:ring-green-500 focus:border-green-500"
                  : "border-gray-300"
              }`}
              placeholder="e.g., CSC 101 or COSC 101"
              maxLength={8}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Format: 3-4 letters + space + 3 digits (e.g., CSC 101, COSC 101,
              MATH 200)
            </p>
            {courseCodeError && (
              <p className="text-red-600 text-sm mt-1">{courseCodeError}</p>
            )}
            {isCourseCodeValid && (
              <p className="text-green-600 text-sm mt-1">
                ✓ Valid course code format
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
              placeholder="Brief description of the course"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Course Color
            </label>
            <div className="grid grid-cols-5 gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    color === colorOption
                      ? "border-gray-800"
                      : "border-gray-300"
                  }`}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                if (courseCode.trim()) {
                  toast(
                    "💡 Remember: Course codes need 3-4 letters + space + 3 digits",
                    {
                      duration: 3000,
                      position: "top-right",
                      style: {
                        background: "#f59e0b",
                        color: "white",
                      },
                    }
                  );
                }
                onClose();
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-navy text-white rounded-md hover:bg-navy-800 transition-colors"
            >
              Create Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Onboarding integration
  const {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    refetchStatus,
    onboardingStatus,
  } = useOnboarding();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    } else if (status === "authenticated" && session?.user?.role === "ADMIN") {
      router.push("/admin/dashboard");
    } else if (status === "authenticated") {
      fetchCourses();
    }
  }, [status, session, router]);

  // Refetch onboarding status when courses change (user creates first course)
  useEffect(() => {
    if (courses.length > 0 && onboardingStatus?.isNewUser) {
      refetchStatus();
    }
  }, [courses.length, onboardingStatus?.isNewUser, refetchStatus]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      // Courses loaded
    }
  };

  const handleCreateCourse = async (courseData: {
    name: string;
    description: string;
    color: string;
  }) => {
    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(courseData),
      });

      if (response.ok) {
        const newCourse = await response.json();
        setCourses([...courses, newCourse]);
        // Show success toast
        toast.success(`Course "${courseData.name}" created successfully!`, {
          duration: 4000,
          position: "top-right",
          icon: "🎉",
        });
      } else {
        const errorData = await response.json();
        console.error("Failed to create course");
        toast.error(
          `Failed to create course: ${errorData.message || "Unknown error"}`,
          {
            duration: 4000,
            position: "top-right",
          }
        );
      }
    } catch (error) {
      console.error("Error creating course:", error);
      toast.error(
        "Network error. Please check your connection and try again.",
        {
          duration: 4000,
          position: "top-right",
        }
      );
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Manage your courses and exams
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
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
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Courses
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {courses?.length || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
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
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Exams
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {courses?.reduce(
                      (sum, course) => sum + course.examCount,
                      0
                    ) || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
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
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Number of Questions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {courses?.reduce(
                      (sum, course) => sum + course.questionCount,
                      0
                    ) || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Courses Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">My Courses</h2>
              <button
                onClick={() => {
                  setIsCreateModalOpen(true);
                  // Show info toast about naming convention
                  toast(
                    "💡 Course codes must follow format: 3-4 letters + space + 3 digits",
                    {
                      duration: 5000,
                      position: "top-right",
                      style: {
                        background: "#3b82f6",
                        color: "white",
                      },
                    }
                  );
                }}
                className="bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
              >
                Create Course
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses?.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onClick={() => router.push(`/course/${course.id}`)}
                />
              ))}
              <AddCourseCard
                onClick={() => {
                  setIsCreateModalOpen(true);
                  // Show info toast about naming convention
                  toast(
                    "💡 Course codes must follow format: 3-4 letters + space + 3 digits",
                    {
                      duration: 5000,
                      position: "top-right",
                      style: {
                        background: "#3b82f6",
                        color: "white",
                      },
                    }
                  );
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateCourse}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={async () => {
          await completeOnboarding();
          await refetchStatus();
        }}
        onSkip={async () => {
          await skipOnboarding();
          await refetchStatus();
        }}
      />
    </div>
  );
}