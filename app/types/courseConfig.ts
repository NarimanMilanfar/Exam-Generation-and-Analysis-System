export interface CourseConfig {
  id: string;
  courseId: string;
  defaultQuestionCount: number;
  defaultFormat: 'MCQ' | 'TrueFalse' | 'Mixed';
  weightPerQuestion: number;
  negativeMarking: boolean;
  allowInstructorOverride: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseConfigRequest {
  defaultQuestionCount: number;
  defaultFormat: 'MCQ' | 'TrueFalse' | 'Mixed';
  weightPerQuestion: number;
  negativeMarking: boolean;
  allowInstructorOverride: boolean;
}

export interface CourseConfigResponse {
  success: boolean;
  config: CourseConfig;
}