import { 
  calculatePercentile, 
  filterStudentsByPercentile, 
  applyPercentileFilter, 
  getFilterLabel,
  StudentScore 
} from '../../app/lib/percentileFilter';
import { PercentileRange } from '../../app/components/analytics/PercentileFilter';

describe('Percentile Filter Utilities', () => {
  const mockStudents: StudentScore[] = [
    {
      studentId: 'student1',
      displayStudentId: 'S001',
      totalScore: 95,
      maxPossibleScore: 100,
      percentage: 95,
      variantCode: 'A',
      questionsCorrect: 19,
      totalQuestions: 20,
      rank: 1,
      anonymizedId: 'S001'
    },
    {
      studentId: 'student2',
      displayStudentId: 'S002',
      totalScore: 85,
      maxPossibleScore: 100,
      percentage: 85,
      variantCode: 'B',
      questionsCorrect: 17,
      totalQuestions: 20,
      rank: 2,
      anonymizedId: 'S002'
    },
    {
      studentId: 'student3',
      displayStudentId: 'S003',
      totalScore: 75,
      maxPossibleScore: 100,
      percentage: 75,
      variantCode: 'A',
      questionsCorrect: 15,
      totalQuestions: 20,
      rank: 3,
      anonymizedId: 'S003'
    },
    {
      studentId: 'student4',
      displayStudentId: 'S004',
      totalScore: 65,
      maxPossibleScore: 100,
      percentage: 65,
      variantCode: 'B',
      questionsCorrect: 13,
      totalQuestions: 20,
      rank: 4,
      anonymizedId: 'S004'
    },
    {
      studentId: 'student5',
      displayStudentId: 'S005',
      totalScore: 55,
      maxPossibleScore: 100,
      percentage: 55,
      variantCode: 'A',
      questionsCorrect: 11,
      totalQuestions: 20,
      rank: 5,
      anonymizedId: 'S005'
    }
  ];

  describe('calculatePercentile', () => {
    it('should calculate percentiles correctly for sorted students', () => {
      const sortedStudents = [...mockStudents].sort((a, b) => b.percentage - a.percentage);
      
      // Test 0th percentile (highest score)
      expect(calculatePercentile(sortedStudents, 0)).toBe(95);
      
      // Test 50th percentile (median)
      expect(calculatePercentile(sortedStudents, 50)).toBe(75);
      
      // Test 100th percentile (lowest score)
      expect(calculatePercentile(sortedStudents, 100)).toBe(55);
    });

    it('should handle empty array', () => {
      expect(calculatePercentile([], 50)).toBe(0);
    });

    it('should handle single student', () => {
      const singleStudent = [mockStudents[0]];
      expect(calculatePercentile(singleStudent, 50)).toBe(95);
    });
  });

  describe('filterStudentsByPercentile', () => {
    it('should filter top 25% of students', () => {
      const filter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      const filtered = filterStudentsByPercentile(mockStudents, filter);
      
      // With 5 students, top 25% should be the top 1-2 students
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.length).toBeLessThanOrEqual(2);
      expect(filtered[0].percentage).toBe(95); // Highest score should be included
    });

    it('should filter bottom 25% of students', () => {
      const filter: PercentileRange = { from: 0, to: 25, label: 'Bottom 25%' };
      const filtered = filterStudentsByPercentile(mockStudents, filter);
      
      // Bottom 25% should include the lowest scoring students
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.some(student => student.percentage === 55)).toBe(true); // Lowest score should be included
    });

    it('should filter middle 50% of students', () => {
      const filter: PercentileRange = { from: 25, to: 75, label: 'Middle 50%' };
      const filtered = filterStudentsByPercentile(mockStudents, filter);
      
      // Middle 50% should exclude the very top and very bottom
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(student => student.percentage > 55 && student.percentage < 95)).toBe(true);
    });

    it('should handle empty array', () => {
      const filter: PercentileRange = { from: 0, to: 100 };
      const filtered = filterStudentsByPercentile([], filter);
      expect(filtered).toEqual([]);
    });
  });

  describe('applyPercentileFilter', () => {
    it('should return all students when no filter is applied', () => {
      const result = applyPercentileFilter(mockStudents, null);
      
      expect(result.filteredStudents.length).toBe(5);
      expect(result.totalStudents).toBe(5);
      expect(result.averageScore).toBe(75); // (95+85+75+65+55)/5 = 75
      expect(result.highestScore).toBe(95);
      expect(result.lowestScore).toBe(55);
    });

    it('should apply percentile filter and recalculate statistics', () => {
      const filter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      const result = applyPercentileFilter(mockStudents, filter);
      
      expect(result.filteredStudents.length).toBeGreaterThan(0);
      expect(result.totalStudents).toBe(result.filteredStudents.length);
      expect(result.highestScore).toBeGreaterThanOrEqual(result.lowestScore);
      
      // All filtered students should have correct ranks
      result.filteredStudents.forEach((student, index) => {
        expect(student.rank).toBe(index + 1);
      });
    });

    it('should handle edge case with single student', () => {
      const singleStudent = [mockStudents[0]];
      const filter: PercentileRange = { from: 0, to: 100 };
      const result = applyPercentileFilter(singleStudent, filter);
      
      expect(result.filteredStudents.length).toBe(1);
      expect(result.totalStudents).toBe(1);
      expect(result.averageScore).toBe(95);
      expect(result.highestScore).toBe(95);
      expect(result.lowestScore).toBe(95);
    });

    it('should maintain sorting order (highest to lowest)', () => {
      const result = applyPercentileFilter(mockStudents, null);
      
      for (let i = 0; i < result.filteredStudents.length - 1; i++) {
        expect(result.filteredStudents[i].percentage).toBeGreaterThanOrEqual(
          result.filteredStudents[i + 1].percentage
        );
      }
    });
  });

  describe('getFilterLabel', () => {
    it('should return empty string for null filter', () => {
      expect(getFilterLabel(null)).toBe('');
    });

    it('should return predefined label when available', () => {
      const filter: PercentileRange = { from: 75, to: 100, label: 'Top 25%' };
      expect(getFilterLabel(filter)).toBe('Top 25%');
    });

    it('should generate label from range when no predefined label', () => {
      const filter: PercentileRange = { from: 30, to: 70 };
      expect(getFilterLabel(filter)).toBe('30% - 70%');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete filtering workflow', () => {
      // Test the complete workflow: filter -> calculate stats -> rank
      const filter: PercentileRange = { from: 50, to: 100, label: 'Top 50%' };
      const result = applyPercentileFilter(mockStudents, filter);
      
      // Verify filtering worked
      expect(result.filteredStudents.length).toBeLessThanOrEqual(mockStudents.length);
      
      // Verify statistics are recalculated
      expect(result.averageScore).toBeGreaterThan(0);
      expect(result.highestScore).toBeGreaterThanOrEqual(result.lowestScore);
      
      // Verify ranking is correct
      result.filteredStudents.forEach((student, index) => {
        expect(student.rank).toBe(index + 1);
        if (index > 0) {
          expect(student.percentage).toBeLessThanOrEqual(
            result.filteredStudents[index - 1].percentage
          );
        }
      });
    });

    it('should preserve original data integrity', () => {
      const originalStudents = JSON.parse(JSON.stringify(mockStudents));
      const filter: PercentileRange = { from: 0, to: 50 };
      
      applyPercentileFilter(mockStudents, filter);
      
      // Original array should be unchanged
      expect(mockStudents).toEqual(originalStudents);
    });
  });
});