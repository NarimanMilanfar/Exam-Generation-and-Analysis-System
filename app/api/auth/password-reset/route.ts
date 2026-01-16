import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addMinutes, subMinutes } from "date-fns";
import nodemailer from "nodemailer";
import { logAudit } from "../../../../lib/auditLogger";

const prisma = new PrismaClient();

async function sendResetEmail(email: string, resetLink: string) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"U Exam" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">🔐 Password Reset Request</h2>
        <p style="font-size: 16px; color: #555;">Hi there,</p>
        <p style="font-size: 16px; color: #555;">
          We received a request to reset your password for your <strong>U Exam</strong> account.
          Please click the button below to set a new password:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 14px; color: #888;">
          If the button above doesn't work, copy and paste the following link into your browser:
        </p>
        <p style="font-size: 14px; word-break: break-all; color: #4CAF50;">
          ${resetLink}
        </p>
        <hr style="margin: 32px 0;">
        <p style="font-size: 12px; color: #999;">
          This link will expire in 30 minutes. If you did not request a password reset, you can safely ignore this email.
        </p>
        <p style="font-size: 12px; color: #999;">
          — The U Exam Team
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "If this email exists in our system, you will receive a reset link.",
        },
        { status: 200 }
      );
    }

    // check if a reset token was sent in the last 2 minutes
    const twoMinutesAgo = subMinutes(new Date(), 2);
    const recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        createdAt: {
          gte: twoMinutesAgo,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (recentToken) {
      return NextResponse.json(
        {
          error:
            "A reset email was recently sent. Please wait 2 minutes before trying again.",
        },
        { status: 429 }
      );
    }

    // create a new password reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = addMinutes(new Date(), 30);

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const resetLink = `${process.env.NEXTAUTH_URL}/auth/password-reset/${token}`;
    await sendResetEmail(email, resetLink);

    // Log the password reset request
    await logAudit(
      user.id,
      user.email,
      'PASSWORD_RESET_REQUEST',
      'user_auth',
      user.id,
      {
        resetEmailSent: true,
        tokenExpiryMinutes: 30,
      },
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined,
      true
    );

    return NextResponse.json(
      { message: "The reset email has been sent. Please check it!", resetLink },
      { status: 200 }
    );
  } catch (error) {
    console.error("Password reset error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
