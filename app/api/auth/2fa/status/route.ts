/**
 * 2FA Status API Route
 *
 * Retrieves the two-factor authentication status for the currently authenticated user.
 * Requires valid session authentication to access user's 2FA settings.
 *
 * ## Endpoint
 * GET /api/auth/2fa/status
 *
 * ## Authentication
 * Requires valid NextAuth session (user must be logged in)
 *
 * ## Response
 * **Success (200):**
 * ```json
 * {
 *   "twoFactorEnabled": boolean
 * }
 * ```
 *
 * **Error Responses:**
 * - `401 Unauthorized`: `{ error: "Unauthorized" }` - No valid session
 * - `404 Not Found`: `{ error: "User not found" }` - User doesn't exist in database
 * - `500 Internal Server Error`: `{ error: "Internal server error" }` - Database/server errors
 *
 * ## Process Flow
 * 1. Validates user session using NextAuth
 * 2. Queries database for user's 2FA status
 * 3. Returns boolean indicating if 2FA is enabled
 *
 * ## Usage
 * Used by frontend components to conditionally show 2FA settings and controls.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Session user:", session.user);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { twoFactorEnabled: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    console.error("Error fetching 2FA status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
