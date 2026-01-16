"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotFound() {
  const router = useRouter();
  const [hasHistory, setHasHistory] = useState(false);

  useEffect(() => {
    if (window.history.length > 1) {
      setHasHistory(true);
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 py-12 bg-gray-50 dark:bg-gray-900">
      {/* Logo */}
      <div className="mb-6">
        <Image
          src="/logos/image_dark.png"
          alt="Not Found Illustration"
          width={80}
          height={80}
          className="mx-auto"
          priority
        />
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-black-600 dark:text-white-400 mb-4">
        404 - Page Not Found
      </h1>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md">
        Oops, the page you're looking for doesn't exist...
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => {
            if (hasHistory) {
              router.back();
            } else {
              router.push("/");
            }
          }}
          className="bg-brand-navy text-white px-4 py-2 rounded-lg hover:bg-navy-800 transition-colors"
        >
          {hasHistory ? "Go Back" : "Go Home"}
        </button>

        <button
          onClick={() => router.push("/dashboard")}
          className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
