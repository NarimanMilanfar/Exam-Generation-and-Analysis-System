"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import { useFormState } from "../hooks/useFormState";
import { LoginHeader } from "../components/LoginHeader";
import { ErrorDisplay } from "../components/ErrorDisplay";
import { LoginForm } from "../components/LoginForm";
import { TwoFactorForm } from "../components/TwoFactorForm";

/**
 * Main login form container component that orchestrates the complete authentication flow.
 * 
 * This component serves as the central orchestrator for the login process,
 * managing state transitions between standard login and two-factor authentication.
 * It leverages custom hooks for separation of concerns and composed UI components
 * for better maintainability and testability.
 * 
 * ## Responsibilities
 * - Manages authentication state through the useAuth hook
 * - Handles form data state through the useFormState hook  
 * - Processes URL error parameters and sets appropriate error states
 * - Renders conditional UI based on authentication flow state
 * - Coordinates between login form and 2FA verification form
 * 
 * ## Authentication Flow
 * 1. Initial render shows login form (email/password)
 * 2. On successful credentials, either:
 *    - Completes login directly (if 2FA disabled)
 *    - Shows 2FA form (if 2FA enabled)
 * 3. 2FA form handles verification code submission
 * 4. Successful verification completes authentication
 * 5. Role-based routing redirects users appropriately
 * 
 * ## Hooks Used
 * - `useAuth`: Authentication state and operations
 * - `useFormState`: Form data management
 * - `useSearchParams`: URL parameter processing
 * - `useEffect`: URL error parameter handling
 * 
 * ## Child Components
 * - `LoginHeader`: Logo, title, and contextual messaging
 * - `ErrorDisplay`: Error message presentation with special handling
 * - `LoginForm`: Email/password input form
 * - `TwoFactorForm`: 2FA verification code form
 */
function LoginFormContainer() {
  const searchParams = useSearchParams();
  
  // Custom hooks for state management
  const auth = useAuth();
  const formState = useFormState();

  // Handle URL error parameters
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "CredentialsSignin") {
      auth.setError("Invalid email or password");
    } else if (errorParam === "EmailNotVerified") {
      auth.setError("Please verify your email before logging in");
    }
  }, [searchParams, auth.setError]);


  //the render call
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        {/* Header Section */}
        <LoginHeader 
          showTwoFactor={auth.showTwoFactor} 
          userEmail={formState.email}
        />

        {/* Error Display */}
        <ErrorDisplay error={auth.error} />

        {/* Form Section - Conditional rendering based on auth state */}
        {!auth.showTwoFactor ? (
          <LoginForm
            formData={formState}
            formActions={formState}
            loading={auth.loading}
            onSubmit={auth.handleLogin}
          />
        ) : (
          <TwoFactorForm
            formData={formState}
            loading={auth.loading}
            resendLoading={auth.resendLoading}
            onSubmit={auth.handleTwoFactorVerification}
            onResendCode={auth.handleResendCode}
            onBackToLogin={auth.resetToLogin}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Main login page component with Suspense wrapper
 * Provides error boundary and loading state for the login form
 */
export default function LoginPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginFormContainer />
    </Suspense>
  );
}
