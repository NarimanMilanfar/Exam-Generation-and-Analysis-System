// app/api/auth/set-password/route.ts

import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { addHours, subMinutes } from "date-fns";
import nodemailer from "nodemailer";

const prisma = new PrismaClient();

async function sendSetPasswordEmail(email: string, setLink: string) {
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
    subject: "Set Your Password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #333;">🛡️ Set Your Password</h2>
        <p style="font-size: 16px; color: #555;">Hi there,</p>
        <p style="font-size: 16px; color: #555;">
          Please click the button below to set your password for your <strong>U Exam</strong> account:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${setLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 16px;">
            Set Password
          </a>
        </div>
        <p style="font-size: 14px; color: #888;">
          Or copy and paste the following link into your browser:
        </p>
        <p style="font-size: 14px; word-break: break-all; color: #4CAF50;">
          ${setLink}
        </p>
        <hr style="margin: 32px 0;">
        <p style="font-size: 12px; color: #999;">
          This link will expire in 24 hours. If you did not expect this email, you can safely ignore it.
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

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    const twoMinutesAgo = subMinutes(new Date(), 2);
    const recentToken = await prisma.setPasswordToken.findFirst({
      where: {
        userId: user.id,
        createdAt: { gte: twoMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentToken) {
      return NextResponse.json({
        error: "A setup email was already sent. Please wait before trying again.",
      }, { status: 429 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = addHours(new Date(), 24);

    await prisma.setPasswordToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    const setLink = `${process.env.NEXTAUTH_URL}/auth/set-password/${token}`;
    await sendSetPasswordEmail(email, setLink);

    return NextResponse.json({ message: "Set password email sent", setLink }, { status: 200 });

  } catch (err) {
    console.error("Set password error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
