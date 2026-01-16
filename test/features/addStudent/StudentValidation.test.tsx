import { validateStudentId } from "@/app/lib/studentValidation";

describe("Student ID Validation", () => {
  it("should accept valid 8-digit numeric IDs", () => {
    const result = validateStudentId("12345678");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("");
  });

  it("should accept 8-digit ID with leading zeros", () => {
    const result = validateStudentId("00123456");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("");
  });

  it("should reject empty ID", () => {
    const result = validateStudentId("");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/cannot be empty/i);
  });

  it("should reject whitespace-only ID", () => {
    const result = validateStudentId("   ");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/cannot be empty/i);
  });

  it("should reject ID with letters", () => {
    const result = validateStudentId("abc12345");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/must be 8 digits/i);
  });

  it("should reject ID with special characters", () => {
    const result = validateStudentId("1234-678");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/must be 8 digits/i);
  });

  it("should reject ID with less than 8 digits", () => {
    const result = validateStudentId("1234567");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/must be 8 digits/i);
  });

  it("should reject ID with more than 8 digits", () => {
    const result = validateStudentId("123456789");
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/must be 8 digits/i);
  });

  it("should handle ID with spaces around it", () => {
    const result = validateStudentId(" 12345678 ");
    expect(result.valid).toBe(true);
    expect(result.message).toBe("");
  });
});
