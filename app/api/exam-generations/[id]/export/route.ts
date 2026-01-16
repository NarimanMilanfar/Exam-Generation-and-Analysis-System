import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";
import { analyzeExam } from "../../../../lib/biPointAnalysis";
import { getDataForBiPointAnalysis } from "../../../../lib/examAnalysisAdapter";
import { BiPointAnalysisResult, StudentResponse } from "../../../../types/analysis";
import { filterStudentsByPercentile } from "../../../../lib/percentileFilter";
import type { StudentScore, PercentileRange } from "../../../../lib/percentileFilter";

interface ExportOptions {
  includeOverallAnalytics: boolean;
  includeQuestionAnalysis: boolean;
  includeStatisticalData: boolean;
  includeDifficultyDistribution: boolean;
}

/**
 * API endpoint to export exam analytics data to CSV
 * Supports two export types:
 * 1. global - Summary stats, metrics per exam
 * 2. student - Student mapping with ID, rank, score, variant, performance category
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const exportType = searchParams.get("type") || "global";

    // Extract filtering options for global exports
    const exportOptions = {
      includeOverallAnalytics: searchParams.get("includeOverallAnalytics") === "true",
      includeQuestionAnalysis: searchParams.get("includeQuestionAnalysis") === "true",
      includeStatisticalData: searchParams.get("includeStatisticalData") === "true",
      includeDifficultyDistribution: searchParams.get("includeDifficultyDistribution") === "true"
    };

    // Extract percentile filter parameters
    const percentileFrom = searchParams.get("percentileFrom");
    const percentileTo = searchParams.get("percentileTo");
    const percentileFilter: PercentileRange | null =
      (percentileFrom && percentileTo)
        ? {
          from: parseInt(percentileFrom),
          to: parseInt(percentileTo),
          label: `${percentileFrom}% - ${percentileTo}%`
        }
        : null;

    // Fetch exam generation to get exam ID
    const examGeneration = await prisma.examGeneration.findUnique({
      where: { id },
      include: {
        exam: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!examGeneration) {
      return NextResponse.json(
        { error: "Exam generation not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this exam's course
    const { hasAccess } = await validateCourseAccess(examGeneration.exam.course.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get analysis data directly (avoid internal fetch call that loses session)
    const examMetadata = {
      id: examGeneration.exam.id,
      title: examGeneration.exam.title,
      description: examGeneration.exam.description || "",
      createdAt: examGeneration.exam.createdAt,
      updatedAt: examGeneration.exam.updatedAt,
    };

    const { studentResponses, examVariants } = await getDataForBiPointAnalysis(
      examGeneration.examId,
      examMetadata
    );

    if (studentResponses.length === 0) {
      return NextResponse.json(
        {
          error: "No student results available for this exam generation. Please upload results first.",
        },
        { status: 400 }
      );
    }

    // Perform bi-point analysis directly
    const analysisResult = await analyzeExam(examVariants, studentResponses, {
      examTitle: examMetadata.title,
      minSampleSize: 1,
      includeDiscriminationIndex: true,
      includeDifficultyIndex: true,
      includePointBiserial: true,
      includeDistractorAnalysis: true,
      confidenceLevel: 0.95,

    });

    // Generate CSV based on export type
    let csvContent: string;
    let filename: string;

    if (exportType === "student") {
      csvContent = generateStudentMappingCSV(analysisResult, percentileFilter);
      filename = `student-mapping-${examGeneration.exam.title.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    } else {
      csvContent = generateGlobalExportCSV(analysisResult, exportOptions, percentileFilter);
      filename = `exam-analytics-${examGeneration.exam.title.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;
    }

    // Return CSV file with proper headers for download
    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        // Add cache control headers to prevent caching issues
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      },
    });
  } catch (error) {
    console.error("Error exporting analytics data:", error);
    return NextResponse.json(
      { error: `Failed to export analytics data: ${error}` },
      { status: 500 }
    );
  }
}

/**
 * Generate CSV for global export including summary stats and metrics per exam
 */
