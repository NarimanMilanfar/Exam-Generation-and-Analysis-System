import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

// Force dynamic rendering for this API route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    console.log("API: Fetching dashboard stats...");
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current date for today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch comprehensive statistics
    const [
      totalQuestions,
      totalExams,
      totalCourses,
      totalQuestionBanks,
      questionsToday,
      examsToday,
      coursesCreatedToday,
      examResults,
      questionsByType,
      examsByStatus,
      recentActivityArrays,
      topCoursesByQuestions,
    ] = await Promise.all([
      // Basic counts
      prisma.question.count(),
      prisma.exam.count(),
      prisma.course.count(),
      prisma.questionBank.count(),

      // Today's activity
      prisma.question.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.exam.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),
      prisma.course.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow,
          },
        },
      }),

      // Exam results for analytics
      prisma.examResult.findMany({
        include: {
          exam: {
            include: {
              course: true,
            },
          },
        },
      }),

      // Questions by type
      prisma.question.groupBy({
        by: ["type"],
        _count: {
          type: true,
        },
      }),

      // Exams by published status
      prisma.exam.groupBy({
        by: ["isPublished"],
        _count: {
          isPublished: true,
        },
      }),

      // Recent activity (last 7 days) - Multiple activity types
      Promise.all([
        // Recent questions
        prisma.question.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            course: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        }),
        // Recent courses
        prisma.course.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        }),
        // Recent exams
        prisma.exam.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            course: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        }),
        // Recent user verifications
        prisma.user.findMany({
          where: {
            emailVerified: {
              not: null,
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
          },
          orderBy: {
            emailVerified: "desc",
          },
          take: 3,
        }),
        // Recent question banks
        prisma.questionBank.findMany({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            course: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 3,
        }),
      ]),

      // Top courses by question count
      prisma.course.findMany({
        include: {
          _count: {
            select: {
              questions: true,
              exams: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          questions: {
            _count: "desc",
          },
        },
        take: 5,
      }),
    ]);

    // Process recent activity from multiple sources
    const [
      recentQuestions,
      recentCourses,
      recentExams,
      recentVerifications,
      recentQuestionBanks,
    ] = recentActivityArrays;

    // Create unified activity feed
    const recentActivity: any[] = [];

    // Add questions
    recentQuestions.forEach((question: any) => {
      recentActivity.push({
        id: question.id,
        type: "question",
        text:
          question.text.substring(0, 100) +
          (question.text.length > 100 ? "..." : ""),
        courseName: question.course?.name || "Unknown Course",
        createdAt: question.createdAt,
        points: question.points,
        activityType: "Question Created",
        icon: "📝",
      });
    });

    // Add courses
    recentCourses.forEach((course: any) => {
      recentActivity.push({
        id: course.id,
        type: "course",
        text: `New course: ${course.name}`,
        courseName: course.name,
        createdAt: course.createdAt,
        points: null,
        activityType: "Course Created",
        icon: "📚",
        instructor: course.user.name || course.user.email,
      });
    });

    // Add exams
    recentExams.forEach((exam: any) => {
      recentActivity.push({
        id: exam.id,
        type: "exam",
        text: `New exam: ${exam.title}`,
        courseName: exam.course?.name || "Unknown Course",
        createdAt: exam.createdAt,
        points: null,
        activityType: "Exam Created",
        icon: "📊",
      });
    });

    // Add user verifications
    recentVerifications.forEach((user: any) => {
      recentActivity.push({
        id: user.id,
        type: "verification",
        text: `User verified: ${user.name || user.email}`,
        courseName: "System",
        createdAt: user.emailVerified,
        points: null,
        activityType: "User Verified",
        icon: "✅",
      });
    });

    // Add question banks
    recentQuestionBanks.forEach((qbank: any) => {
      recentActivity.push({
        id: qbank.id,
        type: "questionbank",
        text: `New question bank: ${qbank.name}`,
        courseName: qbank.course?.name || "Unknown Course",
        createdAt: qbank.createdAt,
        points: null,
        activityType: "Question Bank Created",
        icon: "🗂️",
      });
    });

    // Sort by date and take top 10
    recentActivity.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const finalRecentActivity = recentActivity.slice(0, 10);

    // Calculate analytics - all exam results are considered completed since they come from CSV
    const completedExams = examResults.length;
    const totalExamAttempts = examResults.length;
    const completionRate =
      totalExamAttempts > 0 ? (completedExams / totalExamAttempts) * 100 : 0;

    const averageScore =
      examResults.length > 0
        ? examResults.reduce((sum, result) => sum + result.score, 0) /
          examResults.length
        : 0;

    // Find most popular subject (course with most questions)
    const popularCourse = topCoursesByQuestions[0];
    const popularSubject = popularCourse ? popularCourse.name : "No data yet";

    // Calculate average questions per exam
    const avgQuestionsPerExam =
      totalExams > 0 ? Math.round(totalQuestions / totalExams) : 0;

    // Question type distribution
    const questionTypeStats = questionsByType.reduce((acc, item) => {
      acc[item.type] = item._count.type;
      return acc;
    }, {} as Record<string, number>);

    // Exam status distribution
    const publishedExams =
      examsByStatus.find((item) => item.isPublished)?._count.isPublished || 0;
    const draftExams =
      examsByStatus.find((item) => !item.isPublished)?._count.isPublished || 0;

    const stats = {
      overview: {
        totalQuestions,
        totalExams,
        totalCourses,
        totalQuestionBanks,
        activeUsers: await prisma.user.count({
          where: { emailVerified: { not: null } },
        }),
        totalUsers: await prisma.user.count(),
      },
      todayActivity: {
        questionsToday,
        examsToday,
        coursesCreatedToday,
        examsTaken: await prisma.examResult.count({
          where: {
            createdAt: {
              gte: today,
              lt: tomorrow,
            },
          },
        }),
      },
      exams: {
        totalExams,
        totalQuestions,
        examsToday,
        avgQuestionsPerExam,
        publishedExams,
        draftExams,
        completionRate: Math.round(completionRate),
      },
      analytics: {
        examsAnalyzed: completedExams,
        completionRate: Math.round(completionRate),
        popularSubject,
        avgScore: Math.round(averageScore * 100) / 100,
        questionTypeDistribution: questionTypeStats,
        totalExamAttempts,
      },
      insights: {
        topCourses: topCoursesByQuestions.map((course) => ({
          id: course.id,
          name: course.name,
          questionCount: course._count.questions,
          examCount: course._count.exams,
          instructor: course.user.name || course.user.email,
          color: course.color,
        })),
        recentActivity: finalRecentActivity.map((activity) => ({
          id: activity.id,
          text: activity.text,
          type: activity.type,
          courseName: activity.courseName,
          createdAt: activity.createdAt.toISOString(),
          points: activity.points,
          activityType: activity.activityType,
          icon: activity.icon,
        })),
        systemHealth: {
          databaseConnected: true,
          avgResponseTime: null, // Remove simulated data
          uptime: null, // Remove simulated data
        },
      },
    };

    console.log("API: Returning comprehensive dashboard stats");
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
