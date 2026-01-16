import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { PrismaClient } from "@prisma/client";
import { logAudit } from "../../../../../lib/auditLogger";

const prisma = new PrismaClient();

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = params.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Add status based on email verification
    const userWithStatus = {
      ...user,
      status: user.emailVerified ? 'active' : 'inactive',
    };

    return NextResponse.json(userWithStatus);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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

    const userId = params.id;
    const contentType = request.headers.get('content-type');
    
    let name, email, role, emailVerified, imageFile;
    
    if (contentType?.includes('application/json')) {
      // Handle JSON requests (backward compatibility)
      const body = await request.json();
      name = body.name;
      email = body.email;
      role = body.role;
      emailVerified = body.emailVerified;
    } else {
      // Handle FormData requests (for image uploads)
      const formData = await request.formData();
      name = formData.get('name') as string;
      email = formData.get('email') as string;
      role = formData.get('role') as string;
      emailVerified = formData.get('emailVerified') as string;
      imageFile = formData.get('image') as File | null;
    }

    const dataToUpdate: any = {};
    
    if (name) dataToUpdate.name = name;
    if (email) dataToUpdate.email = email;
    if (role) dataToUpdate.role = role;
    
    // Handle emailVerified status
    if (emailVerified !== undefined) {
      if (emailVerified === 'true' || emailVerified === true) {
        dataToUpdate.emailVerified = new Date();
      } else {
        dataToUpdate.emailVerified = null;
      }
    }

    // Handle image upload if provided
    if (imageFile) {
      // Verify file type and size
      if (!ALLOWED_FILE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: 'Only JPEG/PNG/WEBP images allowed' },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: 'Image size must be less than 2MB' },
          { status: 400 }
        );
      }

      try {
        // Convert image to base64 and store in database
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const base64Image = `data:${imageFile.type};base64,${buffer.toString('base64')}`;
        dataToUpdate.image = base64Image;
      } catch (error) {
        console.error('Image upload failed:', error);
        return NextResponse.json(
          { error: 'Failed to upload image' },
          { status: 500 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the admin user edit
    await logAudit(
      session.user.id,
      session.user.email,
      'USER_UPDATED',
      'user_account',
      userId,
      {
        targetUserEmail: updatedUser.email,
        targetUserName: updatedUser.name,
        fieldsUpdated: Object.keys(dataToUpdate),
        roleChanged: !!dataToUpdate.role,
        emailVerifiedChanged: dataToUpdate.emailVerified !== undefined,
        adminAction: true,
      },
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined,
      true
    );

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
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

    const userId = params.id;

    // Get user info before deletion for audit logging
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Use a transaction to ensure all related records are deleted properly
    await prisma.$transaction(async (tx) => {
      // Delete SetPasswordTokens first (they don't have cascade delete)
      await tx.setPasswordToken.deleteMany({
        where: { userId }
      });

      // Delete any PasswordResetTokens (these should have cascade delete, but let's be safe)
      await tx.passwordResetToken.deleteMany({
        where: { userId }
      });

      // Delete the user (other related records have cascade delete)
      await tx.user.delete({
        where: { id: userId }
      });
    });

    // Log the user deletion
    await logAudit(
      session.user.id,
      session.user.email,
      'USER_DELETED',
      'user_account',
      userId,
      {
        deletedUserEmail: userToDelete.email,
        deletedUserName: userToDelete.name,
        deletedUserRole: userToDelete.role,
        adminAction: true,
      },
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined,
      true
    );

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
