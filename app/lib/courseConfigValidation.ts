import prisma from "../../lib/prisma";

interface ExamValidationParams {
  courseId: string;
  questionCount?: number;
  negativeMarking?: boolean;
  questionIds?: string[];
  questionBankIds?: string[];
  examQuestions?: Array<{ questionId: string; negativePoints?: number | null; points?: number }>;
  examFormat?: 'MCQ' | 'TrueFalse' | 'Mixed';
}

interface ValidationResult {
  isValid: boolean;
  violations: string[];
  coursePolicy?: {
    defaultQuestionCount: number;
    defaultFormat: string;
    weightPerQuestion: number;
    negativeMarking: boolean;
    allowInstructorOverride: boolean;
  };
}

export async function validateExamAgainstCourseConfig(
  params: ExamValidationParams
): Promise<ValidationResult> {
  const { courseId, questionCount, negativeMarking, questionIds, questionBankIds, examQuestions, examFormat } = params;

  console.log("🔍 Course config validation:", { courseId, questionCount, negativeMarking, questionIds, questionBankIds, examFormat });

  // Get course configuration
  const courseConfig = await prisma.courseConfig.findUnique({
    where: { courseId },
  });

  console.log("📋 Found course config:", courseConfig);

  // If no config exists or overrides are allowed, validation passes
  if (!courseConfig || courseConfig.allowInstructorOverride) {
    console.log("✅ Validation passed: No config or overrides allowed");
    return { isValid: true, violations: [] };
  }

  const violations: string[] = [];

  // Calculate total question count if questions are being specified
  let totalQuestionCount = questionCount;
  const hasQuestionData = questionIds?.length || questionBankIds?.length;
  
  if (totalQuestionCount === undefined && hasQuestionData) {
    totalQuestionCount = (questionIds?.length || 0);
    
    if (questionBankIds && questionBankIds.length > 0) {
      const bankQuestionCount = await prisma.question.count({
        where: { 
          questionBankId: { in: questionBankIds },
          courseId: courseId 
        }
      });
      totalQuestionCount += bankQuestionCount;
    }
  }

  console.log("📊 Question count calculation:", { totalQuestionCount, hasQuestionData, configDefault: courseConfig.defaultQuestionCount });

  // Only validate question count if questions are actually being set
  if (totalQuestionCount !== undefined && totalQuestionCount !== courseConfig.defaultQuestionCount) {
    violations.push(`Number of questions must be exactly ${courseConfig.defaultQuestionCount} (course policy)`);
  }

  // Validate exam format setting
  if (examFormat !== undefined && examFormat !== courseConfig.defaultFormat) {
    violations.push(`Exam format must be ${courseConfig.defaultFormat} (course policy)`);
  }

  // Validate negative marking setting
  if (negativeMarking !== undefined && negativeMarking !== courseConfig.negativeMarking) {
    violations.push(`Negative marking must be ${courseConfig.negativeMarking ? 'enabled' : 'disabled'} (course policy)`);
  }

  // Check question weight per question enforcement
  console.log("⚖️ Checking weight per question policy:", courseConfig.weightPerQuestion);
  
  if (examQuestions) {
    console.log("📝 Checking examQuestions weights:", examQuestions.map(q => ({ id: q.questionId, points: q.points })));
    
    const questionsWithWrongWeight = examQuestions.filter(q => 
      q.points !== undefined && q.points !== courseConfig.weightPerQuestion
    );
    
    console.log("❌ Questions with wrong weight:", questionsWithWrongWeight);
    
    if (questionsWithWrongWeight.length > 0) {
      violations.push(`All questions must have exactly ${courseConfig.weightPerQuestion} points per course policy (${questionsWithWrongWeight.length} questions have wrong weight)`);
    }
  } else if (questionIds && questionIds.length > 0) {
    console.log("🔍 Checking questionIds weights from database:", questionIds);
    
    // Check the actual questions from database
    const questions = await prisma.question.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, points: true }
    });
    
    console.log("📚 Question weights from DB:", questions.map(q => ({ id: q.id, points: q.points })));
    
    const questionsWithWrongWeight = questions.filter(q => 
      q.points !== courseConfig.weightPerQuestion
    );
    
    console.log("❌ Questions with wrong weight from DB:", questionsWithWrongWeight);
    
    if (questionsWithWrongWeight.length > 0) {
      violations.push(`All questions must have exactly ${courseConfig.weightPerQuestion} points per course policy (${questionsWithWrongWeight.length} questions have wrong weight)`);
    }
  } else if (questionBankIds && questionBankIds.length > 0) {
    console.log("🏦 Checking question bank weights:", questionBankIds);
    
    // Check questions from question banks
    const bankQuestions = await prisma.question.findMany({
      where: { 
        questionBankId: { in: questionBankIds },
        courseId: courseId 
      },
      select: { id: true, points: true, questionBankId: true }
    });
    
    console.log("📚 Bank question weights from DB:", bankQuestions.map(q => ({ id: q.id, points: q.points, bankId: q.questionBankId })));
    
    const questionsWithWrongWeight = bankQuestions.filter(q => 
      q.points !== courseConfig.weightPerQuestion
    );
    
    console.log("❌ Bank questions with wrong weight:", questionsWithWrongWeight);
    
    if (questionsWithWrongWeight.length > 0) {
      violations.push(`Questions from question banks must have exactly ${courseConfig.weightPerQuestion} points per course policy (${questionsWithWrongWeight.length} questions have wrong weight)`);
    }
  }

  // Check individual question negative marking settings
  if (!courseConfig.negativeMarking) {
    console.log("🚫 Course policy DISABLES negative marking, checking questions...");
    
    // If course policy disables negative marking, check that no questions have negative points
    if (examQuestions) {
      console.log("📝 Checking examQuestions:", examQuestions.map(q => ({ id: q.questionId, negativePoints: q.negativePoints })));
      
      const questionsWithNegativePoints = examQuestions.filter(q => 
        q.negativePoints !== undefined && q.negativePoints !== null && q.negativePoints !== 0
      );
      
      console.log("❌ Questions with negative points:", questionsWithNegativePoints);
      
      if (questionsWithNegativePoints.length > 0) {
        violations.push(`Questions cannot have negative marking when course policy disables it (${questionsWithNegativePoints.length} questions violate policy)`);
      }
    } else if (questionIds && questionIds.length > 0) {
      console.log("🔍 Checking questionIds from database:", questionIds);
      
      // Check the actual questions from database
      const questions = await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, negativePoints: true, text: true }
      });
      
      console.log("📚 Questions from DB:", questions.map(q => ({ id: q.id, negativePoints: q.negativePoints })));
      
      const questionsWithNegativePoints = questions.filter(q => 
        q.negativePoints !== undefined && q.negativePoints !== null && q.negativePoints !== 0
      );
      
      console.log("❌ Questions with negative points from DB:", questionsWithNegativePoints);
      
      if (questionsWithNegativePoints.length > 0) {
        violations.push(`Questions cannot have negative marking when course policy disables it (${questionsWithNegativePoints.length} questions violate policy)`);
      }
    } else if (questionBankIds && questionBankIds.length > 0) {
      console.log("🏦 Checking questions from question banks:", questionBankIds);
      
      // Check questions from question banks
      const bankQuestions = await prisma.question.findMany({
        where: { 
          questionBankId: { in: questionBankIds },
          courseId: courseId 
        },
        select: { id: true, negativePoints: true, questionBankId: true }
      });
      
      console.log("📚 Bank questions from DB:", bankQuestions.map(q => ({ id: q.id, negativePoints: q.negativePoints, bankId: q.questionBankId })));
      
      const questionsWithNegativePoints = bankQuestions.filter(q => 
        q.negativePoints !== undefined && q.negativePoints !== null && q.negativePoints !== 0
      );
      
      console.log("❌ Bank questions with negative points:", questionsWithNegativePoints);
      
      if (questionsWithNegativePoints.length > 0) {
        violations.push(`Questions from question banks cannot have negative marking when course policy disables it (${questionsWithNegativePoints.length} questions violate policy)`);
      }
    }
  } else {
    console.log("✅ Course policy ALLOWS negative marking");
  }

  const result = {
    isValid: violations.length === 0,
    violations,
    coursePolicy: {
      defaultQuestionCount: courseConfig.defaultQuestionCount,
      defaultFormat: courseConfig.defaultFormat,
      weightPerQuestion: courseConfig.weightPerQuestion,
      negativeMarking: courseConfig.negativeMarking,
      allowInstructorOverride: courseConfig.allowInstructorOverride,
    },
  };

  console.log("🎯 Validation result:", result);
  return result;
}