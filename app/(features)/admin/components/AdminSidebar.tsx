"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface AdminNavigationItem {
  name: string;
  icon: string;
  href: string;
}

interface AdminSidebarProps {
  navigationItems?: AdminNavigationItem[];
}

const defaultAdminNavigationItems: AdminNavigationItem[] = [
  { name: "Dashboard", icon: "📊", href: "/admin/dashboard" },
  { name: "User Management", icon: "👥", href: "/admin/users" },
  { name: "Course Oversight", icon: "📚", href: "/admin/courses" },
  { name: "Database", icon: "🗄️", href: "/admin/database" },
];

export default function AdminSidebar({ navigationItems = defaultAdminNavigationItems }: AdminSidebarProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const fetchingRef = useRef(false);
  const lastFetchTime = useRef(0);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Function to fetch fresh user data with debouncing
  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id || fetchingRef.current) return;

    // Debounce: prevent fetching more than once every 2 seconds
    const now = Date.now();
    if (now - lastFetchTime.current < 2000) {
      console.log("⚠️ AdminSidebar: Skipping fetch due to debounce");
      return;
    }

    try {
      fetchingRef.current = true;
      lastFetchTime.current = now;
      console.log("🔄 AdminSidebar: Fetching fresh user data...");

      const response = await fetch("/api/auth/profile");
      if (response.ok) {
        const userData = await response.json();
        console.log("✅ AdminSidebar: User data fetched:", {
          hasImage: !!userData?.image,
          name: userData?.name,
        });
        setUserImage(userData?.image || null);
        setCurrentUserName(userData?.name || "");
      } else {
        console.error("❌ AdminSidebar: Failed to fetch user data");
        setUserImage(null);
        setCurrentUserName(session?.user?.name || "");
      }
    } catch (error) {
      console.error("❌ AdminSidebar: Error fetching user data:", error);
      setUserImage(null);
      setCurrentUserName(session?.user?.name || "");
    } finally {
      fetchingRef.current = false;
    }
  }, [session?.user?.id, session?.user?.name]);

  // Debounced fetch function
  const debouncedFetchUserData = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchUserData();
    }, 500); // 500ms debounce
  }, [fetchUserData]);

  // Initial data fetch
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserData();
    }
  }, [session?.user?.id, fetchUserData]);

  // Listen for profile updates from admin dashboard with debouncing
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      console.log("🔄 AdminSidebar: Profile update detected, refreshing data...", e.detail);
      debouncedFetchUserData();
    };

    const handleUserUpdate = (e: any) => {
      // Only refresh if it's a current user update or a user edit, not bulk user list updates
      if (e.detail.type === 'current-user-updated' || e.detail.type === 'user-edited') {
        console.log("🔄 AdminSidebar: User update detected, refreshing data...", e.detail);
        debouncedFetchUserData();
      }
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("user-updated", handleUserUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("user-updated", handleUserUpdate);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [debouncedFetchUserData]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (!session) {
    return null;
  }

  return (
    <>
      <style>{`
        .admin-sidebar-group:hover ~ .admin-main-content {
          margin-left: 16rem !important;
        }
      `}</style>
      
      {/* Admin Sidebar */}
      <div className="admin-sidebar-group group fixed left-0 top-0 h-full w-16 hover:w-64 bg-black shadow-lg transition-all duration-300 ease-in-out z-50">
        {/* Logo Section */}
        <div className="p-4">
          <div className="group-hover:hidden flex items-center justify-center">
            <div className="bg-white/10 p-2 rounded-lg">
              <Image
                src="/logos/image.png"
                alt="UExam Logo"
                width={24}
                height={24}
                className="w-6 h-6 object-contain"
              />
            </div>
          </div>
          <div className="hidden group-hover:block">
            <div className="flex items-center space-x-3">
              <div className="bg-white/10 p-2 rounded-lg">
                <Image
                  src="/logos/image.png"
                  alt="UExam Logo"
                  width={24}
                  height={24}
                  className="w-6 h-6"
                />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Admin Portal</p>
                <p className="text-gray-300 text-xs">System Control</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-4 py-3 text-left w-full transition-colors group-hover:px-6 ${
                pathname === item.href.split("?")[0]
                  ? "bg-white/10 text-white border-r-4 border-white"
                  : "text-gray-300 hover:bg-white/5 hover:text-white"
              }`}
              title={item.name}
            >
              <span className="text-lg min-w-[1.5rem] text-center">
                {item.icon}
              </span>
              <span className="font-medium ml-3 hidden group-hover:block whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* Admin Info at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center min-w-[2.5rem] overflow-hidden">
              {userImage ? (
                <Image
                  src={userImage}
                  alt="Profile"
                  width={40}
                  height={40}
                  className="w-full h-full object-cover rounded-full"
                  key={userImage} // Force re-render when image changes
                />
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              )}
            </div>
            <div className="flex-1 hidden group-hover:block">
              <p className="text-white font-medium text-sm">
                {currentUserName || session.user.name}
              </p>
              <p className="text-gray-300 text-xs">System Administrator</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-300 hover:text-white transition-colors hidden group-hover:block"
              title="Logout"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 