"use client";

import { useState, Suspense } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import Image from "next/image";

function AdminLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/admin/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials or access denied");
        setIsLoading(false);
        return;
      }

      // Get the session to check user role
      const session = await getSession();

      if (!session?.user) {
        setError("Authentication failed");
        setIsLoading(false);
        return;
      }

      // Check if user is admin
      if (session.user.role !== "ADMIN") {
        setError("Access denied. Admin privileges required.");
        // Sign out the non-admin user completely
        await fetch("/api/auth/signout", { method: "POST" });
        setIsLoading(false);
        return;
      }

      // Redirect to admin dashboard
      router.push(callbackUrl);
    } catch (error) {
      console.error("Login error:", error);
      setError("An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back to Home */}
        <div className="flex justify-start">
          <Link
            href="/"
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/image.png"
              alt="UExam Logo"
              width={80}
              height={80}
              className="h-20 w-auto"
            />
          </div>

          <h2 className="text-3xl font-bold text-white">
            Administrator Portal
          </h2>
          <p className="mt-2 text-gray-400">
            Restricted access for system administrators only
          </p>
        </div>

        {/* Admin Warning Banner */}
        <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-4 backdrop-blur-sm">
          <div className="flex items-center">
            <div className="w-5 h-5 bg-yellow-500 rounded-full mr-3"></div>
            <div>
              <p className="text-gray-200 text-sm font-medium">
                Admin Access Required
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Only authorized administrators can access this portal
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Administrator Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full px-3 py-3 border border-gray-600 bg-gray-800/50 backdrop-blur-sm placeholder-gray-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 sm:text-sm"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="block w-full px-3 py-3 pr-10 border border-gray-600 bg-gray-800/50 backdrop-blur-sm placeholder-gray-400 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg backdrop-blur-sm">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-black bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                "Access Admin Portal"
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Not an admin? Use regular login →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
