"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar";
import CourseTable from "../components/CourseTable";
import CourseAnalytics from "../components/CourseAnalytics";
import toast from "react-hot-toast";

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

export default function AdminCoursesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"courses" | "analytics">("courses");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
    
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (session?.user.role === "ADMIN") {
      fetchCourses();
      fetchTerms();
    }
  }, [session, pagination.page, selectedTerm]); // fetchCourses and fetchTerms are stable

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

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const searchParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (selectedTerm) {
        searchParams.append("termId", selectedTerm);
      }

      const response = await fetch(`/api/admin/courses?${searchParams}`);
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses);
        setPagination(data.pagination);
      } else {
        toast.error("Failed to fetch courses");
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
      toast.error("Error loading courses");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleTermFilterChange = (termId: string) => {
    setSelectedTerm(termId);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading Course Oversight...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />

      {/* Main Content */}
      <div className="admin-main-content flex-1 ml-16 transition-all duration-300 ease-in-out">
        {/* Top Header */}
        <div className="bg-black text-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <h1 className="text-white text-lg font-semibold">Course Oversight</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Removed System Online status and user icon to reduce user confusion */}
            </div>
          </div>
        </div>

        {/* Course Oversight Content */}
        <div className="p-6 bg-gray-50 min-h-screen">
          {/* Tab Navigation */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab("courses")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "courses"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Course Management
                </button>
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "analytics"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Analytics & Reporting
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "courses" && (
            <CourseTable
              courses={courses}
              setCourses={setCourses}
              loading={loading}
              onRefresh={fetchCourses}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          )}

          {activeTab === "analytics" && (
            <CourseAnalytics
              selectedTerm={selectedTerm}
              onTermChange={handleTermFilterChange}
              terms={terms}
            />
          )}
        </div>
      </div>
    </div>
  );
} 