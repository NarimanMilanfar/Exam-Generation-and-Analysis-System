/**
 * Validates if a string matches the course code format (3-4 letters, space, 3 numbers)
 * Example: "CSC 101" or "COSC 101" would return true
 * @param code The course code to validate
 * @returns boolean indicating if the code is valid
 */
export function isValidCourseCode(code: string): boolean {
    const courseCodeRegex = /^[A-Z]{3,4}\s\d{3}$/;
    return courseCodeRegex.test(code);
}

/**
 * Formats a course code to ensure it matches the required format
 * Enforces strict format: exactly 3-4 letters, 1 space, 3 digits
 * @param code The course code to format
 * @returns The formatted course code or null if invalid
 */
export function formatCourseCode(code: string): string | null {
    // Remove any extra spaces and convert to uppercase
    const cleaned = code.trim().toUpperCase();
    
    // If it's already in the correct format, return it
    if (isValidCourseCode(cleaned)) {
        return cleaned;
    }
    
    // Try to format common input patterns
    // Remove all spaces first, then try to parse
    const noSpaces = cleaned.replace(/\s+/g, '');
    
    // Check if we have exactly 6 or 7 characters (3-4 letters + 3 digits)
    if (noSpaces.length === 6 || noSpaces.length === 7) {
        const letterCount = noSpaces.length - 3; // Last 3 are digits
        const letters = noSpaces.slice(0, letterCount);
        const numbers = noSpaces.slice(letterCount);
        
        // Validate that first 3-4 are letters and last 3 are digits
        if (/^[A-Z]{3,4}$/.test(letters) && /^\d{3}$/.test(numbers)) {
            const formatted = `${letters} ${numbers}`;
            return formatted;
        }
    }
    
    // Try to handle input with spaces in different positions
    const parts = cleaned.split(/\s+/).filter(part => part.length > 0);
    
    if (parts.length === 2) {
        const [part1, part2] = parts;
        
        // Check if first part is 3-4 letters and second part is 3 digits
        if (/^[A-Z]{3,4}$/.test(part1) && /^\d{3}$/.test(part2)) {
            return `${part1} ${part2}`;
        }
    }
    
    // If no valid format can be created, return null
    return null;
} 