"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ActivityItem from './ActivityItem';

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

interface RecentActivityWidgetProps {
  courseId: string;
}

export default function RecentActivityWidget({ courseId }: RecentActivityWidgetProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchRecentActivities();
  }, [courseId]);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/courses/${courseId}/activity?limit=3`);
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        setError('Failed to load activities');
      }
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setError('Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-48">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400" role="status"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 h-48">
        <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-red-600 text-sm">Failed to load activities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-48">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        <button
          onClick={() => router.push(`/course/${courseId}/activity`)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
        >
          View All
        </button>
      </div>
      
      {activities.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              role="img"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-gray-600 text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {activities.map((activity) => (
            <ActivityItem 
              key={activity.id} 
              activity={activity} 
              compact={true} 
            />
          ))}
        </div>
      )}
    </div>
  );
}