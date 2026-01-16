import { BiPointAnalysisResult } from "../types/analysis";

export interface FlaggedSubmission {
  student1: string;
  student2: string;
  probability: number; // New: probability of cheating based on formula
  student1Score?: number;
  student2Score?: number;
  student1Variant?: string;
  student2Variant?: string;
  // New fields for the formula components
  variantSimilarity?: number;
  responseSimilarity?: number;
  classAverageScore?: number;
  student1Biserial?: number;
  student2Biserial?: number;
  // Cross-variant grade analysis
  student1GradeChange?: number;
  student2GradeChange?: number;
  student1CrossGrade?: number;
  student2CrossGrade?: number;
}

export interface FlaggingConfig {
  highProbabilityThreshold: number; // Default: 0.8 (80% probability)
  mediumProbabilityThreshold: number; // Default: 0.7 (70% probability)
  lowProbabilityThreshold: number; // Default: 0.5 (50% probability)
}

const DEFAULT_CONFIG: FlaggingConfig = {
  highProbabilityThreshold: 0.8,
  mediumProbabilityThreshold: 0.7,
  lowProbabilityThreshold: 0.5,
};

interface StudentResponsePiar {
  student1: string;
  student2: string;
  similarity: number;
  variantCode: string;
}

interface modelDataPair {
  variantSimilarity: number,
  responseSimilarity: number,
  student1Score: number,
  student2Score: number,
  classAverageScore: number,
  student1VaraintBiserialAverage: number,
  student2VaraintBiserialAverage: number,
  student1ScoreOnStudent2Varaint: number,
  student2ScoreOnStudent1Varaint: number,
}

export interface ModelConfig {
  invertVaraintSimularity: boolean,

}


interface CrossVariantGradeResult {
  student1GradeChange: number; // Percentage change when student1 is graded on student2's variant
  student2GradeChange: number; // Percentage change when student2 is graded on student1's variant
  student1OriginalGrade: number;
  student2OriginalGrade: number;
  student1CrossGrade: number;
  student2CrossGrade: number;
}




/**
 * Calculates the probability of cheating using the following model
 * ```md
 * p = sqrt([(S_v * S_s) / (S_v + S_s)] * ((s_1 + s_2) + max(sc1, sc2) / s_av) * sqrt((Q_av1 * Q_av2)^2))
 * ```
 * 
 * S_v = Student pair varaint simularity
 * S_s = Student pair Response simularity
 * s_1 = Student 1 score
 * s_2 = Student 2 score
 * s_av = Class average score
 * Q_av1 = Student 1 variant biserial average
 * Q_av2 = Student 2 variant biserial average
 * sc1 = Student 1 score on student 2 variant
 * sc2 = Student 2 score on student 1 variant
 *
 * it works by essential calcuating a value that tries to be as close to 1 as possible.
 * the closer to 1 it is the more likely the studetn has cheated on the exam.
 *
 * we take a wieghted simularity of both the students answers but also thier varaint simularity.
 * this allows us to get a baseline coupled with the biserial whether the students are picking
 * questions non randomly, then get a score calculation based on the average of the class.
 * the values are usaully pretty small unless the score is really big or thier is high 
 * simularity on both simularity metrics. 
 *
 * what this means that two of three the requirements from the simularity, student score or 
 * bieserils need to be met to get a number large enough when sqrt'd to be above .7 which would 
 * be the minuim value to flag. a highly likely pair would be around .8 or higher.   
 */
function ModelPredict(
  modelData: modelDataPair
): number {
  // Ensure all values are positive and within valid ranges
  const Sv = Math.max(0, Math.min(1, modelData.variantSimilarity));
  const Ss = Math.max(0, Math.min(1, modelData.responseSimilarity));
  const s1 = Math.max(0, Math.min(100, modelData.student1Score));
  const s2 = Math.max(0, Math.min(100, modelData.student2Score));
  const sav = Math.max(0.1, modelData.classAverageScore); // Avoid division by zero
  const Qav1 = Math.max(0, modelData.student1VaraintBiserialAverage);
  const Qav2 = Math.max(0, modelData.student2VaraintBiserialAverage);
  const sc1 = modelData.student2ScoreOnStudent1Varaint
  const sc2 = modelData.student1ScoreOnStudent2Varaint


  // Calculate the formula components
  const similarityComponent = (Sv * Ss) / (Sv + Ss);
  const scoreComponent = ((s1 + s2) + Math.max(sc1, sc2)) / sav;
  const biserialComponent = Math.sqrt((Qav1 * Qav2) ** 2);

  // Calculate the final probability
  const probability = Math.sqrt(similarityComponent * scoreComponent * biserialComponent);

  // Ensure the result is between 0 and 0.999 (99.9%) because its not guaranteed
  return Math.max(0, Math.min(0.999, probability));
}






