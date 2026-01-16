import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";
import { validateCourseAccess } from "../../../../../../lib/coursePermissions";
import { logActivity } from "../../../../../../lib/activityLogger";

// PUT /api/courses/[id]/collaborators/[collaboratorId] - Update collaborator role
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; collaboratorId: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(params.id, 'share');

    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const { role } = await request.json();

    if (!role || !['VIEWER', 'EDITOR'].includes(role)) {
      return NextResponse.json(
        { error: "Role must be VIEWER or EDITOR" },
        { status: 400 }
      );
    }

    // Check if collaborator exists
    const existingCollaborator = await prisma.courseCollaborator.findFirst({
      where: {
        id: params.collaboratorId,
        courseId: params.id,
      },
    });

    if (!existingCollaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    // Update the collaborator
    const updatedCollaborator = await prisma.courseCollaborator.update({
      where: {
        id: params.collaboratorId,
      },
      data: {
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
      userId!,
      params.id,
      'UPDATED_COLLABORATOR',
      'collaborator',
      params.collaboratorId,
      {
        name: updatedCollaborator.user.name,
        email: updatedCollaborator.user.email,
        newRole: role,
        oldRole: existingCollaborator.role,
      }
    );

    const transformedCollaborator = {
      id: updatedCollaborator.id,
      userId: updatedCollaborator.userId,
      courseId: updatedCollaborator.courseId,
      role: updatedCollaborator.role,
      createdAt: updatedCollaborator.createdAt.toISOString(),
      user: {
        id: updatedCollaborator.user.id,
        name: updatedCollaborator.user.name,
        email: updatedCollaborator.user.email,
      },
    };

    return NextResponse.json(transformedCollaborator);
  } catch (error) {
    console.error("Error updating collaborator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/courses/[id]/collaborators/[collaboratorId] - Remove collaborator
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; collaboratorId: string } }
) {
  try {
    const { hasAccess, userId, error } = await validateCourseAccess(params.id, 'share');

    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Check if collaborator exists
    const existingCollaborator = await prisma.courseCollaborator.findFirst({
      where: {
        id: params.collaboratorId,
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
    });

    if (!existingCollaborator) {
      return NextResponse.json(
        { error: "Collaborator not found" },
        { status: 404 }
      );
    }

    // Remove the collaborator
    await prisma.courseCollaborator.delete({
      where: {
        id: params.collaboratorId,
      },
    });

    // Log the activity
    await logActivity(
      userId!,
      params.id,
      'REMOVED_COLLABORATOR',
      'collaborator',
      params.collaboratorId,
      {
        name: existingCollaborator.user.name,
        email: existingCollaborator.user.email,
        role: existingCollaborator.role,
      }
    );

    return NextResponse.json({ message: "Collaborator removed successfully" });
  } catch (error) {
    console.error("Error removing collaborator:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 