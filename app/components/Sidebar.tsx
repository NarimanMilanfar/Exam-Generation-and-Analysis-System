"use client";

import {
  useState,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { usePageTutorial } from "../hooks/usePageTutorial";
import TutorialModal from "./onboarding/TutorialModal";

interface NavigationItem {
  name: string;
  icon: string;
  href: string;
}

interface SidebarProps {
  navigationItems?: NavigationItem[];
}

interface SidebarContextType {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  hasSidebar: boolean;
  setHasSidebar: (hasSidebar: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasSidebar, setHasSidebar] = useState(false);

  // Apply styles to body to push content only when sidebar is present
  useEffect(() => {
    if (hasSidebar) {
      document.body.style.marginLeft = isExpanded ? "16rem" : "4rem";
      document.body.style.transition = "margin-left 300ms ease-in-out";
    } else {
      document.body.style.marginLeft = "";
      document.body.style.transition = "";
    }

    return () => {
      document.body.style.marginLeft = "";
      document.body.style.transition = "";
    };
  }, [isExpanded, hasSidebar]);

  return (
    <SidebarContext.Provider
      value={{ isExpanded, setIsExpanded, hasSidebar, setHasSidebar }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

const defaultNavigationItems: NavigationItem[] = [
  { name: "Dashboard", icon: "/icons/home.png", href: "/dashboard" },
  {
    name: "Question Bank",
    icon: "/icons/folder-multiple.png",
    href: "/course-selector?feature=question-bank",
  },
  {
    name: "Exam Builder",
    icon: "/icons/ereader.png",
    href: "/course-selector?feature=exambuilder",
  },
  {
    name: "Templates",
    icon: "/icons/template-icon.png", // updated to match the icon style
    href: "/course-selector?feature=templates",
  },
  {
    name: "Analytics",
    icon: "/icons/chart-histogram.png",
    href: "/course-selector?feature=analytics",
  },
  {
    name: "Activity",
    icon: "/icons/activity.png",
    href: "/course-selector?feature=activity",
  },
  {
    name: "Settings",
    icon: "/icons/cog.png",
    href: "/settings",
  },
];


export default function Sidebar({
  navigationItems = defaultNavigationItems,
}: SidebarProps) {
  const { data: session, status, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { isExpanded, setIsExpanded, setHasSidebar } = useSidebar();
  const [userImage, setUserImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fetchingRef = useRef(false); // Prevent concurrent fetches

  // Tutorial system
  const {
    currentPageTutorial,
    showTutorial,
    startTutorial,
    closeTutorial,
    pageName,
  } = usePageTutorial();

  // Function to fetch user image from API
  const fetchUserImage = useCallback(async () => {
    if (!session?.user?.id) return;

    // Prevent concurrent fetches
    if (fetchingRef.current) {
      console.log("⚠️ Image fetch already in progress, skipping...");
      return;
    }

    try {
      fetchingRef.current = true;
      setImageLoading(true);
      console.log("🖼️ Fetching user image from API...");

      const response = await fetch("/api/auth/profile");
      if (response.ok) {
        const userData = await response.json();
        console.log("✅ User data fetched:", {
          hasImage: !!userData.image,
          imageLength: userData.image?.length || 0,
        });
        setUserImage(userData.image || null);
      } else {
        console.error("❌ Failed to fetch user data");
        setUserImage(null);
      }
    } catch (error) {
      console.error("❌ Error fetching user image:", error);
      setUserImage(null);
    } finally {
      setImageLoading(false);
      fetchingRef.current = false;
    }
  }, [session?.user?.id]);

  // Fetch image on mount only (not on session changes to avoid duplicates)
  useEffect(() => {
    if (session?.user?.id) {
      fetchUserImage();
    }
  }, [session?.user?.id]); // Removed fetchUserImage dependency to prevent recreation loops

  // Debug logging for session data
  useEffect(() => {
    if (session?.user) {
      console.log("🔍 Sidebar Session Debug:", {
        name: session.user.name,
        email: session.user.email,
        hasImage: !!userImage,
        imagePreview: userImage
          ? userImage.substring(0, 50) + "..."
          : "NO IMAGE",
      });
    }
  }, [session, userImage]);

  // Listen for profile updates and refresh image directly
  useEffect(() => {
    const handleProfileUpdate = (e: any) => {
      console.log(
        "🔄 Profile update event detected, fetching fresh image...",
        e.detail
      );
      // Don't call update() - just fetch the fresh image since profile page already updated the database
      fetchUserImage();
    };

    window.addEventListener("profile-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
    };
  }, [fetchUserImage]); // Only listen for custom events

  // Register that this page has a sidebar
  useEffect(() => {
    setHasSidebar(true);
    return () => setHasSidebar(false);
  }, [setHasSidebar]);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  if (!session) {
    return null;
  }

  return (
    <>
      {/* Left Sidebar */}
      <div
        className={`bg-brand-navy shadow-lg fixed left-0 top-0 h-full z-50 transition-all duration-300 ease-in-out ${
          isExpanded ? "w-64" : "w-16"
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo Section */}
        <div className="p-4">
          <div
            className={`flex items-center justify-center ${
              isExpanded ? "hidden" : "block"
            }`}
          >
            <Image
              src="/logos/image.png"
              alt="UExam Logo"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
            />
          </div>
          <div className={`${isExpanded ? "block" : "hidden"}`}>
            <Image
              src="/logos/image.png"
              alt="UExam Logo"
              width={120}
              height={48}
              className="h-12 w-auto"
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center py-3 transition-colors ${
                isExpanded ? "px-6" : "px-4"
              } ${
                pathname === item.href.split("?")[0]
                  ? "bg-white/10 text-white border-r-4 border-white"
                  : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
              title={item.name}
            >
              <span className="text-lg min-w-[1.5rem] text-center flex items-center justify-center">
                {item.icon.startsWith("/") ? (
                  <Image
                    src={item.icon}
                    alt={item.name}
                    width={20}
                    height={20}
                    className="w-5 h-5 object-contain filter brightness-0 invert"
                  />
                ) : item.icon === "template-icon" ? (
                  <svg
                    className="w-5 h-5 filter brightness-0 invert"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                ) : (
                  item.icon
                )}
              </span>
              <span
                className={`font-medium ml-3 whitespace-nowrap transition-opacity duration-300 ${
                  isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
                }`}
              >
                {item.name}
              </span>
            </Link>
          ))}
        </nav>

        {/* Help Section - Compact */}
        <div className={`mt-6 ${isExpanded ? "px-6" : "px-4"}`}>
          <div className="space-y-2">
            {/* Help Button */}
            <button
              onClick={startTutorial}
              disabled={!currentPageTutorial}
              className={`
                w-full group relative overflow-hidden rounded-lg transition-all duration-300
                ${
                  currentPageTutorial
                    ? "bg-gradient-to-r from-white/10 to-white/5 hover:from-white/20 hover:to-white/10 border border-white/20"
                    : "bg-white/5 border border-white/10 opacity-50 cursor-not-allowed"
                }
                ${isExpanded ? "px-3 py-2" : "p-2"}
              `}
              title={
                currentPageTutorial
                  ? `Get help with ${pageName}`
                  : "No tutorial available for this page"
              }
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-lg" />

              <div
                className={`relative flex items-center ${
                  isExpanded ? "space-x-2" : "justify-center"
                }`}
              >
                <div
                  className={`flex-shrink-0 transition-transform duration-300 ${
                    currentPageTutorial
                      ? "group-hover:rotate-12 group-hover:scale-110"
                      : ""
                  }`}
                >
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>

                {isExpanded && (
                  <span className="text-white font-medium text-xs">Help</span>
                )}
              </div>

              {/* Pulse indicator for new users */}
              {currentPageTutorial && (
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              )}
            </button>

            {/* Keyboard shortcut hint */}
            {isExpanded && currentPageTutorial && (
              <div className="px-1 text-center">
                <div className="flex items-center justify-center space-x-1 text-white/40 text-xs">
                  <span>Press</span>
                  <kbd className="px-1 py-0.5 bg-white/10 rounded text-xs font-mono text-white/60">
                    ?
                  </kbd>
                  <span>for help</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Info at Bottom */}
        <div
          className={`absolute bottom-0 left-0 border-t border-white/10 transition-all duration-300 ${
            isExpanded ? "w-64 p-6" : "w-16 p-4"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Link
              href="/profile"
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center min-w-[2.5rem] hover:bg-white/30 transition-colors cursor-pointer overflow-hidden"
              title="Edit Profile"
            >
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
                <span className="text-white font-medium text-sm flex items-center justify-center w-full h-full">
                  {session.user.name?.charAt(0)?.toUpperCase() || "U"}
                </span>
              )}
            </Link>
            <div
              className={`flex-1 transition-opacity duration-300 ${
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              <Link
                href="/profile"
                className="block hover:text-white/90 transition-colors"
              >
                <p className="text-white font-medium text-sm">
                  {session.user.name}
                </p>
                <p className="text-white/70 text-xs">{session.user.role}</p>
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className={`text-white/80 hover:text-white transition-colors ${
                isExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              }`}
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013-3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      <TutorialModal
        isOpen={showTutorial}
        tutorial={currentPageTutorial}
        pageName={pageName}
        onClose={closeTutorial}
      />
    </>
  );
}
