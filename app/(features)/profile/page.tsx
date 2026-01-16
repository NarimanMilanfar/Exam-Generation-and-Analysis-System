"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import toast from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
// Removed Toaster import - using global Toaster from layout.tsx instead
import Sidebar from "../../components/Sidebar";

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [modalType, setModalType] = useState<"name" | "email" | "password">(
    "name"
  );

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionTime, setLastSubmissionTime] = useState(0);

  // Global flag to prevent any duplicate executions
  const submissionInProgress = useRef(false);

  // Global toast tracker to prevent duplicate toasts
  const lastToastTime = useRef(0);

  // Constants
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login");
    }
    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      const data = await res.json();
      setName(data.name);
      setEmail(data.email);
      setNewName(data.name);
      setNewEmail(data.email);
      setImagePreview(data.image || "");
    } catch (err) {
      toast.error("Cannot fetch profile");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP formats are allowed");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const openModal = (type: "name" | "email" | "password") => {
    setModalType(type);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setPassword("");
    setConfirmPassword("");
    setVerificationCode("");
  };

  const sendVerificationCode = async () => {
    if (!newEmail) {
      toast.error("Please enter a new email address");
      return;
    }

    setIsSendingCode(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send-verification",
          email: newEmail,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "sending verification code failed");
      }

      const data = await res.json();
      setVerificationId(data.verificationId);
      toast.success("Successfully sent verification code to your email");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Sending verification code failed"
      );
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSubmit = async () => {
    const now = Date.now();

    // ABSOLUTE prevention of duplicate executions
    if (
      submissionInProgress.current ||
      isSubmitting ||
      now - lastSubmissionTime < 2000
    ) {
      console.log(
        "⚠️ BLOCKED: Submission already in progress or too soon since last submission"
      );
      return;
    }

    // Set global flag immediately
    submissionInProgress.current = true;
    console.log("🚀 Starting profile photo upload...");
    setIsSubmitting(true);
    setLastSubmissionTime(now);

    try {
      const formData = new FormData();

      if (selectedImage) {
        if (!ALLOWED_IMAGE_TYPES.includes(selectedImage.type)) {
          throw new Error(
            "Image format not supported, only JPG, PNG, WEBP are allowed"
          );
        }
        if (selectedImage.size > MAX_IMAGE_SIZE) {
          throw new Error("Image size must be less than 2MB");
        }
        formData.append("image", selectedImage);
      }

      console.log("📤 Sending profile update request...");
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const data = await res.json();
      console.log("✅ Profile update response received");

      if (data.image) {
        setImagePreview(data.image);
      }

      // AGGRESSIVE duplicate toast prevention
      const now = Date.now();
      if (now - lastToastTime.current < 3000) {
        console.log("🚫 BLOCKED: Duplicate toast prevented (within 3 seconds)");
      } else {
        lastToastTime.current = now;
        const toastId = `profile-update-${now}`;
        console.log(
          `🎉 Showing success toast for profile photo update (ID: ${toastId})`
        );
        toast.success("Profile photo updated successfully!", { id: toastId });
      }

      console.log("📡 Emitting profile update event to other components...");

      // Use only custom event to avoid duplicate triggers
      const customEvent = new CustomEvent("profile-updated", {
        detail: { timestamp: Date.now() },
      });
      window.dispatchEvent(customEvent);

      console.log("✅ Profile update event emitted");

      setSelectedImage(null);
    } catch (error) {
      console.error("❌ Profile update failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      console.log("🏁 Profile update process completed");
      setIsSubmitting(false);
      submissionInProgress.current = false; // Clear global flag
    }
  };

  const handleModalSubmit = async () => {
    if (isSubmitting) return; // Prevent double submission
    try {
      setIsSubmitting(true);

      if (modalType === "name") {
        if (!newName.trim()) {
          throw new Error("Name cannot be empty");
        }

        const formData = new FormData();
        formData.append("name", newName);

        const res = await fetch("/api/auth/profile", {
          method: "PATCH",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Name update failed");
        }

        const data = await res.json();
        setName(data.name);
        toast.success("Name updated successfully");
        await update({ name: data.name, imageUpdated: Date.now() }); // Refresh session to update sidebar

        // Emit event to notify other components about the profile update
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: { type: "name", timestamp: Date.now() },
          })
        );

        closeModal();
        return;
      }

      if (modalType === "password") {
        if (!password || !confirmPassword) {
          throw new Error("Please enter both password and confirm password");
        }
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long");
        }

        const formData = new FormData();
        formData.append("password", password);

        const res = await fetch("/api/auth/profile", {
          method: "PATCH",
          body: formData,
        });

        if (!res.ok) {
          throw new Error("Password update failed");
        }

        toast.success("Password updated successfully");
        closeModal();
        return;
      }

      if (modalType === "email") {
        if (!newEmail.includes("@")) {
          throw new Error("Please enter a valid email address");
        }
        if (!verificationCode || verificationCode.length !== 6) {
          throw new Error("Please enter a valid 6-digit verification code");
        }

        const formData = new FormData();
        formData.append("email", newEmail);
        formData.append("verificationId", verificationId || "");
        formData.append("verificationCode", verificationCode);

        const res = await fetch("/api/auth/profile", {
          method: "PATCH",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          if (res.status === 409) {
            throw new Error(
              "This email address is already in use by another account. Please choose a different email."
            );
          } else if (
            res.status === 400 &&
            errorData.error?.includes("verification")
          ) {
            throw new Error(
              "Invalid or expired verification code. Please request a new code."
            );
          } else if (res.status === 500) {
            toast.error("Internal server error. Please try again later.");
          } else {
            throw new Error(errorData.error || "Email update failed");
          }
        }

        const data = await res.json();
        setEmail(data.email);
        toast.success("Email updated successfully");
        await update({ email: data.email, imageUpdated: Date.now() }); // Refresh session to update sidebar

        // Emit event to notify other components about the profile update
        window.dispatchEvent(
          new CustomEvent("profile-updated", {
            detail: { type: "email", timestamp: Date.now() },
          })
        );

        closeModal();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      <Sidebar />
      {/* Removed duplicate Toaster - using global Toaster from layout.tsx */}

      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-200">
          <div className="bg-white rounded-xl p-6 shadow-xl flex items-center space-x-4 transform transition-transform duration-200">
            <svg
              className="animate-spin h-8 w-8 text-brand-navy"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span className="text-gray-700 font-medium">
              Updating profile...
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content flex-1">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Edit Profile
                </h1>
                <p className="mt-2 text-gray-600">
                  Update your personal information and account settings
                </p>
              </div>
              <button
                onClick={() => router.push("/settings")}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Back to Settings
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-brand-navy rounded-lg flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-semibold text-gray-900">
                      Profile Information
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Update your personal details and profile picture
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Avatar Section */}
                  <div className="lg:col-span-1 flex flex-col items-center">
                    <div className="space-y-6 text-center">
                      <div className="relative">
                        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg mx-auto bg-gray-100 flex items-center justify-center">
                          {imagePreview ? (
                            <Image
                              src={imagePreview}
                              alt=""
                              width={160}
                              height={160}
                              className="object-cover w-full h-full"
                              priority
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                              <svg
                                className="w-16 h-16 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        {/* Camera Icon Overlay */}
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className="absolute bottom-2 right-2 w-12 h-12 bg-brand-navy rounded-full flex items-center justify-center text-white shadow-lg hover:bg-brand-navy-dark transition-colors"
                          disabled={isSubmitting}
                        >
                          <svg
                            className="w-6 h-6"
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

                      <div>
                        <button
                          type="button"
                          onClick={triggerFileInput}
                          className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-navy hover:bg-brand-navy-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
                          disabled={isSubmitting}
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          Change Photo
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/jpeg, image/png, image/webp"
                          onChange={handleImageChange}
                          className="hidden"
                          disabled={isSubmitting}
                          data-testid="file-input"
                        />
                        <p className="text-xs text-gray-500 mt-3">
                          JPG, PNG or WEBP (max 2MB)
                        </p>
                      </div>

                      {selectedImage && (
                        <div className="space-y-3">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-center">
                              <svg
                                className="w-5 h-5 text-blue-500 mr-2"
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
                              <p className="text-sm text-blue-700">
                                New photo selected. Click save to update.
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              console.log(
                                "🖱️ Save Photo button clicked",
                                e.timeStamp
                              );
                              handleSubmit();
                            }}
                            disabled={isSubmitting}
                            className="w-full py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                          >
                            {isSubmitting ? (
                              <>
                                <svg
                                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  ></circle>
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                  ></path>
                                </svg>
                                Saving Photo...
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-4 h-4 mr-2"
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
                                Save Photo
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Name Field */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Full Name
                            </h3>
                            <p className="text-gray-600 mt-1">{name}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openModal("name")}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Email Address
                            </h3>
                            <p className="text-gray-600 mt-1">{email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openModal("email")}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-purple-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                              />
                            </svg>
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Password
                            </h3>
                            <p className="text-gray-600 mt-1">••••••••••••</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openModal("password")}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition-colors"
                        >
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <Dialog
        open={isOpen}
        onClose={closeModal}
        className="fixed inset-0 z-50 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen px-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative bg-white rounded-xl max-w-lg mx-auto p-6 w-full shadow-xl">
              <Dialog.Title className="text-xl font-semibold mb-6 text-gray-900 flex items-center">
                {modalType === "name" && (
                  <>
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                    Edit Name
                  </>
                )}
                {modalType === "email" && (
                  <>
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    Edit Email
                  </>
                )}
                {modalType === "password" && (
                  <>
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                      <svg
                        className="w-5 h-5 text-purple-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    Edit Password
                  </>
                )}
              </Dialog.Title>

              {modalType === "name" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-colors"
                      placeholder="Enter your full name"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {modalType === "email" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="new-email"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Email Address
                    </label>
                    <input
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-colors"
                      placeholder="Enter new email address"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Verification Code
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="000000"
                        value={verificationCode}
                        onChange={(e) => {
                          const code = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6); // Only allow 6 digits
                          setVerificationCode(code);
                        }}
                        maxLength={6}
                        style={{
                          letterSpacing: verificationCode ? "0.5em" : "0.3em",
                        }}
                        className="flex-1 px-4 py-4 border border-gray-300 bg-white rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-all text-center text-2xl font-mono placeholder:text-gray-400 placeholder:font-normal placeholder:tracking-normal"
                      />
                      <button
                        type="button"
                        onClick={sendVerificationCode}
                        disabled={isSendingCode}
                        className="px-6 py-4 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-dark disabled:opacity-50 font-medium transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        {isSendingCode ? "Sending..." : "Get Code"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {modalType === "password" && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="new-password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      New Password
                    </label>
                    <input
                      id="new-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-colors"
                      placeholder="Enter new password"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-navy focus:border-brand-navy transition-colors"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleModalSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-brand-navy-dark disabled:opacity-50 font-medium transition-colors"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </div>
  );
}
