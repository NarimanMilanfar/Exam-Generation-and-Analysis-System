import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";
import { logActivity } from "../../../../../lib/activityLogger";

// GET /api/courses/[id]/collaborators - Get all collaborators for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(params.id, 'view');

    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const collaborators = await prisma.courseCollaborator.findMany({
      where: {
        courseId: params.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const transformedCollaborators = collaborators.map((collaborator) => ({
      id: collaborator.id,
      userId: collaborator.userId,
      courseId: collaborator.courseId,
      role: collaborator.role,
      createdAt: collaborator.createdAt.toISOString(),
      user: {
        id: collaborator.user.id,
        name: collaborator.user.name,
        email: collaborator.user.email,
      },
    }));

    return NextResponse.json(transformedCollaborators);
  } catch (error) {
    console.error("Error fetching collaborators:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/courses/[id]/collaborators - Add a new collaborator
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(params.id, 'share');

    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!['VIEWER', 'EDITOR'].includes(role)) {
      return NextResponse.json(
        { error: "Role must be VIEWER or EDITOR" },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found with this email" },
        { status: 404 }
      );
    }

    // Check if user is already a collaborator
    const existingCollaborator = await prisma.courseCollaborator.findUnique({
      where: {
        courseId_userId: {
          courseId: params.id,
          userId: user.id,
        },
      },
    });

    if (existingCollaborator) {
      return NextResponse.json(
        { error: "User is already a collaborator" },
        { status: 409 }
      );
    }

    // Check if user is the owner
    const course = await prisma.course.findUnique({
      where: { id: params.id },
    });

    if (course?.userId === user.id) {
      return NextResponse.json(
        { error: "Cannot add course owner as collaborator" },
        { status: 400 }
      );
    }

    // Create the collaboration
    const collaborator = await prisma.courseCollaborator.create({
      data: {
        courseId: params.id,
        userId: user.id,
        role: role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Log the activity
    await logActivity(
      userId!, // User who is adding the collaborator
      params.id,
      'ADDED_COLLABORATOR',
      'collaborator',
      collaborator.id,
      {
        name: user.name,
        email: user.email,
        role: role,
      }
    );

    const transformedCollaborator = {
      id: collaborator.id,
      userId: collaborator.userId,
      courseId: collaborator.courseId,
      role: collaborator.role,
      createdAt: collaborator.createdAt.toISOString(),
      user: {
        id: collaborator.user.id,
        name: collaborator.user.name,
        email: collaborator.user.email,
      },
    };

    return NextResponse.json(transformedCollaborator, { status: 201 });
  } catch (error) {
    console.error("Error adding collaborator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 