/**
 * Processes the submissions using the model and returns a list of flagged submissions
 * @param VariantSimilarityMatrix - The variant similarity matrix
 * @param ResponseSimilarityMatrix - The response similarity matrix
 * @param StudentScores - The student scores
 * @param StudentVariantBiserialAverages - The student variant biserial averages
 * @param config - The config
 * @returns A list of flagged submissions
 */
export function ProcessSubmissions(
  VariantSimilarityMatrix: Record<string, Record<string, number>>,
  ResponseSimilarityMatrix: Record<string, Record<string, number>>,
  StudentScores: BiPointAnalysisResult,
  StudentVariantBiserialAverages: BiPointAnalysisResult[],
  config: FlaggingConfig,
  modelConfig: ModelConfig = {
    invertVaraintSimularity: false,
  },
): FlaggedSubmission[] {
  const flaggedSubmissions: FlaggedSubmission[] = [];


  // Step 1: Filter out duplicates and self-comparisons
  const studentResponsePairs = filterDuplicatePairs(ResponseSimilarityMatrix);

  // Step 2: Calculate class average score
  const classAverageScore = calculateClassAverageScore(StudentScores);

  // Step 3: Process each pair
  for (const pair of studentResponsePairs) {
    // Get student data
    const student1Data = findStudentData(pair.student1, StudentScores);
    const student2Data = findStudentData(pair.student2, StudentScores);

    if (!student1Data || !student2Data) {
      console.warn(`Missing student data for pair: ${pair.student1} vs ${pair.student2}`);
      continue;
    }

    // Get variant similarity
    let variantSimilarity = getVariantSimilarity(pair.student1, pair.student2, VariantSimilarityMatrix);

    // Invert variant similarity if configured
    if (modelConfig.invertVaraintSimularity) {
      variantSimilarity = 1 - variantSimilarity;
    }

    // Get biserial averages
    const student1Biserial = getStudentBiserial(pair.student1, StudentVariantBiserialAverages);
    const student2Biserial = getStudentBiserial(pair.student2, StudentVariantBiserialAverages);

    // Calculate cross-variant grades
    const crossVariantGrades = calculateCrossVariantGrades(pair, StudentScores, StudentVariantBiserialAverages);

    // Create model data object
    const modelData: modelDataPair = {
      variantSimilarity,
      responseSimilarity: pair.similarity,
      student1Score: student1Data.percentage,
      student2Score: student2Data.percentage,
      classAverageScore,
      student1VaraintBiserialAverage: student1Biserial,
      student2VaraintBiserialAverage: student2Biserial,
      student1ScoreOnStudent2Varaint: crossVariantGrades?.student1CrossGrade || 0,
      student2ScoreOnStudent1Varaint: crossVariantGrades?.student2CrossGrade || 0
    };

    // Calculate probability using Wesolowsky formula
    const probability = ModelPredict(modelData);

    const flaggedSubmission: FlaggedSubmission = {
      student1: pair.student1,
      student2: pair.student2,
      probability,
      student1Score: student1Data.percentage,
      student2Score: student2Data.percentage,
      student1Variant: student1Data.variantCode,
      student2Variant: student2Data.variantCode,
      variantSimilarity,
      responseSimilarity: pair.similarity,
      classAverageScore,
      student1Biserial,
      student2Biserial,
      // Cross-variant grade analysis
      student1GradeChange: crossVariantGrades?.student1GradeChange,
      student2GradeChange: crossVariantGrades?.student2GradeChange,
      student1CrossGrade: crossVariantGrades?.student1CrossGrade,
      student2CrossGrade: crossVariantGrades?.student2CrossGrade,
    };

    flaggedSubmissions.push(flaggedSubmission);
  }


  // Sort by probability (highest first)
  return flaggedSubmissions.sort((a, b) => b.probability - a.probability);
}





