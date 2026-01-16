"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const token = window.location.pathname.split("/").pop();
      const response = await fetch(`/api/auth/password-reset/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Password reset successful! Redirecting to login...");
        setTimeout(() => {
          router.push("/auth/login");
        }, 2000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div>
          <div className="flex justify-center mb-6">
            <Image
              src="/logos/image.png"
              alt="UExam Logo"
              width={120}
              height={48}
              className="h-12 w-auto"
            />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-brand-navy mb-6">
            Reset Your Password
          </h2>

          {message && (
            <div className="bg-accent-success/10 border border-accent-success/20 text-accent-success px-4 py-3 rounded mb-4">
              {message}
            </div>
          )}

          {error && (
            <div className="bg-accent-error/10 border border-accent-error/20 text-accent-error px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-navy hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading ? "Submitting..." : "Submit New Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
