// app/api/auth/password-reset/[token]/route.ts

import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isBefore } from "date-fns";

const prisma = new PrismaClient();

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    const { password } = await req.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Missing token or password" },
        { status: 400 }
      );
    }

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record || isBefore(new Date(record.expiresAt), new Date())) {
      return NextResponse.json(
        { error: "Token is invalid or expired" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ message: "Password updated" }, { status: 200 });
  } catch (err) {
    console.error("Password reset failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