/**
 * Grades students using each other's variant answer sheets to detect potential answer sharing
 * @param studentPair - The pair of students to cross-grade
 * @param analysisResult - The main analysis result containing student responses and variant data
 * @param variantAnalysisResults - Array of variant-specific analysis results
 * @returns Grade changes for both students when graded on each other's variants
 */
function calculateCrossVariantGrades(
  studentPair: StudentResponsePiar,
  analysisResult: BiPointAnalysisResult,
  variantAnalysisResults: BiPointAnalysisResult[]
): CrossVariantGradeResult | null {
  // Extract variant codes from student IDs
  const variant1Match = studentPair.student1.match(/\(([^)]+)\)/);
  const variant2Match = studentPair.student2.match(/\(([^)]+)\)/);

  if (!variant1Match || !variant2Match) {
    console.warn(`Could not extract variant codes from student IDs: ${studentPair.student1}, ${studentPair.student2}`);
    return null;
  }

  const variant1Code = variant1Match[1];
  const variant2Code = variant2Match[1];

  // If students have the same variant, return 0 changes
  if (variant1Code === variant2Code) {
    return {
      student1GradeChange: 0,
      student2GradeChange: 0,
      student1OriginalGrade: 0,
      student2OriginalGrade: 0,
      student1CrossGrade: 0,
      student2CrossGrade: 0
    };
  }

  // Find student responses
  const student1Response = analysisResult.metadata.studentResponses?.find(r =>
    r.studentId === studentPair.student1 || r.displayStudentId === studentPair.student1.split(' (')[0]
  );
  const student2Response = analysisResult.metadata.studentResponses?.find(r =>
    r.studentId === studentPair.student2 || r.displayStudentId === studentPair.student2.split(' (')[0]
  );

  if (!student1Response || !student2Response) {
    console.warn(`Could not find student responses for: ${studentPair.student1}, ${studentPair.student2}`);
    return null;
  }


  const variant1Data = variantAnalysisResults.find(v => {
    const hasVariantStudents = v.metadata.studentResponses?.some(r => r.variantCode === variant1Code);
    return hasVariantStudents;
  });
  const variant2Data = variantAnalysisResults.find(v => {
    const hasVariantStudents = v.metadata.studentResponses?.some(r => r.variantCode === variant2Code);
    return hasVariantStudents;
  });

  if (!variant1Data || !variant2Data) {
    console.warn(`Could not find variant data for: ${variant1Code}, ${variant2Code}`);
    console.log(`Variant1Data found: ${!!variant1Data}`);
    console.log(`Variant2Data found: ${!!variant2Data}`);
    return null;
  }


  // Calculate original grades
  const student1OriginalGrade = (student1Response.totalScore / student1Response.maxPossibleScore) * 100;
  const student2OriginalGrade = (student2Response.totalScore / student2Response.maxPossibleScore) * 100;

  // Grade student1 using student2's variant (variant2)
  const student1CrossGrade = gradeStudentOnVariant(student1Response, variant2Data);

  // Grade student2 using student1's variant (variant1)
  const student2CrossGrade = gradeStudentOnVariant(student2Response, variant1Data);

  // Calculate grade changes
  const student1GradeChange = student1CrossGrade - student1OriginalGrade;
  const student2GradeChange = student2CrossGrade - student2OriginalGrade;



  return {
    student1GradeChange,
    student2GradeChange,
    student1OriginalGrade,
    student2OriginalGrade,
    student1CrossGrade,
    student2CrossGrade
  };
}




/**
 * Grades a student's responses using a different variant's answer key
 * @param studentResponse - The student's response data
 * @param targetVariantData - The variant data to grade against
 * @returns The percentage grade when graded on the target variant
 */
