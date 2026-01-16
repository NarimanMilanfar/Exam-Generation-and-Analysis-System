"use client";

import { useState, useCallback } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export interface AuthFormData {
  email: string;
  password: string;
}

export interface AuthState {
  loading: boolean;
  error: string;
  showTwoFactor: boolean;
  userId: string;
  resendLoading: boolean;
}

export interface AuthActions {
  handleLogin: (formData: AuthFormData) => Promise<void>;
  handleTwoFactorVerification: (code: string, formData: AuthFormData) => Promise<void>;
  handleResendCode: (formData: AuthFormData) => Promise<void>;
  resetToLogin: () => void;
  clearError: () => void;
  setError: (error: string) => void;
}

/**
 * Custom hook for managing authentication state and operations
 * 
 * @returns {AuthState & AuthActions} Authentication state and action handlers
 */
export const useAuth = (): AuthState & AuthActions => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [userId, setUserId] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const router = useRouter();

  /**
   * Handles the initial login attempt with email/password
   * Initiates 2FA flow if required, or completes login if not
   */
  const handleLogin = useCallback(async (formData: AuthFormData) => {
    setLoading(true);
    setError("");

    try {
      // Send 2FA code https request
      const response = await fetch("/api/auth/2fa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setUserId(data.userId);
        
        if (!data.twoFactorRequired) {
          // Direct login for users without 2FA
          await completeLogin(formData);
        } else {
          // Show 2FA form
          setShowTwoFactor(true);
        }
      } else {
        setError(data.error || "Invalid email or password");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  /**
   * Verifies 2FA code and completes authentication.
   * 
   * Sends the verification code to the server, and on success, 
   * completes the login process via NextAuth.
   * 
   * @param code - 6-digit verification code from user
   * @param formData - Original login credentials for NextAuth
   */
  const handleTwoFactorVerification = useCallback(async (
    code: string, 
    formData: AuthFormData
  ) => {
    setLoading(true);
    setError("");

    try {
      // Verify 2FA code
      const response = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
      });

      const data = await response.json();

      if (response.ok) {
        await completeLogin(formData);
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (error) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  /**
   * Completes the login process with NextAuth and handles role-based routing
   */
  const completeLogin = useCallback(async (formData: AuthFormData) => {
    const result = await signIn("credentials", {
      email: formData.email,
      password: formData.password,
      redirect: false,
    });

    if (!result?.error) {
      const session = await getSession();

      if (!session?.user) {
        setError("Authentication failed");
        return;
      }

      // Role-based routing
      if (session.user.role === "ADMIN") {
        setError("ADMIN_PORTAL_REQUIRED");
        await fetch("/api/auth/signout", { method: "POST" });
        return;
      }

      router.push("/dashboard");
    } else {
      setError("Authentication failed");
    }
  }, [router]);

  /**
   * Handles resending 2FA verification code
   */
  const handleResendCode = useCallback(async (formData: AuthFormData) => {
    setResendLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/2fa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to resend code");
      }
    } catch (error) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }, []);

  /**
   * Resets the authentication state back to the login form
   */
  const resetToLogin = useCallback(() => {
    setShowTwoFactor(false);
    setUserId("");
    setError("");
  }, []);

  /**
   * Clears any existing error messages
   */
  const clearError = useCallback(() => {
    setError("");
  }, []);

  return {
    // State
    loading,
    error,
    showTwoFactor,
    userId,
    resendLoading,
    // Actions
    handleLogin,
    handleTwoFactorVerification,
    handleResendCode,
    resetToLogin,
    clearError,
    setError,
  };
}; 