import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ExamResult, StudentAnswer } from "@prisma/client";

//  interface definition
interface StudentScore {
  totalScore: number;
  percentage: number;
  details: {
    questionId: string;
    answer: string;
    isCorrect: boolean;
    points: number;
  }[];
  variantCode: string;
}

interface RequestBody {
  examId: string;
  termId: string;
  courseId: string;
  studentScores: Record<string, StudentScore>;
  totalPoints: number;
}

type ExamResultWithAnswers = ExamResult & {
  studentAnswers: StudentAnswer[];
};

export async function POST(request: Request) {
  try {
    const { examId, termId, courseId, studentScores, totalPoints } = await request.json() as RequestBody;

    // Verify the total score of the examination
    if (typeof totalPoints !== 'number' || totalPoints <= 0) {
      throw new Error("invalid total score of the exam");
    }

    // transaction processing
    const results = await prisma.$transaction(async (prisma) => {
      const savedResults: ExamResultWithAnswers[] = [];
      
      for (const [studentId, score] of Object.entries(studentScores)) {
        // Verify the existence of variantCode
        if (!score.variantCode) {
          throw new Error(`student${studentId}'s variantCode missing`);
        }

        // create ExamResult
        const examResult = await prisma.examResult.create({
          data: {
            studentId,
            examId,
            termId,
            score: score.totalScore,
            totalPoints,
            percentage: score.percentage,
            variantCode: score.variantCode,
            studentAnswers: {
              create: score.details.map(detail => ({
                questionId: detail.questionId,
                studentAnswer: detail.answer,
                isCorrect: detail.isCorrect,
                points: detail.points
              }))
            }
          },
          include: {
            studentAnswers: true
          }
        });
        
        savedResults.push(examResult);
      }
      
      return savedResults;
    });

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      savedResults: results.map(r => ({
        id: r.id,
        studentId: r.studentId,
        score: r.score,
        totalPoints: r.totalPoints,
        variantCode: r.variantCode
      }))
    });
    
  } catch (error) {
    console.error("fail to save:", error);
    return NextResponse.json(
      { 
        error: "server error", 
        details: error instanceof Error ? error.message : "unknown error",
        stack: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}