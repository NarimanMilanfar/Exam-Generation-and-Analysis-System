"use client";

import { FormEvent } from "react";
import Link from "next/link";
import { FormState, FormActions } from "../hooks/useFormState";

interface LoginFormProps {
  formData: FormState;
  formActions: FormActions;
  loading: boolean;
  onSubmit: (formData: FormState) => Promise<void>;
}

/**
 * Login form component for email/password authentication
 *
 * @param props - Component props
 * @param props.formData - Current form state
 * @param props.formActions - Form action handlers
 * @param props.loading - Loading state indicator
 * @param props.onSubmit - Form submission handler
 */
export const LoginForm: React.FC<LoginFormProps> = ({
  formData,
  formActions,
  loading,
  onSubmit,
}) => {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form className="form-container" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email" className="form-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={formData.email}
          onChange={formActions.handleChange}
          className="form-input"
          placeholder="Enter your email"
        />
      </div>

      <div>
        <label htmlFor="password" className="form-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          value={formData.password}
          onChange={formActions.handleChange}
          className="form-input"
          placeholder="Enter your password"
        />
      </div>

      <div className="flex justify-end">
        <Link href="/auth/password-reset" className="link-primary">
          Forgot password?
        </Link>
      </div>

      <div>
        <button type="submit" disabled={loading} className="group btn-primary">
          {loading ? "Signing in..." : "Continue"}
        </button>
      </div>
    </form>
  );
};
