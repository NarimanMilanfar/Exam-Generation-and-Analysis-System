// app/lib/studentValidation.ts

export const validateStudentId = (
  studentId: string
): { valid: boolean; message: string } => {
  const studentIdRegex = /^\d{8}$/;

  if (!studentId.trim()) {
    return {
      valid: false,
      message: "Student ID cannot be empty.",
    };
  }

  if (!studentIdRegex.test(studentId.trim())) {
    return {
      valid: false,
      message:
        "Student ID must be 8 digits and cannot contain letters, symbols or spaces.",
    };
  }

  return { valid: true, message: "" };
};
