"use client";

import { useState, useCallback, ChangeEvent } from "react";

export interface FormState {
  email: string;
  password: string;
}

export interface FormActions {
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  resetForm: () => void;
  setFormData: (data: Partial<FormState>) => void;
}

/**
 * Custom hook for managing form state and input handling
 * 
 * @param initialState - Initial form data
 * @returns {FormState & FormActions} Form state and action handlers
 */
export const useFormState = (
  initialState: FormState = { email: "", password: "" }
): FormState & FormActions => {
  const [formData, setFormData] = useState<FormState>(initialState);

  /**
   * Updates form state when input fields change.
   * 
   * @param e - Input change event containing name and value
   */
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  /**
   * Resets form to initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialState);
  }, [initialState]);

  /**
   * Merges new data into existing form state.
   * 
   * @param data - Partial form data to merge
   */
  const setFormDataPartial = useCallback((data: Partial<FormState>) => {
    setFormData((prev) => ({
      ...prev,
      ...data,
    }));
  }, []);

  return {
    // State
    email: formData.email,
    password: formData.password,
    // Actions
    handleChange,
    resetForm,
    setFormData: setFormDataPartial,
  };
}; 