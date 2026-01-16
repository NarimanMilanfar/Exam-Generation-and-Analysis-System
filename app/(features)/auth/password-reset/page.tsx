// need one input box for email and a submit button

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setCooldown(120); // 2 minutes cooldown
        setEmail("");
      } else {
        if (response.status === 429) {
          setError(data.error);
          setCooldown(120);
        } else if (response.status === 400) {
          setError(data.error || "Invalid email address.");
        } else if (response.status === 404) {
          setError(data.error || "Email not found.");
        } else if (response.status === 500) {
          toast.error("Internal server error. Please try again later.");
          router.push("/error");
        } else {
          setError(data.error || "An unexpected error occurred.");
        }
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
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            />
          </div>

          <button
            type="submit"
            disabled={loading || cooldown > 0}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-navy hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
          >
            {loading
              ? "Sending..."
              : cooldown > 0
              ? `Please wait ${cooldown}s`
              : "Send Reset Email"}
          </button>
        </form>
      </div>
    </div>
  );
}
