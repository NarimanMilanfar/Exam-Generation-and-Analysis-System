// app/api/auth/set-password/verify/route.ts

import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";
import { isAfter } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const tokenRecord = await prisma.setPasswordToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        {
          error:
            "Account already created. This setup link has been used and is no longer valid. Please login with your credentials.",
        },
        { status: 400 }
      );
    }

    if (isAfter(new Date(), tokenRecord.expiresAt)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: tokenRecord.user.email,
      name: tokenRecord.user.name,
    });
  } catch (err) {
    console.error("Token verification failed:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
