import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { token: string } }) {
  const { token } = params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    // find a valid and unexpired token
    const record = await prisma.setPasswordToken.findFirst({
      where: {
        token,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: {
          select: { email: true, name: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
    }

    // return the user's basic information to the front end
    return NextResponse.json({
      email: record.user.email,
      name: record.user.name,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