function generateGlobalExportCSV(analysisResult: BiPointAnalysisResult, options: ExportOptions, percentileFilter?: PercentileRange | null): string {
  const { summary, questionResults, metadata } = analysisResult;

  // Apply percentile filter if provided
  let studentCount = metadata.sampleSize;
  let filterNote = '';

  if (percentileFilter && metadata.studentResponses) {
    const studentData: StudentScore[] = metadata.studentResponses.map((response, index) => ({
      studentId: response.studentId,
      displayStudentId: response.displayStudentId,
      name: response.name,
      totalScore: response.totalScore,
      maxPossibleScore: response.maxPossibleScore,
      percentage: response.maxPossibleScore > 0 ? (response.totalScore / response.maxPossibleScore) * 100 : 0,
      variantCode: response.variantCode || 'Unknown',
      questionsCorrect: response.questionResponses.filter(qr => qr.isCorrect).length,
      totalQuestions: response.questionResponses.length,
      anonymizedId: `S${String(index + 1).padStart(3, '0')}`,
    }));

    const filteredStudents = filterStudentsByPercentile(studentData, percentileFilter);
    studentCount = filteredStudents.length;
    filterNote = ` (Filtered: ${percentileFilter.label || `${percentileFilter.from}% - ${percentileFilter.to}%`})`;
  }

  // Header section with exam metadata (always included)
  let csv = `"Exam Analytics Export: ${analysisResult.examTitle}${filterNote}"\n`;
  csv += `"Generated on","${new Date().toISOString()}"\n`;
  csv += `"Total Students","${studentCount}"\n`;
  csv += `"Total Questions","${questionResults.length}"\n`;
  if (percentileFilter) {
    csv += `"Percentile Filter","${percentileFilter.label || `${percentileFilter.from}% - ${percentileFilter.to}%`}"\n`;
  }
  csv += '\n';

  // Summary statistics section (includeOverallAnalytics)
  if (options.includeOverallAnalytics) {
    csv += `"Summary Statistics"\n`;
    csv += `"Average Difficulty","${(summary.averageDifficulty * 100).toFixed(2)}%"\n`;
    csv += `"Average Discrimination","${summary.averageDiscrimination.toFixed(3)}"\n`;
    csv += `"Average Point-Biserial","${summary.averagePointBiserial.toFixed(3)}"\n\n`;
  }

  // Question analysis section (includeQuestionAnalysis)
  if (options.includeQuestionAnalysis) {
    csv += `"Question Analysis"\n`;
    csv += `"Question #","Question Text","Type","Difficulty","Discrimination","Point-Biserial","Correct Responses","Total Responses","Significance"\n`;

    questionResults.forEach((question, index) => {
      csv += `"${index + 1}",`;
      csv += `"${question.questionText.replace(/"/g, '""')}",`;
      csv += `"${question.questionType}",`;
      csv += `"${(question.difficultyIndex * 100).toFixed(2)}%",`;
      csv += `"${question.discriminationIndex.toFixed(3)}",`;
      csv += `"${question.pointBiserialCorrelation.toFixed(3)}",`;
      csv += `"${question.correctResponses}",`;
      csv += `"${question.totalResponses}",`;
      csv += `"${question.statisticalSignificance.isSignificant ? 'Significant' : 'Not Significant'}"\n`;
    });
    csv += '\n';
  }

  // Statistical data section (includeStatisticalData) 
  if (options.includeStatisticalData) {
    csv += `"Statistical Analysis"\n`;
    csv += `"Cronbach's Alpha","${summary.reliabilityMetrics?.cronbachsAlpha?.toFixed(3) || 'N/A'}"\n`;
    csv += `"Standard Error","${summary.reliabilityMetrics?.standardError?.toFixed(3) || 'N/A'}"\n`;
    csv += `"Mean Score","${summary.scoreDistribution?.mean?.toFixed(2) || 'N/A'}"\n`;
    csv += `"Standard Deviation","${summary.scoreDistribution?.standardDeviation?.toFixed(2) || 'N/A'}"\n\n`;
  }

  // Difficulty distribution (includeDifficultyDistribution)
  if (options.includeDifficultyDistribution) {
    csv += `"Difficulty Distribution"\n`;
    csv += `"Very Easy (>80%)","${questionResults.filter(q => q.difficultyIndex > 0.8).length}"\n`;
    csv += `"Easy (60-80%)","${questionResults.filter(q => q.difficultyIndex > 0.6 && q.difficultyIndex <= 0.8).length}"\n`;
    csv += `"Medium (40-60%)","${questionResults.filter(q => q.difficultyIndex > 0.4 && q.difficultyIndex <= 0.6).length}"\n`;
    csv += `"Hard (20-40%)","${questionResults.filter(q => q.difficultyIndex > 0.2 && q.difficultyIndex <= 0.4).length}"\n`;
    csv += `"Very Hard (<20%)","${questionResults.filter(q => q.difficultyIndex <= 0.2).length}"\n`;
  }

  return csv;
}

