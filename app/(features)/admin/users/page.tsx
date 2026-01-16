"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import UserTable from "../components/UserTable";
import AdminSidebar from "../components/AdminSidebar";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  image?: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const lastEventEmissionTime = useRef(0);

  // Enhanced setUsers function that emits events with debouncing
  const setUsersWithEvent = (newUsers: User[]) => {
    setUsers(newUsers);
    
    // Debounce event emission to prevent spam
    const now = Date.now();
    if (now - lastEventEmissionTime.current < 1000) {
      return; // Skip event emission if less than 1 second has passed
    }
    lastEventEmissionTime.current = now;
    
    // Emit event to notify sidebar and other components
    window.dispatchEvent(
      new CustomEvent("user-updated", {
        detail: { 
          type: "users-list-updated", 
          timestamp: Date.now(),
          usersCount: newUsers.length 
        },
      })
    );
  };

  // Update current user data when users change
  useEffect(() => {
    if (users.length > 0 && session?.user.id) {
      const updatedCurrentUser = users.find(user => user.id === session.user.id);
      if (updatedCurrentUser && (!currentUser || 
          currentUser.name !== updatedCurrentUser.name || 
          currentUser.image !== updatedCurrentUser.image)) {
        setCurrentUser(updatedCurrentUser);
        
        // Only emit event if current user data actually changed
        window.dispatchEvent(
          new CustomEvent("user-updated", {
            detail: { 
              type: "current-user-updated", 
              timestamp: Date.now(),
              user: updatedCurrentUser 
            },
          })
        );
      }
    }
  }, [users, session?.user.id, currentUser]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
    
    // Check if user is admin
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading User Management...</p>
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
                <h1 className="text-white text-lg font-semibold">User Management</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Removed System Online status and user icon to reduce user confusion */}
            </div>
          </div>
        </div>

        {/* User Management Content */}
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">User Database Management</h2>
            <p className="text-gray-600">Manage all system users, view their information, and control access permissions.</p>
          </div>
          
          {/* User Database Table */}
          <UserTable users={users} setUsers={setUsersWithEvent} />
        </div>
      </div>
    </div>
  );
} 