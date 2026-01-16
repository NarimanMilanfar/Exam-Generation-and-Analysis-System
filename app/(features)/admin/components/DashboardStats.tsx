"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  image?: string;
}

interface StatsProps {
  stats: {
    systemStatus: string;
    totalQuestions: number;
    activeUsers: number;
    totalUsers: number;
    totalAccounts: number;
  };
  users: User[];
}

interface OverviewStats {
  totalQuestions: number;
  totalExams: number;
  totalCourses: number;
  totalQuestionBanks: number;
  activeUsers: number;
  totalUsers: number;
}

interface TodayActivity {
  questionsToday: number;
  examsToday: number;
  coursesCreatedToday: number;
  examsTaken: number;
}

interface ExamStats {
  totalExams: number;
  totalQuestions: number;
  examsToday: number;
  avgQuestionsPerExam: number;
  publishedExams: number;
  draftExams: number;
  completionRate: number;
}

interface AnalyticsStats {
  examsAnalyzed: number;
  completionRate: number;
  popularSubject: string;
  avgScore: number;
  questionTypeDistribution: Record<string, number>;
  totalExamAttempts: number;
}

interface TopCourse {
  id: string;
  name: string;
  questionCount: number;
  examCount: number;
  instructor: string;
  color: string;
}

interface RecentActivity {
  id: string;
  text: string;
  type: string;
  courseName: string;
  createdAt: string;
  points: number | null;
  activityType: string;
  icon: string;
}

interface InsightsStats {
  topCourses: TopCourse[];
  recentActivity: RecentActivity[];
  systemHealth: {
    databaseConnected: boolean;
    avgResponseTime: number | null;
    uptime: string | null;
  };
}

