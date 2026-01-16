import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { validateCourseAccess } from "../../../lib/coursePermissions";

// GET /api/exam-generations - Get all exam generations for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    let whereClause: any = {};

    if (courseId) {
      // Check if user has access to the specific course
      const { hasAccess } = await validateCourseAccess(courseId);
      if (!hasAccess) {
        return NextResponse.json(
          { error: "Access denied to course" },
          { status: 403 }
        );
      }
      whereClause.exam = { courseId: courseId };
    } else {
      // Get all courses the user has access to
      const [ownedCourses, collaboratedCourses] = await Promise.all([
        prisma.course.findMany({
          where: { userId: session.user.id },
          select: { id: true },
        }),
        prisma.course.findMany({
          where: {
            collaborators: {
              some: { userId: session.user.id },
            },
          },
          select: { id: true },
        }),
      ]);

      const accessibleCourseIds = [
        ...ownedCourses.map((c) => c.id),
        ...collaboratedCourses.map((c) => c.id),
      ];

      if (accessibleCourseIds.length === 0) {
        return NextResponse.json([]);
      }

      whereClause.exam = {
        courseId: {
          in: accessibleCourseIds,
        },
      };
    }

    const generations = await prisma.examGeneration.findMany({
      where: whereClause,
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            courseId: true,
            course: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        variants: {
          select: {
            variantCode: true,
          },
        },
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    // Transform the data to match frontend interface
    const transformedGenerations = await Promise.all(
      generations.map(async (generation) => {
        // ROBUST FIX: Get results only for current variants (ignore deleted variants)
        const currentVariantCodes = generation.variants.map((v) => v.variantCode);

        const examResults = await prisma.examResult.findMany({
          where: {
            examId: generation.exam.id,
            variantCode: {
              in: currentVariantCodes,
            },
          },
          select: {
            percentage: true,
            id: true,
          },
        });

        const hasResults = examResults.length > 0;
        const studentsCount = examResults.length;
        let averageScore = 0;
        let completionRate = 0;
        if (hasResults) {
          const validResults = examResults.filter(
            (result) => result.percentage !== null
          );
          if (validResults.length > 0) {
            averageScore =
              validResults.reduce(
                (sum, result) => sum + (result.percentage || 0),
                0
              ) / validResults.length;
            // Calculate percent of students who passed (>= 50%)
            const passedCount = validResults.filter(
              (result) => (result.percentage || 0) >= 50
            ).length;
            completionRate = (passedCount / validResults.length) * 100;
          }
        }
        return {
          id: generation.id,
          examId: generation.examId,
          examTitle: generation.exam.title,
          courseId: generation.exam.courseId,
          courseName: generation.exam.course.name,
          numberOfVariants: generation.numberOfVariants,
          status: generation.status,
          generatedAt: generation.generatedAt.toISOString(),
          completedAt: generation.completedAt?.toISOString() || null,
          hasResults,
          studentsCount,
          averageScore: hasResults
            ? Number(averageScore.toFixed(1))
            : undefined,
          completionRate: hasResults
            ? Number(completionRate.toFixed(1))
            : undefined,
          config: {
            numberOfVariants: generation.numberOfVariants,
            randomizeQuestionOrder: generation.randomizeQuestionOrder,
            randomizeOptionOrder: generation.randomizeOptionOrder,
            randomizeTrueFalse: generation.randomizeTrueFalse,
          },
        };
      })
    );

    return NextResponse.json(transformedGenerations);
  } catch (error) {
    console.error("Error fetching exam generations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