/**
 * Generate CSV for student mapping export
 */
function generateStudentMappingCSV(analysisResult: BiPointAnalysisResult, percentileFilter?: PercentileRange | null): string {
  const { metadata } = analysisResult;
  const studentResponses = metadata.studentResponses || [];

  if (studentResponses.length === 0) {
    return "No student data available";
  }

  // Calculate performance categories
  const getPerformanceCategory = (percentage: number) => {
    switch (true) {
      case percentage >= 90: return "A+";
      case percentage >= 85: return "A";
      case percentage >= 80: return "A-";
      case percentage >= 76: return "B+";
      case percentage >= 72: return "B";
      case percentage >= 68: return "B-";
      case percentage >= 64: return "C+";
      case percentage >= 60: return "C";
      case percentage >= 50: return "C-";
      default: return "F";
    }
  };

  // Convert to StudentScore format for filtering
  const studentScores: StudentScore[] = studentResponses.map((response, index) => ({
    studentId: response.studentId,
    displayStudentId: response.displayStudentId,
    name: response.name,
    totalScore: response.totalScore,
    maxPossibleScore: response.maxPossibleScore,
    percentage: response.maxPossibleScore > 0 ? (response.totalScore / response.maxPossibleScore) * 100 : 0,
    variantCode: response.variantCode || 'Unknown',
    questionsCorrect: response.questionResponses.filter(qr => qr.isCorrect).length,
    totalQuestions: response.questionResponses.length,
    anonymizedId: `S${String(index + 1).padStart(3, '0')}`,
  }));

  // Apply percentile filter if provided
  let filteredStudents = studentScores;
  if (percentileFilter) {
    filteredStudents = filterStudentsByPercentile(studentScores, percentileFilter);
  }

  // Sort and rank the filtered students
  const sortedStudents = filteredStudents.sort((a, b) => b.percentage - a.percentage);
  const rankedStudentData = sortedStudents.map((student, index) => ({
    studentId: student.studentId,
    displayStudentId: student.displayStudentId || student.studentId,
    rank: index + 1,
    score: student.totalScore,
    maxScore: student.maxPossibleScore,
    percentage: student.percentage,
    variantCode: student.variantCode,
    performanceCategory: getPerformanceCategory(student.percentage)
  }));

  // Generate CSV header
  let csv = `"Student ID","Display ID","Rank","Score","Max Score","Percentage","Variant","Performance Category"\n`;

  // Add student rows
  rankedStudentData.forEach(student => {
    csv += `"${student.studentId}",`;
    csv += `"${student.displayStudentId}",`;
    csv += `"${student.rank}",`;
    csv += `"${student.score}",`;
    csv += `"${student.maxScore}",`;
    csv += `"${student.percentage.toFixed(2)}%",`;
    csv += `"${student.variantCode}",`;
    csv += `"${student.performanceCategory}"\n`;
  });

  return csv;
} 