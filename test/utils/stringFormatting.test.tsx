import '@testing-library/jest-dom';
import { describe, expect, it } from '@jest/globals';
import { isValidCourseCode, formatCourseCode } from '../../app/lib/stringFormatting';

describe('Course Code Validation', () => {
    describe('isValidCourseCode', () => {
        it('should return true for valid course codes', () => {
            const validCodes = [
                'COSC 499',
                'MATH 101',
                'ENGL 200',
                'PHYS 301',
                'CSC 101',     // 3 letters
                'MAT 200',     // 3 letters
                'ENG 150'      // 3 letters
            ];
            
            validCodes.forEach(code => {
                expect(isValidCourseCode(code)).toBe(true);
            });
        });

        it('should return false for invalid course codes', () => {
            const invalidCodes = [
                'COSC499',      // Missing space
                'COSC 4999',    // Too many numbers
                'CO 499',       // Too few letters (only 2)
                'COSC 49',      // Too few numbers
                'COSCA 499',    // Too many letters (5)
                'cosc 499',     // Lowercase letters
                'COSC  499',    // Extra space
                'COSC-499',     // Wrong separator
                '',            // Empty string
                ' ',           // Just space
                'COSC',        // Missing numbers
                '499'          // Missing letters
            ];
            
            invalidCodes.forEach(code => {
                expect(isValidCourseCode(code)).toBe(false);
            });
        });
    });

    describe('formatCourseCode', () => {
        it('should return formatted code for valid inputs', () => {
            const testCases = [
                { input: 'cosc 499', expected: 'COSC 499' },
                { input: 'COSC499', expected: 'COSC 499' },
                { input: 'cosc499', expected: 'COSC 499' },
                { input: 'COSC 499', expected: 'COSC 499' },
                { input: 'cosc  499', expected: 'COSC 499' },
                { input: 'COSC  499', expected: 'COSC 499' },
                { input: 'csc 101', expected: 'CSC 101' },  // 3 letters
                { input: 'CSC101', expected: 'CSC 101' },   // 3 letters
                { input: 'csc101', expected: 'CSC 101' }    // 3 letters
            ];
            
            testCases.forEach(({ input, expected }) => {
                expect(formatCourseCode(input)).toBe(expected);
            });
        });

        it('should return null for invalid inputs', () => {
            const invalidInputs = [
                'invalid',
                'COSC',
                '499',
                'COSC 4999',
                'CO 499',       // Only 2 letters
                'COSCA 499',    // 5 letters
                'COSC 49',
                'COSC-499',
                '',
                ' ',
                'COSC 499 EXTRA'
            ];
            
            invalidInputs.forEach(input => {
                expect(formatCourseCode(input)).toBeNull();
            });
        });

        it('should handle edge cases', () => {
            // Test with extra long inputs
            expect(formatCourseCode('COSC1234567')).toBeNull();
            expect(formatCourseCode('COSC1234567 499')).toBeNull();
            
            // Test with special characters
            expect(formatCourseCode('COSC@499')).toBeNull();
            expect(formatCourseCode('COSC#499')).toBeNull();
            
            // Test with numbers in wrong place
            expect(formatCourseCode('1234 499')).toBeNull();
            expect(formatCourseCode('COSC ABC')).toBeNull();
        });
    });
}); 