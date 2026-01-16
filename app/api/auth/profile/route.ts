import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../../../lib/auth";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import { getToken } from "next-auth/jwt";
import { logAudit } from "../../../../lib/auditLogger";

const prisma = new PrismaClient();

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// store verification codes in memory (for simplicity, consider using a database or cache in production)
const verificationCodes = new Map<
  string,
  {
    code: string;
    email: string;
    expiresAt: number;
    userId: string;
  }
>();

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, email } = await req.json();

    if (action === "send-verification") {
      // create a verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationId = uuidv4();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15min from now

      // store the verification code in memory
      verificationCodes.set(verificationId, {
        code,
        email,
        expiresAt,
        userId: session.user.id,
      });

      // send the verification email
      await transporter.sendMail({
        from: `"U Exam" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Email Verification Code",
        html: `
          <div style="max-width: 480px; margin: auto; padding: 20px; font-family: Arial, sans-serif; background-color: #f9f9f9; border-radius: 8px; border: 1px solid #ddd;">
            <h2 style="text-align: center; color: #333;">U Exam Verification</h2>
            <p style="font-size: 15px; color: #444;">Hello,</p>
            <p style="font-size: 15px; color: #444;">Please use the following verification code to complete your email verification:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 22px; font-weight: bold; color: #2c3e50; background-color: #eaf4ff; padding: 12px 24px; border-radius: 6px; letter-spacing: 2px;">
                ${code}
              </span>
            </div>
            <p style="font-size: 14px; color: #666;">This code will expire in <strong>15 minutes</strong>.</p>
            <p style="font-size: 14px; color: #999;">If you did not request this code, you can safely ignore this email.</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 13px; text-align: center; color: #aaa;">Thank you for using U Exam</p>
          </div>
        `,
      });

      return NextResponse.json({
        success: true,
        verificationId,
        expiresAt,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const imageFile = formData.get("image") as File | null;
    const verificationId = formData.get("verificationId") as string | null;
    const verificationCode = formData.get("verificationCode") as string | null;

    const dataToUpdate: any = {};

    if (name) {
      dataToUpdate.name = name;
    }

    if (email) {
      if (!verificationId || !verificationCode) {
        console.log(verificationId, verificationCode);
        return NextResponse.json(
          { error: "Verification required for email change" },
          { status: 400 }
        );
      }

      const verification = verificationCodes.get(verificationId);
      if (
        !verification ||
        verification.code !== verificationCode ||
        verification.userId !== session.user.id
      ) {
        return NextResponse.json(
          { error: "Invalid verification code" },
          { status: 400 }
        );
      }

      if (verification.expiresAt < Date.now()) {
        return NextResponse.json(
          { error: "Verification code expired" },
          { status: 400 }
        );
      }

      if (verification.email !== email) {
        return NextResponse.json(
          { error: "Email does not match verification" },
          { status: 400 }
        );
      }

      // check if the email is already in use by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id: session.user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 409 }
        );
      }

      dataToUpdate.email = email;
      verificationCodes.delete(verificationId);
    }

    // update password if provided
    if (password && password.length >= 6) {
      dataToUpdate.password = await bcrypt.hash(password, 12);
    }

    // image upload handling - store as base64 in database
    if (imageFile) {
      // verify file type and size
      if (!ALLOWED_FILE_TYPES.includes(imageFile.type)) {
        return NextResponse.json(
          { error: "Only JPEG/PNG/WEBP images allowed" },
          { status: 400 }
        );
      }

      if (imageFile.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Image size must be less than 2MB" },
          { status: 400 }
        );
      }

      try {
        // Convert image to base64 and store in database
        const buffer = Buffer.from(await imageFile.arrayBuffer());
        const base64Image = `data:${imageFile.type};base64,${buffer.toString(
          "base64"
        )}`;

        dataToUpdate.image = base64Image;
      } catch (error) {
        console.error("Avatar upload failed:", error);
        return NextResponse.json(
          { error: "Failed to upload avatar" },
          { status: 500 }
        );
      }
    }

    // if no data to update, return early
    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "No data to update" }, { status: 400 });
    }

    // update user in database
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Log the profile update
    await logAudit(
      session.user.id,
      updated.email,
      'PROFILE_UPDATE',
      'user_profile',
      session.user.id,
      {
        fieldsUpdated: Object.keys(dataToUpdate),
        nameChanged: !!dataToUpdate.name,
        emailChanged: !!dataToUpdate.email,
        passwordChanged: !!dataToUpdate.password,
        imageChanged: !!dataToUpdate.image,
      },
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      req.headers.get('x-real-ip') || undefined,
      req.headers.get('user-agent') || undefined,
      true
    );

    // Return response with session refresh instruction
    return NextResponse.json({
      ...updated,
      sessionRefreshRequired: true, // Signal client to refresh session
    });
  } catch (error) {
    console.error("Update failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
