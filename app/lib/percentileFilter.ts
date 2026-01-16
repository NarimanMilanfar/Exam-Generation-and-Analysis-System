import { PercentileRange } from '../components/analytics/PercentileFilter';

export type { PercentileRange };

export interface StudentScore {
  studentId: string;
  displayStudentId?: string;
  name?: string;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  variantCode: string;
  questionsCorrect: number;
  totalQuestions: number;
  rank?: number;
  anonymizedId?: string;
}

export interface FilteredStudentData {
  filteredStudents: StudentScore[];
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
}

export function calculatePercentile(sortedStudents: StudentScore[], percentile: number): number {
  if (sortedStudents.length === 0) return 0;
  
  const index = Math.floor((percentile / 100) * (sortedStudents.length - 1));
  const clampedIndex = Math.max(0, Math.min(index, sortedStudents.length - 1));
  
  return sortedStudents[clampedIndex].percentage;
}

export function filterStudentsByPercentile(
  students: StudentScore[],
  filter: PercentileRange
): StudentScore[] {
  if (students.length === 0) return [];

  const sortedStudents = [...students].sort((a, b) => b.percentage - a.percentage);
  const totalStudents = sortedStudents.length;
  
  // Calculate which students to include based on percentile range
  // For example: top 25% means from 0% to 25% of the ranked list (0-based index)
  // Bottom 25% means from 75% to 100% of the ranked list
  
  const startIndex = Math.floor(((100 - filter.to) / 100) * totalStudents);
  const endIndex = Math.floor(((100 - filter.from) / 100) * totalStudents);
  
  // Ensure indices are within bounds
  const safeStartIndex = Math.max(0, Math.min(startIndex, totalStudents - 1));
  const safeEndIndex = Math.max(0, Math.min(endIndex, totalStudents - 1));
  
  // Return the slice of students in this percentile range
  return sortedStudents.slice(safeStartIndex, safeEndIndex + 1);
}

export function applyPercentileFilter(
  students: StudentScore[],
  filter: PercentileRange | null
): FilteredStudentData {
  const sortedStudents = [...students].sort((a, b) => b.percentage - a.percentage);
  
  let filteredStudents = sortedStudents;
  
  if (filter) {
    filteredStudents = filterStudentsByPercentile(students, filter);
  }

  const rankedStudents = filteredStudents.map((student, index) => ({
    ...student,
    rank: index + 1,
  }));

  const totalStudents = rankedStudents.length;
  const averageScore = totalStudents > 0
    ? rankedStudents.reduce((sum, student) => sum + student.percentage, 0) / totalStudents
    : 0;
  const highestScore = rankedStudents.length > 0 ? rankedStudents[0].percentage : 0;
  const lowestScore = rankedStudents.length > 0 ? rankedStudents[rankedStudents.length - 1].percentage : 0;

  return {
    filteredStudents: rankedStudents,
    totalStudents,
    averageScore,
    highestScore,
    lowestScore
  };
}

export function getFilterLabel(filter: PercentileRange | null): string {
  if (!filter) return '';
  
  if (filter.label) {
    return filter.label;
  }
  
  return `${filter.from}% - ${filter.to}%`;
}