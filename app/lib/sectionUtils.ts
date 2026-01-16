/**
 * Section Utilities for Course Management
 * Provides functions for section generation, validation, and formatting
 */

export interface SectionConfig {
  termName: string;
  maxSections?: number;
}

export interface SectionValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

/**
 * Generate section options based on term name
 * Term 1 (Winter Term 1, Summer Term 1): 001-010
 * Term 2 (Winter Term 2, Summer Term 2): 101-110
 */
export function generateSectionOptions(
  termName: string,
  maxSections: number = 10
): string[] {
  if (!termName || typeof termName !== "string") {
    return [];
  }

  const sections: string[] = [];
  const isFirstTerm = termName.toLowerCase().includes("1");
  const startNumber = isFirstTerm ? 1 : 101;

  for (let i = 0; i < maxSections; i++) {
    const sectionNumber = startNumber + i;
    const formattedSection = isFirstTerm
      ? sectionNumber.toString().padStart(3, "0") // 001, 002, etc.
      : sectionNumber.toString(); // 101, 102, etc.
    sections.push(formattedSection);
  }

  return sections;
}

/**
 * Validate section format and consistency with term
 */
export function validateSection(
  section: string,
  termName: string
): SectionValidationResult {
  if (!section || !termName) {
    return {
      isValid: false,
      error: "Section and term name are required",
    };
  }

  if (typeof section !== "string" || typeof termName !== "string") {
    return {
      isValid: false,
      error: "Section and term name must be strings",
    };
  }

  const sectionNum = parseInt(section, 10);
  if (isNaN(sectionNum)) {
    return {
      isValid: false,
      error: "Section must be a valid number",
      suggestions: ["Use format like 001, 002, 101, 102"],
    };
  }

  const isFirstTerm = termName.toLowerCase().includes("1");

  if (isFirstTerm) {
    // Term 1 should have sections 001-010
    if (sectionNum >= 1 && sectionNum <= 10) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        error: "Term 1 sections must be between 001-010",
        suggestions: ["Use sections 001, 002, 003, ..., 010 for Term 1"],
      };
    }
  } else {
    // Term 2 should have sections 101-110
    if (sectionNum >= 101 && sectionNum <= 110) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        error: "Term 2 sections must be between 101-110",
        suggestions: ["Use sections 101, 102, 103, ..., 110 for Term 2"],
      };
    }
  }
}

/**
 * Format section number for display
 */
export function formatSectionDisplay(section: string): string {
  if (!section) return "";

  const sectionNum = parseInt(section, 10);
  if (isNaN(sectionNum)) return section;

  // If it's a single digit, format as 00X
  if (sectionNum >= 1 && sectionNum <= 10) {
    return sectionNum.toString().padStart(3, "0");
  }

  // Otherwise return as is
  return section;
}

/**
 * Get section type based on section number
 */
export function getSectionType(section: string): "term1" | "term2" | "unknown" {
  if (!section) return "unknown";

  const sectionNum = parseInt(section, 10);
  if (isNaN(sectionNum)) return "unknown";

  if (sectionNum >= 1 && sectionNum <= 10) {
    return "term1";
  } else if (sectionNum >= 101 && sectionNum <= 110) {
    return "term2";
  }

  return "unknown";
}

/**
 * Check if a section is valid for a given term type
 */
export function isSectionValidForTerm(
  section: string,
  termName: string
): boolean {
  const validation = validateSection(section, termName);
  return validation.isValid;
}

/**
 * Get recommended sections for a term
 */
export function getRecommendedSections(termName: string): string[] {
  return generateSectionOptions(termName);
}

/**
 * Parse section from various input formats
 */
export function parseSection(input: string): string | null {
  if (!input || typeof input !== "string") return null;

  // Remove any non-digit characters and parse
  const cleaned = input.replace(/\D/g, "");
  if (!cleaned) return null;

  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return null;

  // Format based on the number range
  if (num >= 1 && num <= 10) {
    return num.toString().padStart(3, "0");
  } else if (num >= 101 && num <= 110) {
    return num.toString();
  }

  return null;
}

/**
 * Get section validation rules for UI display
 */
export function getSectionValidationRules(termName: string): {
  pattern: string;
  message: string;
  examples: string[];
} {
  const isFirstTerm = termName.toLowerCase().includes("1");

  if (isFirstTerm) {
    return {
      pattern: "^(00[1-9]|010)$",
      message: "Term 1 sections must be 001-010",
      examples: ["001", "002", "003", "010"],
    };
  } else {
    return {
      pattern: "^(10[1-9]|110)$",
      message: "Term 2 sections must be 101-110",
      examples: ["101", "102", "103", "110"],
    };
  }
}

/**
 * Sort sections in the correct order
 */
export function sortSections(sections: string[]): string[] {
  return sections.sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    return numA - numB;
  });
}
