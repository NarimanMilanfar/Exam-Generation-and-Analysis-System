import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const termId = searchParams.get("termId");

    const where = termId ? { termId } : {};

    const [
      totalCourses,
      coursesWithExams,
      coursesWithEnrollments,
      averageEnrollments,
      recentActivity,
      instructorStats,
      termBreakdown,
    ] = await Promise.all([
      // Total courses
      prisma.course.count({ where }),
      
      // Courses with exams
      prisma.course.count({
        where: {
          ...where,
          exams: { some: {} },
        },
      }),

      // Courses with enrollments
      prisma.course.count({
        where: {
          ...where,
          enrollments: { some: {} },
        },
      }),

      // Average enrollments per course - count total enrollments
      prisma.courseEnrollment.aggregate({
        where: termId ? { termId } : {},
        _count: { id: true },
      }),

      // Recent course activity (last 7 days)
      prisma.course.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Instructor statistics
      prisma.course.groupBy({
        by: ["userId"],
        where,
        _count: { id: true },
      }),

      // Term breakdown
      prisma.course.groupBy({
        by: ["termId"],
        where: {},
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    // Get instructor details for the stats
    let instructorStatsWithDetails: Array<{
      instructor: { id: string; name: string | null; email: string };
      courseCount: number;
    }> = [];
    if (instructorStats.length > 0) {
      const instructorIds = instructorStats.map((stat) => stat.userId);
      const instructors = await prisma.user.findMany({
        where: { id: { in: instructorIds } },
        select: { id: true, name: true, email: true },
      });

      instructorStatsWithDetails = instructorStats.map((stat) => {
        const instructor = instructors.find((i) => i.id === stat.userId);
        return {
          instructor: instructor || { id: stat.userId, name: "Unknown User", email: "" },
          courseCount: stat._count.id,
        };
      }).sort((a, b) => b.courseCount - a.courseCount);
    }

    // Get term details for breakdown
    let termBreakdownWithDetails: Array<{
      term: { id: string | null; term: string; year: number };
      courseCount: number;
    }> = [];
    if (termBreakdown.length > 0) {
      const termIds = termBreakdown
        .map((term) => term.termId)
        .filter((id): id is string => id !== null);
      
      let terms: Array<{ id: string; term: string; year: number }> = [];
      if (termIds.length > 0) {
        terms = await prisma.term.findMany({
          where: { id: { in: termIds } },
          select: { id: true, term: true, year: true },
        });
      }

      termBreakdownWithDetails = termBreakdown.map((termStat) => {
        const term = terms.find((t) => t.id === termStat.termId);
        return {
          term: term || { id: termStat.termId, term: "No Term", year: 0 },
          courseCount: termStat._count.id,
        };
      });
    }

    return NextResponse.json({
      overview: {
        totalCourses,
        coursesWithExams,
        coursesWithEnrollments,
        averageEnrollmentsPerCourse: Math.round(
          (averageEnrollments._count.id || 0) / Math.max(totalCourses, 1)
        ),
        recentActivity,
        activeCoursesPercentage: Math.round(
          (coursesWithExams / Math.max(totalCourses, 1)) * 100
        ),
      },
      instructorStats: instructorStatsWithDetails.slice(0, 10),
      termBreakdown: termBreakdownWithDetails,
    });
  } catch (error) {
    console.error("Error fetching course analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}