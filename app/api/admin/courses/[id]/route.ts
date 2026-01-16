import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
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
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                name: true,
                studentId: true,
              },
            },
          },
        },
        exams: {
          select: {
            id: true,
            title: true,
            isPublished: true,
            createdAt: true,
            _count: {
              select: {
                results: true,
              },
            },
          },
        },
        _count: {
          select: {
            exams: true,
            questions: true,
            enrollments: true,
            questionBanks: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

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
      collaborators: course.collaborators,
      enrollments: course.enrollments,
      exams: course.exams,
      stats: {
        examCount: course._count.exams,
        questionCount: course._count.questions,
        enrollmentCount: course._count.enrollments,
        questionBankCount: course._count.questionBanks,
      },
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, color, termId, section, userId } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    // If userId is provided, validate the instructor
    if (userId) {
      const instructor = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!instructor || instructor.role !== "TEACHER") {
        return NextResponse.json(
          { error: "Invalid instructor selected" },
          { status: 400 }
        );
      }
    }

    const updatedCourse = await prisma.course.update({
      where: { id: params.id },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#10b981",
        termId: termId || null,
        section: section || null,
        ...(userId && { userId }),
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
      id: updatedCourse.id,
      name: updatedCourse.name,
      description: updatedCourse.description,
      color: updatedCourse.color,
      section: updatedCourse.section,
      createdAt: updatedCourse.createdAt,
      updatedAt: updatedCourse.updatedAt,
      user: updatedCourse.user,
      term: updatedCourse.term,
      stats: {
        examCount: updatedCourse._count.exams,
        questionCount: updatedCourse._count.questions,
        enrollmentCount: updatedCourse._count.enrollments,
      },
    });
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get course details before deletion
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            exams: true,
            questions: true,
            enrollments: true,
            questionBanks: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Delete the course (cascading will handle related data)
    await prisma.course.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: "Course deleted successfully",
      deletedItems: {
        exams: course._count.exams,
        questions: course._count.questions,
        enrollments: course._count.enrollments,
        questionBanks: course._count.questionBanks,
      },
    });
  } catch (error) {
    console.error("Error deleting course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}