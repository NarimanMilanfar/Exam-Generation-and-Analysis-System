export const dynamic = "force-dynamic";

import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get token from query parameters
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(
        new URL("/auth/error?error=missing-token", request.url)
      );
    }

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        token,
      },
    });

    // Check if token exists and is valid
    if (!verificationToken) {
      return NextResponse.redirect(
        new URL("/auth/error?error=invalid-token", request.url)
      );
    }

    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: {
          token,
        },
      });
      return NextResponse.redirect(
        new URL("/auth/error?error=expired-token", request.url)
      );
    }

    // Find user by email identifier
    const user = await prisma.user.findUnique({
      where: {
        email: verificationToken.identifier,
      },
    });

    if (!user) {
      return NextResponse.redirect(
        new URL("/auth/error?error=user-not-found", request.url)
      );
    }

    // Update user's email verification status
    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        emailVerified: new Date(),
      },
    });

    // Delete the verification token as it's been used
    await prisma.verificationToken.delete({
      where: {
        token,
      },
    });

    // Redirect to success page
    return NextResponse.redirect(new URL("/auth/verified", request.url));
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.redirect(
      new URL("/auth/error?error=server-error", request.url)
    );
  }
}
