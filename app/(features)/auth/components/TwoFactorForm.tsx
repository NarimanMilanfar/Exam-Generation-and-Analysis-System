"use client";

import { FormEvent, useState } from "react";
import { FormState } from "../hooks/useFormState";

interface TwoFactorFormProps {
  formData: FormState;
  loading: boolean;
  resendLoading: boolean;
  onSubmit: (code: string, formData: FormState) => Promise<void>;
  onResendCode: (formData: FormState) => Promise<void>;
  onBackToLogin: () => void;
}

/**
 * Two-factor authentication form component
 * 
 * @param props - Component props
 * @param props.formData - Login form data for context
 * @param props.loading - Verification loading state
 * @param props.resendLoading - Resend code loading state
 * @param props.onSubmit - 2FA code submission handler
 * @param props.onResendCode - Resend code handler
 * @param props.onBackToLogin - Back to login handler
 */
export const TwoFactorForm: React.FC<TwoFactorFormProps> = ({
  formData,
  loading,
  resendLoading,
  onSubmit,
  onResendCode,
  onBackToLogin,
}) => {
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(twoFactorCode, formData);
  };

  const handleResendCode = async () => {
    await onResendCode(formData);
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="twoFactorCode" className="form-label">
          Verification Code
        </label>
        <input
          id="twoFactorCode"
          name="twoFactorCode"
          type="text"
          required
          maxLength={6}
          value={twoFactorCode}
          onChange={(e) => setTwoFactorCode(e.target.value)}
          className="form-input text-center text-2xl font-mono tracking-widest"
          placeholder="000000"
        />
        <p className="mt-2 text-sm text-gray-600">
          Enter the 6-digit code sent to {formData.email}
        </p>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onBackToLogin}
          className="flex-1 btn-secondary"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading || twoFactorCode.length !== 6}
          className="flex-1 btn-primary"
        >
          {loading ? "Verifying..." : "Verify"}
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendLoading}
          className="link-primary disabled:opacity-50"
        >
          {resendLoading ? "Sending..." : "Resend code"}
        </button>
      </div>
    </form>
  );
}; 