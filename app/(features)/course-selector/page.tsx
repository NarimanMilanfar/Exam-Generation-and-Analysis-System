"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import Sidebar from "../../components/Sidebar";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
  createdAt: string;
}

const featureConfig = {
  "question-bank": {
    title: "Question Bank",
    description: "Choose which course's question bank you want to view:",
    route: (courseId: string) =>
      `/course/${courseId}/question-bank?sidebar=true`,
    statDisplay: (course: Course) => `${course.questionCount} questions`,
  },
  exambuilder: {
    title: "Exam Builder",
    description: "Choose which course you want to create exams for:",
    route: (courseId: string) => `/course/${courseId}/exams?sidebar=true`,
    statDisplay: (course: Course) => `${course.examCount} exams`,
  },
  templates: {
    title: "Templates",
    description: "Choose which course you want to manage templates for:",
    route: (courseId: string) => `/course/${courseId}/templates?sidebar=true`,
    statDisplay: (course: Course) => `Template management`,
  },
  analytics: {
    title: "Analytics",
    description: "Choose which course you want to view analytics for:",
    route: (courseId: string) => `/course/${courseId}/analytics?sidebar=true`,
    statDisplay: (course: Course) =>
      `${course.examCount} exams • ${course.questionCount} questions`,
  },
  activity: {
    title: "Activity",
    description: "Choose which course's activity you want to view:",
    route: (courseId: string) => `/course/${courseId}/activity?sidebar=true`,
    statDisplay: (course: Course) => `Course activity log`,
  },
};

function CourseSelectorContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const feature = searchParams?.get("feature") || "exambuilder";
  const [courses, setCourses] = useState<Course[]>([]);

  const config =
    featureConfig[feature as keyof typeof featureConfig] ||
    featureConfig.exambuilder;

  useEffect(() => {
    if (status === "authenticated") {
      fetchCourses();
    } else if (status === "unauthenticated") {
      router.push("/auth/login");
    }
  }, [status, router]);

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (!response.ok) throw new Error("Failed to fetch courses");
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Failed to load courses");
    }
  };

  const handleCourseSelection = (selectedCourseId: string) => {
    router.push(config.route(selectedCourseId));
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
        <div className="p-8 overflow-y-auto max-h-screen">
          {/* Course Selection Modal */}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <h2 className="text-xl font-bold text-brand-navy mb-4">
                Select a Course
              </h2>
              <p className="text-gray-600 mb-6">{config.description}</p>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleCourseSelection(course.id)}
                    className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-brand-navy transition-all"
                    style={{
                      borderLeftColor: course.color,
                      borderLeftWidth: "4px",
                    }}
                  >
                    <div className="font-medium text-gray-900">
                      {course.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {config.statDisplay(course)}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CourseSelectorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <CourseSelectorContent />
    </Suspense>
  );
}
