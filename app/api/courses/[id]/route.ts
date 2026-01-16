import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import { isValidCourseCode } from "../../../lib/stringFormatting";
import { validateCourseAccess } from "../../../../lib/coursePermissions";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(params.id);

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: error === "Unauthorized" ? 401 : 403 }
      );
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            exams: true,
            questions: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Transform the data to match the frontend interface
    const transformedCourse = {
      id: course.id,
      name: course.name,
      description: course.description || "",
      color: course.color,
      examCount: course._count ? course._count.exams : 0,
      questionCount: course._count ? course._count.questions : 0,
      createdAt: course.createdAt.toISOString(),
      isOwner: course.userId === userId, // Add owner check
    };

    return NextResponse.json(transformedCourse);
  } catch (error) {
    console.error("Error fetching course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update course
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(
      params.id,
      "edit"
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: error === "Unauthorized" ? 401 : 403 }
      );
    }

    const { name, description, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    // Validate course code format
    if (!isValidCourseCode(name.trim())) {
      return NextResponse.json(
        {
          error:
            "Invalid course code format. Must be 3-4 letters, space, and 3 digits (e.g., CSC 101, COSC 499)",
        },
        { status: 400 }
      );
    }

    // Update the course
    const updatedCourse = await prisma.course.update({
      where: {
        id: params.id,
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#10b981",
      },
      include: {
        _count: {
          select: {
            exams: true,
            questions: true,
          },
        },
      },
    });

    // Transform the data to match the frontend interface
    const transformedCourse = {
      id: updatedCourse.id,
      name: updatedCourse.name,
      description: updatedCourse.description || "",
      color: updatedCourse.color,
      examCount: updatedCourse._count ? updatedCourse._count.exams : 0,
      questionCount: updatedCourse._count ? updatedCourse._count.questions : 0,
      createdAt: updatedCourse.createdAt.toISOString(),
      isOwner: updatedCourse.userId === userId, // Add owner check
    };

    return NextResponse.json(transformedCourse);
  } catch (error) {
    console.error("Error updating course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete course
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(
      params.id,
      "share"
    );

    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: error === "Unauthorized" ? 401 : 403 }
      );
    }

    // Only course owners can delete courses
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            exams: true,
            questions: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Delete the course (this will cascade delete exams and questions)
    await prisma.course.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({
      message: "Course deleted successfully",
      deletedItems: {
        exams: course._count.exams,
        questions: course._count.questions,
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