"use client";

import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState("");

  const menuItems = [
    { name: "Course", href: "/admin/courses", active: false },
    { name: "Lists", href: "/admin/lists", active: false },
    { name: "Analytics", href: "/admin/analytics", active: false },
    { name: "Search", href: "/admin/search", active: false },
    { name: "Users", href: "/admin", active: true },
    { name: "help", href: "/admin/help", active: false },
  ];

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-800 text-white">
        <div className="p-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white text-slate-800 rounded flex items-center justify-center font-bold">
              UX
            </div>
            <span className="text-lg font-semibold">Admin</span>
          </div>
        </div>

        <nav className="mt-8">
          {menuItems.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className={`block px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${
                item.active ? "bg-slate-700 border-r-2 border-white" : ""
              }`}
            >
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-slate-800 text-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button className="text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="search ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-full bg-gray-600 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center hover:bg-gray-500 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
} 