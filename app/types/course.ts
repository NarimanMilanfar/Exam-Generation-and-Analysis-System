export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE'
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: QuestionType;
  points: number;
  negativePoints?: number | null; 
  courseId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
  createdAt: string;
}

export interface Exam {
  id: string;
  name: string;
  description: string;
  color: string;
  examCount: number;
  questionCount: number;
  createdAt: string;
  questions: Question[];
}