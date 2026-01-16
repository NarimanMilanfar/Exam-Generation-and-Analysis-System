"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../Sidebar";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface SimpleLayoutProps {
  children: ReactNode;
  course: Course | null;
  title: string;
  description?: string;
  loading?: boolean;
}

export default function SimpleLayout({
  children,
  course,
  title,
  description,
  loading = false,
}: SimpleLayoutProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex">
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

  return (
    <div className="min-h-screen bg-white flex">
      <Sidebar />

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Simple Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            {course ? (
              <div className="flex items-center space-x-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: course.color }}
                ></span>
                <span className="text-lg font-bold text-gray-900">
                  {course.name}
                </span>
                <span className="text-sm text-gray-500">
                  {course.questionCount} questions • {course.examCount} exams
                </span>
              </div>
            ) : (
              <div className="text-lg font-bold text-gray-900">Loading...</div>
            )}

            {/* Go to Course Page Button */}
            {course && (
              <button
                onClick={() => router.push(`/course/${course.id}`)}
                className="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-3 py-1 rounded-md transition-colors text-sm"
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
                <span>Go to Course Page</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-7 overflow-y-auto max-h-screen">{children}</div>
      </div>
    </div>
  );
}
