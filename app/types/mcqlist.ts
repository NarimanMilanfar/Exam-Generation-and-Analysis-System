export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: string;
  type: string;
  points: number;
  negativePoints?: number | null;
  difficulty?: string; // EASY, MEDIUM, HARD
  topic?: string;
  questionBankId?: string | null;
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
  questionBankCount?: number;
  createdAt: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  description: string;
  topic?: string;
  color: string;
  courseId: string;
  questions: Question[];
  totalPoints: number;
  questionCount: number;
  createdAt: string;
  term?: {
    id: string;
    term: string;
    year: number;
  } | null;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  courseId: string;
  questions: ExamQuestion[];
  totalPoints: number;
  questionCount: number;
  timeLimit?: number; // in minutes
  startDate?: string;
  endDate?: string;
  // Exam configuration
  numberOfVersions?: number;
  questionsPerExam?: number;
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  negativeMarking?: boolean;
  passingScore?: number;
  instructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  questionId: string;
  question: Question;
  questionBankId?: string;
  order: number;
  points?: number; // Override question points for this exam
  negativePoints?: number | null;
}

export interface ExamVariant {
  id: string;
  examId: string;
  variantCode: string;
  questionOrder?: string; // JSON string
  answerOrder?: string; // JSON string
}

export interface ExamResult {
  id: string;
  examId: string;
  userId: string;
  score: number;
  totalPoints: number;
  percentage?: number;
  variantCode?: string;
  startedAt: string;
  completedAt?: string;
}

export interface ExamTemplate {
  id: string;
  title: string;
  description: string;
  color: string;
  courseId: string;
  items: TemplateItem[];
  createdAt: string;
  updatedAt: string;
}

export interface TemplateItem {
  id: string;
  templateId: string;
  questionId?: string; // For required questions, directly link to question ID
  questionBankId?: string; // Question bank ID for random selection
  type?: string; // Question type filter
  difficulty?: string; // Difficulty level filter
  topic?: string; // Topic/subject filter
  points?: number; // Point value for this question
  isRequired: boolean; // Whether this is a required question
}
