import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const termId = searchParams.get("termId") || "";
    const userId = searchParams.get("userId") || "";

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (termId) {
      where.termId = termId;
    }

    if (userId) {
      where.userId = userId;
    }

    const [courses, totalCount] = await Promise.all([
      prisma.course.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          term: {
            select: {
              id: true,
              term: true,
              year: true,
            },
          },
          collaborators: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              exams: true,
              questions: true,
              enrollments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.course.count({ where }),
    ]);

    const coursesWithStats = courses.map((course) => ({
      id: course.id,
      name: course.name,
      description: course.description,
      color: course.color,
      section: course.section,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      user: course.user,
      term: course.term,
      collaborators: course.collaborators,
      stats: {
        examCount: course._count.exams,
        questionCount: course._count.questions,
        enrollmentCount: course._count.enrollments,
      },
    }));

    return NextResponse.json({
      courses: coursesWithStats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, termId, section, userId } = await request.json();

    if (!name || !userId) {
      return NextResponse.json(
        { error: "Course name and instructor are required" },
        { status: 400 }
      );
    }

    // Validate instructor exists and is a teacher
    const instructor = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true },
    });

    if (!instructor || instructor.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Invalid instructor selected" },
        { status: 400 }
      );
    }

    const course = await prisma.course.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#10b981",
        termId: termId || null,
        section: section || null,
        userId: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        term: {
          select: {
            id: true,
            term: true,
            year: true,
          },
        },
        _count: {
          select: {
            exams: true,
            questions: true,
            enrollments: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: course.id,
      name: course.name,
      description: course.description,
      color: course.color,
      section: course.section,
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
      user: course.user,
      term: course.term,
      stats: {
        examCount: course._count.exams,
        questionCount: course._count.questions,
        enrollmentCount: course._count.enrollments,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}