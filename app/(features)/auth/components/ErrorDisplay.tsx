"use client";

import Link from "next/link";

interface ErrorDisplayProps {
  error: string;
}

/**
 * Error display component for authentication errors
 * Handles special error cases like admin portal redirection
 * 
 * @param props - Component props
 * @param props.error - Error message to display
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="alert-error">
      {error === "ADMIN_PORTAL_REQUIRED" ? (
        <div>
          <p className="font-medium">
            Admin users must use the Admin Portal to login.
          </p>
          <Link
            href="/admin/login"
            className="link-primary font-medium mt-1 inline-block"
          >
            Go to Admin Portal →
          </Link>
        </div>
      ) : (
        error
      )}
    </div>
  );
}; 