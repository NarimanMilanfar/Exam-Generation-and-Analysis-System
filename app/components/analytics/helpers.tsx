import { BiPointAnalysisResult } from "../../types/analysis";

/**
 * Helper function to get quality indicator for difficulty, discrimination, or point-biserial values
 */
export const getQualityIndicator = (
  value: number,
  type: "difficulty" | "discrimination" | "pointBiserial"
) => {
  if (type === "difficulty") {
    if (value > 0.8) return { label: "Very Easy", color: "bg-green-100 text-green-800" };
    if (value > 0.6) return { label: "Easy", color: "bg-blue-100 text-blue-800" };
    if (value > 0.4) return { label: "Moderate", color: "bg-yellow-100 text-yellow-800" };
    if (value > 0.2) return { label: "Hard", color: "bg-orange-100 text-orange-800" };
    return { label: "Very Hard", color: "bg-red-100 text-red-800" };
  } else if (type === "discrimination") {
    if (value > 0.4) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (value > 0.3) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (value > 0.2) return { label: "Fair", color: "bg-yellow-100 text-yellow-800" };
    if (value > 0.1) return { label: "Poor", color: "bg-orange-100 text-orange-800" };
    return { label: "Very Poor", color: "bg-red-100 text-red-800" };
  } else {
    if (value > 0.4) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (value > 0.3) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (value > 0.2) return { label: "Acceptable", color: "bg-yellow-100 text-yellow-800" };
    if (value > 0.1) return { label: "Poor", color: "bg-orange-100 text-orange-800" };
    return { label: "Very Poor", color: "bg-red-100 text-red-800" };
  }
};

/**
 * Helper function to extract variant code from BiPointAnalysisResult
 */
export const getVariantCode = (variant: BiPointAnalysisResult): string => {
  // Get variant code directly from student responses
  if (variant.metadata.studentResponses && variant.metadata.studentResponses.length > 0) {
    const variantCode = variant.metadata.studentResponses[0].variantCode;
    if (variantCode && variantCode !== 'default') {
      // Extract just the variant number from codes like "ngk9z133-V1" -> "V1"
      const match = variantCode.match(/-V(\d+)$/);
      if (match) {
        return `V${match[1]}`;
      }
      // If it's already in V1 format, return as is
      if (variantCode.match(/^V\d+$/)) {
        return variantCode;
      }
      return variantCode;
    }
  }
  // Fallback to index-based naming if no variant code found
  return `V${variant.metadata.totalVariants || 1}`;
};

/**
 * Helper function to extract variant name from variant code string in db
 */
export const getVariantName = (variantCode: String): string | String => {
  const cleanVariantCode = variantCode.includes('-') 
  ? variantCode.split('-')[1] 
  : variantCode;
  return cleanVariantCode;
}
/**
 * Helper function to get student count from variant
 */
export const getStudentCount = (variant: BiPointAnalysisResult): number => {
  return variant.metadata.totalStudents;
};

/**
 * Helper function to calculate average grade from variant
 */
export const getAverageGrade = (variant: BiPointAnalysisResult): number => {
  if (!variant.metadata.studentResponses || variant.metadata.studentResponses.length === 0) {
    return 0;
  }
  const totalScore = variant.metadata.studentResponses.reduce((sum, response) => sum + response.totalScore, 0);
  const totalMaxScore = variant.metadata.studentResponses.reduce((sum, response) => sum + response.maxPossibleScore, 0);
  return totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
};

/**
 * Helper function to calculate percentage of students who passed (50% threshold)
 */
export const getPercentagePassed = (variant: BiPointAnalysisResult): number => {
  if (!variant.metadata.studentResponses || variant.metadata.studentResponses.length === 0) {
    return 0;
  }
  const passedStudents = variant.metadata.studentResponses.filter(response => {
    const grade = (response.totalScore / response.maxPossibleScore) * 100;
    return grade >= 50; 
  });
  
  return (passedStudents.length / variant.metadata.studentResponses.length) * 100;
};

/**
 * Helper function to sort variants by variant code in ascending order
 */
export const sortVariantsByCode = (variants: BiPointAnalysisResult[]): BiPointAnalysisResult[] => {
  return [...variants].sort((a, b) => {
    const codeA = getVariantCode(a);
    const codeB = getVariantCode(b);
    
    // Extract numeric part from variant codes (e.g., "V1" -> 1, "V2" -> 2)
    const numA = parseInt(codeA.replace(/\D/g, ''));
    const numB = parseInt(codeB.replace(/\D/g, ''));
    
    return numA - numB;
  });
}; 