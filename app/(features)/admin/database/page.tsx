"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminDatabasePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
    
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading Database Management...</p>
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
                <h1 className="text-white text-lg font-semibold">Database Management</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Removed System Online status and user icon to reduce user confusion */}
            </div>
          </div>
        </div>

        {/* Database Management Content */}
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Database Management</h2>
            <p className="text-gray-600 mb-6">
              Advanced database management tools are currently under construction. System maintenance and backup features will be available soon.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-blue-800 mb-2">Coming Soon:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Database backup and restore</li>
                <li>• System performance monitoring</li>
                <li>• Data cleanup and optimization</li>
                <li>• Query performance analysis</li>
                <li>• Database health reports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 