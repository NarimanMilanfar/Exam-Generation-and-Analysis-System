import Link from "next/link";
import Image from "next/image";

export default function VerifiedPage() {
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
            Email Verified!
          </h2>
          <div className="mt-4 flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-accent-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="mt-4 text-center text-md text-gray-600">
            Your email address has been successfully verified.
          </p>
          <p className="mt-2 text-center text-md text-gray-600">
            You can now log in to your account.
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
