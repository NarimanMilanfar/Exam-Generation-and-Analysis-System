import Link from "next/link";
import Image from "next/image";

interface VerificationErrorPageProps {
  searchParams: { error?: string };
}

export default function ErrorPage({
  searchParams,
}: VerificationErrorPageProps) {
  const error = searchParams.error;

  const errorMessage =
    error === "missing-token"
      ? "Verification token is missing."
      : error === "invalid-token"
      ? "Invalid verification token."
      : error === "expired-token"
      ? "Verification token has expired."
      : error === "user-not-found"
      ? "User not found."
      : error === "server-error"
      ? "Server error occurred."
      : "An unknown error occurred.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white shadow-lg rounded-xl">
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
          <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-navy">
            Verification Failed
          </h2>
          <div className="mt-4 flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-accent-error"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="mt-4 text-center text-md text-gray-600">
            {errorMessage}
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-navy hover:bg-navy-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-navy transition duration-200"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
