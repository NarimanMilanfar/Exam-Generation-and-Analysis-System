// app/api/auth/set-password/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import bcrypt from "bcryptjs";
import { logAudit } from "../../../../../lib/auditLogger";

// Image validation constants
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token")?.toString();
    const name = formData.get("name")?.toString();
    const newPassword = formData.get("newPassword")?.toString();
    const avatarFile = formData.get("avatar") as File | null;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const record = await prisma.setPasswordToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 404 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    let avatarData: string | undefined;
    if (avatarFile) {
      // Validate file type and size
      if (!ALLOWED_FILE_TYPES.includes(avatarFile.type)) {
        return NextResponse.json(
          { error: "Only JPEG/PNG/WEBP images allowed" },
          { status: 400 }
        );
      }

      if (avatarFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Image size must be less than 2MB" },
          { status: 400 }
        );
      }

      try {
        // Convert image to base64 and store in database
        const buffer = Buffer.from(await avatarFile.arrayBuffer());
        avatarData = `data:${avatarFile.type};base64,${buffer.toString(
          "base64"
        )}`;
      } catch (error) {
        console.error("Avatar upload failed:", error);
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 }
        );
      }
    }

    await prisma.user.update({
      where: { id: record.userId },
      data: {
        name: name || undefined,
        password: hashedPassword,
        image: avatarData,
        emailVerified: new Date(),
      },
    });

    // Log the password reset completion
    await logAudit(
      record.userId,
      record.user.email,
      'PASSWORD_RESET_SUCCESS',
      'user_auth',
      record.userId,
      {
        profileCompleted: true,
        nameSet: !!name,
        avatarUploaded: !!avatarFile,
        accountActivated: true,
      },
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      req.headers.get('x-real-ip') || undefined,
      req.headers.get('user-agent') || undefined,
      true
    );

    await prisma.setPasswordToken.delete({
      where: { id: record.id },
    });

    return NextResponse.json({
      message: "Password and profile updated successfully",
      email: record.user.email,
    });
  } catch (error) {
    console.error("Set password update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
