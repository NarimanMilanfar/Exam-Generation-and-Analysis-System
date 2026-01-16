import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { isValidCourseCode } from "../../lib/stringFormatting";
import { validateSection } from "../../lib/sectionUtils";
import { getUserAccessibleCourses } from "../../../lib/coursePermissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow teachers/professors to access courses
    if (session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all courses the user has access to (owned or collaborated)
    const courses = await getUserAccessibleCourses(session.user.id);

    return NextResponse.json(courses);
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

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow teachers/professors to create courses
    if (session.user.role === "ADMIN") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, color, termId, section } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
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

    // Validate section format if provided
    if (section && termId) {
      // Get the term name for validation
      const term = await prisma.term.findUnique({
        where: { id: termId },
        select: { term: true },
      });

      if (!term) {
        return NextResponse.json({ error: "Invalid term ID" }, { status: 400 });
      }

      const sectionValidation = validateSection(section, term.term);
      if (!sectionValidation.isValid) {
        return NextResponse.json(
          {
            error: sectionValidation.error,
            suggestions: sectionValidation.suggestions,
          },
          { status: 400 }
        );
      }
    }

    const course = await prisma.course.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        color: color || "#10b981",
        termId: termId || null,
        section: section || null,
        userId: session.user.id,
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

    // For new courses, there are no QuestionLists yet
    const transformedCourse = {
      id: course.id,
      name: course.name,
      description: course.description || "",
      color: course.color,
      examCount: 0, // New courses start with 0 exams
      questionCount: course._count.questions,
      createdAt: course.createdAt.toISOString(),
    };

    return NextResponse.json(transformedCourse, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
