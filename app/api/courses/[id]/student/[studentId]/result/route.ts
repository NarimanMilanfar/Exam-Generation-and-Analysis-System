import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// app/api/courses/[courseId]/students/[studentId]/results/route.ts
export async function GET(
  request: Request,
  { params }: { params: { courseId: string; studentId: string } }
) {
  const { searchParams } = new URL(request.url);
  const termId = searchParams.get('termId');
  
  if (!termId) {
    return NextResponse.json(
      { error: 'termId is required' },
      { status: 400 }
    );
  }

  try {
    const results = await prisma.examResult.findMany({
      where: {
        studentId: params.studentId,
        exam: {
          courseId: params.courseId,
        },
        termId: termId,
      },
      include: {
        exam: {
          select: {
            title: true,
            description: true,
            totalPoints: true,
          },
        },
        studentAnswers: {
          include: {
            question: {
              select: {
                topic: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const resultsWithStats = results.map(result => {
      const correctAnswers = result.studentAnswers.filter(a => a.isCorrect);
      const wrongAnswers = result.studentAnswers.filter(a => !a.isCorrect);
      
      const topicStats = result.studentAnswers.reduce((acc, answer) => {
        const topic = answer.question.topic || 'Unknown';
        if (!acc[topic]) {
          acc[topic] = { correct: 0, wrong: 0 };
        }
        if (answer.isCorrect) {
          acc[topic].correct++;
        } else {
          acc[topic].wrong++;
        }
        return acc;
      }, {} as Record<string, { correct: number; wrong: number }>);

      return {
        ...result,
        stats: {
          totalQuestions: result.studentAnswers.length,
          correctCount: correctAnswers.length,
          wrongCount: wrongAnswers.length,
          topicStats
        }
      };
    });

    return NextResponse.json(resultsWithStats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch exam results' },
      { status: 500 }
    );
  }
}