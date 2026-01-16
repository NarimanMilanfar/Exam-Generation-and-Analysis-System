"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import toast from "react-hot-toast";

export default function SetPasswordPage() {
  const router = useRouter();
  const { token } = useParams();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [draftName, setDraftName] = useState("");
  const [editingName, setEditingName] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState("");

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verified, setVerified] = useState(false);
  const [accountAlreadyCreated, setAccountAlreadyCreated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/set-password/verify?token=${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          if (data.email) {
            setEmail(data.email);
            setName(data.name || "");
            setDraftName(data.name || "");
            setVerified(true);
          }
        } else {
          // Handle error responses
          if (data.error && data.error.includes("Account already created")) {
            setAccountAlreadyCreated(true);
          } else {
            toast.error(data.error || "Token verification failed");
          }
        }
      })
      .catch(() => toast.error("Server error verifying token"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!password) return setPasswordStrength("");

    const calculateStrength = (pwd: string) => {
      if (pwd.length < 6) return "Too short";
      let score = 0;
      if (/[a-z]/.test(pwd)) score++;
      if (/[A-Z]/.test(pwd)) score++;
      if (/\d/.test(pwd)) score++;
      if (/[^a-zA-Z0-9]/.test(pwd)) score++;
      if (pwd.length >= 12) score++;

      switch (score) {
        case 5:
          return "Very Strong";
        case 4:
          return "Strong";
        case 3:
          return "Medium";
        case 2:
          return "Weak";
        default:
          return "Very Weak";
      }
    };

    setPasswordStrength(calculateStrength(password));
  }, [password]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case "Very Strong":
        return "text-green-600";
      case "Strong":
        return "text-green-500";
      case "Medium":
        return "text-yellow-500";
      case "Weak":
        return "text-orange-500";
      case "Very Weak":
        return "text-red-500";
      default:
        return "text-gray-400";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP formats are allowed");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image must be smaller than 2MB");
      return;
    }

    setAvatarFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreviewUrl(previewUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verified) return;
    if (!name || !password || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("token", token as string);
      formData.append("name", name);
      formData.append("newPassword", password);
      if (avatarFile) formData.append("avatar", avatarFile);

      const res = await fetch("/api/auth/set-password/update", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      toast.success("Profile set successfully");

      const loginRes = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (loginRes?.ok) {
        router.push("/dashboard");
      } else {
        toast.error("Password set, but auto-login failed");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-12 w-12 border-4 border-brand-navy border-t-transparent rounded-full" />
      </div>
    );
  }

  if (accountAlreadyCreated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-8 text-center">
              <div className="mx-auto flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Account Already Set Up
              </h2>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push("/auth/login")}
                  className="px-6 py-2 bg-brand-navy hover:bg-navy-700 text-white rounded-lg font-medium transition-colors"
                >
                  Go to Login
                </button>
                <button
                  onClick={() => router.push("/")}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-yellow-500 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Security Notice
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Setup links can only be used once for security purposes. If
                  you need to reset your password, please use the "Forgot
                  Password" option on the login page.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <Image
              src="/logos/image.png"
              alt="UExam Logo"
              width={40}
              height={40}
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Complete Your Profile
              </h1>
              <p className="text-sm text-gray-600">
                Set up your account to get started
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center space-y-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-brand-navy to-navy-600 flex items-center justify-center border-4 border-white shadow-lg">
                    {avatarPreviewUrl ? (
                      <Image
                        src={avatarPreviewUrl}
                        alt="Profile preview"
                        width={128}
                        height={128}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-4xl font-bold text-white">
                        {name?.charAt(0)?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="absolute -bottom-2 -right-2 bg-brand-navy hover:bg-navy-700 text-white p-3 rounded-full shadow-lg transition-colors duration-200"
                    disabled={submitting}
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
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </button>
                </div>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={triggerFileInput}
                    className="text-brand-navy hover:text-navy-700 font-medium text-sm transition-colors duration-200"
                    disabled={submitting}
                  >
                    Upload Profile Picture
                  </button>
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG, WEBP (max 2MB)
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name Field */}
                <div className="md:col-span-2">
                  <label htmlFor="name" className="form-label">
                    Full Name *
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                {/* Email Field (Read-only) */}
                <div className="md:col-span-2">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <div className="mt-1">
                    <input
                      type="email"
                      id="email"
                      value={email}
                      className="form-input bg-gray-50 text-gray-500 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label htmlFor="password" className="form-label">
                    Password *
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="form-input"
                      placeholder="Create a strong password"
                      required
                    />
                    {password && (
                      <p
                        className={`text-sm mt-1 ${getStrengthColor(
                          passwordStrength
                        )}`}
                      >
                        Strength: {passwordStrength}
                      </p>
                    )}
                  </div>
                </div>

                {/* Confirm Password Field */}
                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password *
                  </label>
                  <div className="mt-1">
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="form-input"
                      placeholder="Confirm your password"
                      required
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-sm text-red-500 mt-1">
                        Passwords do not match
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={submitting || !verified}
                  className="btn-primary flex items-center space-x-2 min-w-[200px] justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                      <span>Setting up...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Setup</span>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <svg
              className="w-5 h-5 text-blue-500 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Welcome to UExam!
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Complete your profile setup to start creating and managing
                exams. Your profile picture will be visible to students and
                colleagues.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