export default function DashboardStats({ stats, users }: StatsProps) {
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalQuestions: 0,
    totalExams: 0,
    totalCourses: 0,
    totalQuestionBanks: 0,
    activeUsers: 0,
    totalUsers: 0,
  });

  const [todayActivity, setTodayActivity] = useState<TodayActivity>({
    questionsToday: 0,
    examsToday: 0,
    coursesCreatedToday: 0,
    examsTaken: 0,
  });

  const [examStats, setExamStats] = useState<ExamStats>({
    totalExams: 0,
    totalQuestions: 0,
    examsToday: 0,
    avgQuestionsPerExam: 0,
    publishedExams: 0,
    draftExams: 0,
    completionRate: 0,
  });

  const [analyticsStats, setAnalyticsStats] = useState<AnalyticsStats>({
    examsAnalyzed: 0,
    completionRate: 0,
    popularSubject: "No data",
    avgScore: 0,
    questionTypeDistribution: {},
    totalExamAttempts: 0,
  });

  const [insightsStats, setInsightsStats] = useState<InsightsStats>({
    topCourses: [],
    recentActivity: [],
    systemHealth: {
      databaseConnected: true,
      avgResponseTime: null,
      uptime: null,
    },
  });

  const [loading, setLoading] = useState(true);

  // Get real admin users from the users prop
  const adminUsers = users.filter((user) => user.role === "ADMIN");

  // Fetch comprehensive admin statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/stats");
        if (response.ok) {
          const data = await response.json();
          console.log("DashboardStats: Received data:", data);

          setOverviewStats(
            data.overview || {
              totalQuestions: 0,
              totalExams: 0,
              totalCourses: 0,
              totalQuestionBanks: 0,
              activeUsers: 0,
              totalUsers: 0,
            }
          );

          setTodayActivity(
            data.todayActivity || {
              questionsToday: 0,
              examsToday: 0,
              coursesCreatedToday: 0,
              examsTaken: 0,
            }
          );

          setExamStats(
            data.exams || {
              totalExams: 0,
              totalQuestions: 0,
              examsToday: 0,
              avgQuestionsPerExam: 0,
              publishedExams: 0,
              draftExams: 0,
              completionRate: 0,
            }
          );

          setAnalyticsStats(
            data.analytics || {
              examsAnalyzed: 0,
              completionRate: 0,
              popularSubject: "No data yet",
              avgScore: 0,
              questionTypeDistribution: {},
              totalExamAttempts: 0,
            }
          );

          setInsightsStats(
            data.insights || {
              topCourses: [],
              recentActivity: [],
              systemHealth: {
                databaseConnected: true,
                avgResponseTime: null,
                uptime: null,
              },
            }
          );
        } else {
          console.error("Failed to fetch admin stats");
        }
      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Note: Chart removed to avoid showing simulated data

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* First Row - 4 widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* System Status */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">
            System Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">System health</span>
              <span
                className={`font-bold text-sm ${
                  insightsStats.systemHealth.databaseConnected
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {insightsStats.systemHealth.databaseConnected
                  ? "good"
                  : "error"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Verified Users</span>
              <span className="font-bold text-sm">
                {overviewStats.activeUsers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total Users</span>
              <span className="font-bold text-sm">
                {overviewStats.totalUsers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Unverified Users</span>
              <span className="font-bold text-sm text-orange-600">
                {overviewStats.totalUsers - overviewStats.activeUsers}
              </span>
            </div>
          </div>
        </div>

        {/* Content Overview */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">
            Content Overview
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total Questions</span>
              <span className="font-bold text-sm text-blue-600">
                {loading ? "Loading..." : overviewStats.totalQuestions}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total Exams</span>
              <span className="font-bold text-sm text-purple-600">
                {loading ? "Loading..." : overviewStats.totalExams}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Total Courses</span>
              <span className="font-bold text-sm text-green-600">
                {loading ? "Loading..." : overviewStats.totalCourses}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Question Banks</span>
              <span className="font-bold text-sm text-orange-600">
                {loading ? "Loading..." : overviewStats.totalQuestionBanks}
              </span>
            </div>
          </div>
        </div>

        {/* Today's Activity */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">
            Today's Activity
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Questions Created</span>
              <span className="font-bold text-sm text-blue-600">
                {loading ? "Loading..." : todayActivity.questionsToday}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Exams Created</span>
              <span className="font-bold text-sm text-purple-600">
                {loading ? "Loading..." : todayActivity.examsToday}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Courses Added</span>
              <span className="font-bold text-sm text-green-600">
                {loading ? "Loading..." : todayActivity.coursesCreatedToday}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Exams Taken</span>
              <span className="font-bold text-sm text-orange-600">
                {loading ? "Loading..." : todayActivity.examsTaken}
              </span>
            </div>
          </div>
        </div>

        {/* Analytics Overview */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">
            Analytics
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Exams Completed</span>
              <span className="font-bold text-sm text-indigo-600">
                {loading ? "Loading..." : analyticsStats.examsAnalyzed}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Completion Rate</span>
              <span className="font-bold text-sm text-green-600">
                {loading ? "Loading..." : `${analyticsStats.completionRate}%`}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Popular Course</span>
              <span
                className="font-bold text-sm text-blue-600 truncate"
                title={analyticsStats.popularSubject}
              >
                {loading
                  ? "Loading..."
                  : analyticsStats.popularSubject.length > 12
                  ? analyticsStats.popularSubject.substring(0, 12) + "..."
                  : analyticsStats.popularSubject}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Avg Score</span>
              <span className="font-bold text-sm text-yellow-600">
                {loading ? "Loading..." : `${analyticsStats.avgScore}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Top Courses */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">
            Top Courses by Content
          </h3>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">Loading courses...</p>
              </div>
            ) : insightsStats.topCourses.length > 0 ? (
              insightsStats.topCourses.map((course, index) => (
                <div
                  key={course.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: course.color }}
                    ></div>
                    <div>
                      <p
                        className="text-sm font-medium text-gray-900 truncate"
                        title={course.name}
                      >
                        {course.name.length > 20
                          ? course.name.substring(0, 20) + "..."
                          : course.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {course.instructor}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">
                      {course.questionCount}
                    </p>
                    <p className="text-xs text-gray-500">questions</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <p className="text-sm text-gray-500">No courses found</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <h3 className="text-sm font-semibold mb-3 text-gray-700">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">
                  Loading activity...
                </p>
              </div>
            ) : insightsStats.recentActivity.length > 0 ? (
              insightsStats.recentActivity.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 p-2 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center justify-center w-6 h-6 mt-1">
                    <span className="text-sm">{activity.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {activity.activityType}
                      </span>
                    </div>
                    <p
                      className="text-sm text-gray-900 truncate mt-1"
                      title={activity.text}
                    >
                      {activity.text}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        {activity.courseName}
                      </p>
                      <div className="flex items-center space-x-2">
                        {activity.points && (
                          <span className="text-xs text-orange-600 font-medium">
                            {activity.points} pts
                          </span>
                        )}
                        <span className="text-xs text-gray-400">
                          {new Date(activity.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <svg
                  className="w-12 h-12 mx-auto mb-2 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm text-gray-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