function gradeStudentOnVariant(
  studentResponse: { questionResponses?: Array<{ questionId: string; studentAnswer: string }> },
  targetVariantData: BiPointAnalysisResult
): number {
  let correctAnswers = 0;
  let totalQuestions = 0;


  // For each question in the student's response, check if it matches the target variant's answer
  for (const questionResponse of studentResponse.questionResponses || []) {
    totalQuestions++;

    // Find the corresponding question in the target variant's question results
    const targetQuestionResult = targetVariantData.questionResults?.find(q =>
      q.questionId === questionResponse.questionId
    );

    if (targetQuestionResult) {
      // Find the correct answer from the distractor analysis
      const correctOption = targetQuestionResult.distractorAnalysis.correctOption;

      // Convert student's letter answer to the actual answer text
      let studentAnswerText = questionResponse.studentAnswer;

      // If student answer is a letter (A, B, C, D), convert it to the actual answer text
      if (studentAnswerText && studentAnswerText.length === 1 && /^[A-D]$/.test(studentAnswerText)) {
        const optionIndex = studentAnswerText.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3

        // Get all options from the distractor analysis
        const allOptions = [
          targetQuestionResult.distractorAnalysis.correctOption,
          ...targetQuestionResult.distractorAnalysis.distractors
        ].filter(opt => opt !== null && opt !== undefined);

        // If we have options, use the letter index to get the actual answer text
        if (allOptions.length > optionIndex) {
          studentAnswerText = allOptions[optionIndex].option;
        }
      }

      // If both student answer and correct option are letters, compare them directly
      if (questionResponse.studentAnswer && questionResponse.studentAnswer.length === 1 &&
        correctOption?.option && correctOption.option.length === 1 &&
        /^[A-D]$/.test(questionResponse.studentAnswer) && /^[A-D]$/.test(correctOption.option)) {
        studentAnswerText = questionResponse.studentAnswer; // Use original letter answer
      }



      if (studentAnswerText === correctOption?.option) {
        correctAnswers++;
      }
    } else {
      console.log(`Question ${questionResponse.questionId}: NOT FOUND in target variant`);
    }
  }

  const CrossGrade = (correctAnswers / totalQuestions) * 100;

  return CrossGrade;
}


/**
 * Filters out duplicate pairs (A-B and B-A are the same) and A-A pairs
 */
const filterDuplicatePairs = (studentMatrix: Record<string, Record<string, number>>): StudentResponsePiar[] => {
  const seenPairs = new Set<string>();
  const filtered: StudentResponsePiar[] = [];

  for (const [student1, comparisons] of Object.entries(studentMatrix)) {
    for (const [student2, similarity] of Object.entries(comparisons)) {
      // Skip self-comparisons (A-A pairs)
      if (student1 === student2) {
        continue;
      }

      // Create a consistent pair key (sorted to avoid duplicates like A-B vs B-A)
      const pairKey = [student1, student2].sort().join('|');

      if (!seenPairs.has(pairKey)) {
        seenPairs.add(pairKey);

        // Extract variant code from student ID if available
        const variantMatch = student1.match(/\(([^)]+)\)/);
        const variantCode = variantMatch ? variantMatch[1] : 'Unknown';

        filtered.push({
          student1,
          student2,
          similarity,
          variantCode
        });
      }
    }
  }

  return filtered;
};





/**
 * Gets variant similarity between two students
 */
function getVariantSimilarity(
  student1: string,
  student2: string,
  variantMatrix: Record<string, Record<string, number>>
): number {
  // Try to get from matrix using student IDs directly
  let similarity = variantMatrix[student1]?.[student2];

  if (similarity !== undefined) {
    return similarity;
  }

  // Fallback: try reverse order
  similarity = variantMatrix[student2]?.[student1];

  if (similarity !== undefined) {
    return similarity;
  }

  // If still not found, extract variant codes and try that approach
  const variant1Match = student1.match(/\(([^)]+)\)/);
  const variant2Match = student2.match(/\(([^)]+)\)/);
  const variant1 = variant1Match ? variant1Match[1] : 'Unknown';
  const variant2 = variant2Match ? variant2Match[1] : 'Unknown';

  // Try to get from matrix using variant codes
  similarity = variantMatrix[variant1]?.[variant2];

  if (similarity !== undefined) {
    return similarity;
  }
  else {
    return 2.0;
  }

}





/**
 * Gets student biserial average from variant analysis results
 */
function getStudentBiserial(
  studentId: string,
  variantBiserials: BiPointAnalysisResult[]
): number {
  // Extract variant code from student ID
  const variantMatch = studentId.match(/\(([^)]+)\)/);
  const variantCode = variantMatch ? variantMatch[1] : 'Unknown';

  // Find matching variant analysis
  const variantAnalysis = variantBiserials.find(v => {
    // Check if this analysis result contains students from the target variant
    const hasVariantStudents = v.metadata.studentResponses?.some(r => r.variantCode === variantCode);

    return hasVariantStudents;
  });

  if (variantAnalysis) {
    // Use the pre-calculated average biserial from the summary
    const averageBiserial = variantAnalysis.summary.averagePointBiserial;
    return averageBiserial;
  }
  return 2.0; // Default biserial value
}




