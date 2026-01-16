"use client";

import Image from "next/image";

interface LoginHeaderProps {
  showTwoFactor: boolean;
  userEmail?: string;
}

/**
 * Header component for the login page
 * Displays logo, title, and contextual description
 * 
 * @param props - Component props
 * @param props.showTwoFactor - Whether to show 2FA context
 * @param props.userEmail - User email for 2FA context
 */
export const LoginHeader: React.FC<LoginHeaderProps> = ({
  showTwoFactor,
  userEmail,
}) => {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-6">
        <Image
          src="/logos/image_dark.png"
          alt="UExam Logo"
          width={80}
          height={80}
          className="h-20 w-auto"
        />
      </div>

      <h2 className="text-3xl font-bold text-brand-navy">
        {showTwoFactor ? "Enter Verification Code" : "Welcome back"}
      </h2>
      
      <p className="mt-2 text-gray-600">
        {showTwoFactor
          ? "We've sent a 6-digit code to your email"
          : "Sign in to your UExam account"}
      </p>
    </div>
  );
}; 