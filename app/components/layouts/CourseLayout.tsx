"use client";

import { ReactNode } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "../Sidebar";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface CourseLayoutProps {
  children: ReactNode;
  course: Course | null;
  activeTab: "questions" | "exams" | "analytics" | "settings" | "templates" | "activity";
  loading?: boolean;
}

export default function CourseLayout({
  children,
  course,
  activeTab,
  loading = false,
}: CourseLayoutProps) {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.id as string;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-navy"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Course navigation tabs - Activity tab added for collaboration tracking
  const navigationItems = [
    {
      key: "questions",
      label: "Questions",
      path: `/course/${courseId}/question-bank`,
    },
    {
      key: "exams",
      label: "Exams",
      path: `/course/${courseId}/exams`,
    },
    {
      key: "templates",
      label: "Templates",
      path: `/course/${courseId}/templates`,
    },
    {
      key: "analytics",
      label: "Analytics",
      path: `/course/${courseId}/analytics`,
    },
    {
      key: "activity",           // NEW: Activity tracking for collaboration
      label: "Activity",
      path: `/course/${courseId}/activity`,
    },
    {
      key: "settings",
      label: "Settings",
      path: `/course/${courseId}/settings`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Thin Consistent Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="text-gray-400 hover:text-gray-600 flex items-center text-sm font-medium"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Dashboard
                </button>
                <div className="text-gray-300">→</div>
                <button
                  onClick={() => router.push(`/course/${courseId}`)}
                  className="text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  {course?.name || "Course"}
                </button>
                <div className="text-gray-300">→</div>
                <span className="text-brand-navy font-semibold text-sm capitalize">
                  {activeTab}
                </span>
              </div>

              {course && (
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: course.color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">
                    {course.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Clean Navigation Bar */}
          <div className="px-8">
            <nav className="flex space-x-8">
              {navigationItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => router.push(item.path)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === item.key
                      ? "border-brand-navy text-brand-navy"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