/**
 * Finds student data from analysis result
 */
function findStudentData(studentId: string, analysisResult: BiPointAnalysisResult) {

  // Extract student name and variant code from student ID
  const studentMatch = studentId.match(/^(.+?)\s*\((.+?)\)$/);
  const studentName = studentMatch ? studentMatch[1].trim() : studentId;
  const variantCode = studentMatch ? studentMatch[2].trim() : 'Unknown';

  // First try to find exact match by displayStudentId (this should be the main approach)
  let response = analysisResult.metadata.studentResponses?.find(r => r.displayStudentId === studentName);

  if (response) {
    return {
      percentage: (response.totalScore / response.maxPossibleScore) * 100,
      variantCode: response.variantCode || 'Unknown',
      totalScore: response.totalScore,
      maxPossibleScore: response.maxPossibleScore,
    };
  }

  // Try to find by student ID (in case it's already in the correct format)
  response = analysisResult.metadata.studentResponses?.find(r => r.studentId === studentId);

  if (response) {
    return {
      percentage: (response.totalScore / response.maxPossibleScore) * 100,
      variantCode: response.variantCode || 'Unknown',
      totalScore: response.totalScore,
      maxPossibleScore: response.maxPossibleScore,
    };
  }

  // Try to find by variant code and displayStudentId pattern as fallback
  const variantStudents = analysisResult.metadata.studentResponses?.filter(r =>
    r.variantCode === variantCode
  ) || [];

  // Look for students that might match the pattern using displayStudentId
  for (const student of variantStudents) {
    // Try different matching strategies with displayStudentId
    const cleanDisplayId = student.displayStudentId?.replace(/\([^)]*\)/g, '').trim() || '';
    const cleanStudentName = studentName.replace(/\([^)]*\)/g, '').trim();

    if (cleanDisplayId === cleanStudentName ||
      student.displayStudentId?.includes(cleanStudentName) ||
      cleanDisplayId.includes(cleanStudentName)) {
      return {
        percentage: (student.totalScore / student.maxPossibleScore) * 100,
        variantCode: student.variantCode || variantCode,
        totalScore: student.totalScore,
        maxPossibleScore: student.maxPossibleScore,
      };
    }
  }

  // Try a more flexible search - look for any student that contains the student name in displayStudentId
  const flexibleMatch = analysisResult.metadata.studentResponses?.find(r => {
    const matches = r.displayStudentId?.includes(studentName) || studentName.includes(r.displayStudentId || '');
    return matches;
  });

  if (flexibleMatch) {
    return {
      percentage: (flexibleMatch.totalScore / flexibleMatch.maxPossibleScore) * 100,
      variantCode: flexibleMatch.variantCode || variantCode,
      totalScore: flexibleMatch.totalScore,
      maxPossibleScore: flexibleMatch.maxPossibleScore,
    };
  }

  // As a last resort, return default data
  return {
    percentage: 500, // Default to 50% instead of 0
    variantCode: variantCode,
    totalScore: 50,
    maxPossibleScore: 100,
  };
}





/**
 * Helper function to calculate class average score
 */
function calculateClassAverageScore(analysisResult: BiPointAnalysisResult): number {
  if (!analysisResult.metadata.studentResponses || analysisResult.metadata.studentResponses.length === 0) {
    return 70; // Default class average
  }

  const totalScore = analysisResult.metadata.studentResponses.reduce((sum, response) => {
    return sum + (response.totalScore / response.maxPossibleScore) * 100;
  }, 0);

  return totalScore / analysisResult.metadata.studentResponses.length;
}





/**
 * Gets summary statistics for flagged submissions
 */
export function getFlaggingSummary(flaggedSubmissions: FlaggedSubmission[]) {
  const uniqueStudents = new Set([
    ...flaggedSubmissions.map(f => f.student1),
    ...flaggedSubmissions.map(f => f.student2)
  ]);

  return {
    totalFlagged: flaggedSubmissions.length,
    uniqueStudentsInvolved: uniqueStudents.size,
    averageProbability: flaggedSubmissions.length > 0
      ? flaggedSubmissions.reduce((sum, f) => sum + f.probability, 0) / flaggedSubmissions.length
      : 0,
    averageSimilarity: flaggedSubmissions.length > 0
      ? flaggedSubmissions.reduce((sum, f) => sum + (f.responseSimilarity || 0), 0) / flaggedSubmissions.length
      : 0
  };
}