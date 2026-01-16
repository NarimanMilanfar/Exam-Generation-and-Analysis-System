// app/api/admin/users/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";
import crypto from "crypto";
import { addHours, subMinutes } from "date-fns";
import nodemailer from "nodemailer";
import { logAudit } from "../../../../lib/auditLogger";
export const dynamic = "force-dynamic";

// email sending function
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

// get all users
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    const usersWithStatus = users.map((user) => ({
      ...user,
      status: user.emailVerified ? "active" : "inactive",
    }));

    return NextResponse.json(usersWithStatus);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// create a new user and send a set password link.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, role } = await request.json();
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    // check whether the user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // create user (no password)
    const newUser = await prisma.user.create({
      data: {
        name: name || null,
        email,
        role,
      },
    });

    // restrict frequent mail sending (anti-spam)
    const twoMinutesAgo = subMinutes(new Date(), 2);
    const recentToken = await prisma.setPasswordToken.findFirst({
      where: {
        userId: newUser.id,
        createdAt: { gte: twoMinutesAgo },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recentToken) {
      return NextResponse.json(
        {
          error:
            "A setup email was already sent. Please wait before trying again.",
        },
        { status: 429 }
      );
    }

    // generate token and save it.
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = addHours(new Date(), 24);

    await prisma.setPasswordToken.create({
      data: {
        token,
        userId: newUser.id,
        expiresAt,
      },
    });

    const setLink = `${process.env.NEXTAUTH_URL}/auth/set-password/${token}`;
    await sendSetPasswordEmail(email, setLink);

    // Log the user creation
    await logAudit(
      session.user.id,
      session.user.email,
      'USER_CREATED',
      'user_account',
      newUser.id,
      {
        createdUserEmail: newUser.email,
        createdUserName: newUser.name,
        createdUserRole: newUser.role,
        setupEmailSent: true,
        adminAction: true,
      },
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined,
      true
    );

    return NextResponse.json({
      message: "User created and email sent",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
