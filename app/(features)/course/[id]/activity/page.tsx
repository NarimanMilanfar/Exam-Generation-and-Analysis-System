"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import CourseLayout from "../../../../components/layouts/CourseLayout";
import SimpleLayout from "../../../../components/layouts/SimpleLayout";
import ActivityItem from "../../../../components/activity/ActivityItem";

interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface ActivityLog {
  id: string;
  userId: string;
  courseId: string;
  action: string;
  resource: string | null;
  resourceId: string | null;
  details: string | null;
  createdAt: string;
  user: User;
}

interface ActivityStats {
  totalActivities: number;
  recentActivities: number;
  topUsers: {
    userId: string;
    _count: { userId: number };
  }[];
}

function ActivityPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params?.id as string;
  // Check if accessed via sidebar navigation (different layout)
  const isSidebarAccess = searchParams?.get("sidebar") === "true";
  
  // Component state for activity data and UI
  const [course, setCourse] = useState<Course | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session) {
      router.push("/auth/login");
      return;
    }

    if (courseId) {
      fetchCourse();
      fetchActivities();
      fetchStats();
    }
  }, [courseId, session, status]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      if (response.ok) {
        const courseData = await response.json();
        setCourse(courseData);
      } else {
        toast.error("Failed to load course");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast.error("Failed to load course");
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/activity`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        setError("Failed to load activities");
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
      setError("Failed to load activities");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/activity/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };


  if (status === "loading" || loading) {
    return isSidebarAccess ? (
      <SimpleLayout
        course={null}
        title="Activity"
        description="Course activity log"
        loading={true}
      >
        <div></div>
      </SimpleLayout>
    ) : (
      <CourseLayout course={null} activeTab="activity" loading={true}>
        <div></div>
      </CourseLayout>
    );
  }

  if (!session) {
    return null;
  }

  const content = (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity</h1>
          <p className="text-gray-600 mt-2">
            Track course collaboration and content changes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Activities</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActivities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recent (7 days)</p>
                <p className="text-2xl font-bold text-gray-900">{stats.recentActivities}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.topUsers.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Activity Log</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {activities.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-500">No activities yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Course activities will appear here as you and your collaborators make changes
              </p>
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="px-6">
                <ActivityItem activity={activity} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return isSidebarAccess ? (
    <SimpleLayout
      course={course}
      title="Activity"
      description="Course activity log"
      loading={!course}
    >
      {content}
    </SimpleLayout>
  ) : (
    <CourseLayout course={course} activeTab="activity" loading={!course}>
      {content}
    </CourseLayout>
  );
}

export default function ActivityPage() {
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
      <ActivityPageContent />
    </Suspense>
  );
} 