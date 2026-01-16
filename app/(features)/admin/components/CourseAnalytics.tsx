"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface Term {
  id: string;
  term: string;
  year: number;
}

interface CourseAnalytics {
  overview: {
    totalCourses: number;
    coursesWithExams: number;
    coursesWithEnrollments: number;
    averageEnrollmentsPerCourse: number;
    recentActivity: number;
    activeCoursesPercentage: number;
  };
  instructorStats: Array<{
    instructor: {
      id: string;
      name: string;
      email: string;
    };
    courseCount: number;
  }>;
  termBreakdown: Array<{
    term: {
      id: string | null;
      term: string;
      year: number;
    };
    courseCount: number;
  }>;
}

interface CourseAnalyticsProps {
  selectedTerm?: string;
  onTermChange: (termId: string) => void;
  terms: Term[];
}

export default function CourseAnalytics({ selectedTerm, onTermChange, terms }: CourseAnalyticsProps) {
  const [analytics, setAnalytics] = useState<CourseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedTerm]); // fetchAnalytics is stable and doesn't need to be in deps

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const url = selectedTerm 
        ? `/api/admin/courses/analytics?termId=${selectedTerm}`
        : "/api/admin/courses/analytics";
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      } else {
        toast.error("Failed to fetch analytics");
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Error loading analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Failed to load analytics data.</p>
      </div>
    );
  }

  const StatCard = ({ title, value, subtitle, icon }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ReactNode;
  }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 text-blue-600">
            {icon}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-lg font-medium text-gray-900">{value}</dd>
            {subtitle && <dd className="text-sm text-gray-500">{subtitle}</dd>}
          </dl>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Term Filter */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Course Analytics</h3>
          <select
            value={selectedTerm || ""}
            onChange={(e) => onTermChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">All Terms</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.term} {term.year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Courses"
          value={analytics.overview.totalCourses}
          subtitle={`${analytics.overview.recentActivity} added this week`}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />

        <StatCard
          title="Active Courses"
          value={`${analytics.overview.activeCoursesPercentage}%`}
          subtitle={`${analytics.overview.coursesWithExams} courses with exams`}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <StatCard
          title="Average Enrollment"
          value={analytics.overview.averageEnrollmentsPerCourse}
          subtitle={`${analytics.overview.coursesWithEnrollments} courses with students`}
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-1M5 7.13l6.294 3.804a1 1 0 001.412 0L19 7.13" />
            </svg>
          }
        />
      </div>

      {/* Top Instructors */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Top Instructors by Course Count</h3>
        </div>
        <div className="p-6">
          {analytics.instructorStats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No instructor data available</p>
          ) : (
            <div className="space-y-4">
              {analytics.instructorStats.slice(0, 5).map((stat, index) => (
                <div key={stat.instructor.id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {stat.instructor.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{stat.instructor.name}</div>
                      <div className="text-sm text-gray-500">{stat.instructor.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">
                      {stat.courseCount} course{stat.courseCount !== 1 ? 's' : ''}
                    </span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(stat.courseCount / Math.max(...analytics.instructorStats.map(s => s.courseCount))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Term Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Course Distribution by Term</h3>
        </div>
        <div className="p-6">
          {analytics.termBreakdown.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No term data available</p>
          ) : (
            <div className="space-y-4">
              {analytics.termBreakdown.slice(0, 8).map((termStat, index) => (
                <div key={termStat.term.id || 'no-term'} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {termStat.term.term} {termStat.term.year || ''}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 mr-2">
                      {termStat.courseCount} course{termStat.courseCount !== 1 ? 's' : ''}
                    </span>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{
                          width: `${(termStat.courseCount / Math.max(...analytics.termBreakdown.map(t => t.courseCount))) * 100}%`
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}