/**
 * 2FA Toggle API Route
 *
 * Enables or disables two-factor authentication for the currently authenticated user.
 * Handles secure toggling of 2FA settings and cleanup of existing verification codes.
 *
 * ## Endpoint
 * POST /api/auth/2fa/toggle
 *
 * ## Authentication
 * Requires valid NextAuth session (user must be logged in)
 *
 * ## Request Body
 * ```json
 * {
 *   "enabled": boolean
 * }
 * ```
 *
 * ## Response
 * **Success (200):**
 * ```json
 * {
 *   "success": true,
 *   "twoFactorEnabled": boolean
 * }
 * ```
 *
 * **Error Responses:**
 * - `400 Bad Request`: `{ error: "Invalid input" }` - Missing or invalid enabled field
 * - `401 Unauthorized`: `{ error: "Unauthorized" }` - No valid session
 * - `500 Internal Server Error`: `{ error: "Internal server error" }` - Database/server errors
 *
 * ## Process Flow
 * 1. Validates user session using NextAuth
 * 2. Validates request body contains boolean `enabled` field
 * 3. Updates user's 2FA status in database
 * 4. When disabling: clears any existing 2FA codes for security
 * 5. Returns updated 2FA status
 *
 * ## Security Features
 * - Clears existing verification codes when 2FA is disabled
 * - Validates input type to prevent injection attacks
 * - Session-based authentication prevents unauthorized access
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { logAudit } from "../../../../../lib/auditLogger";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Session user:", session.user);

    const { enabled } = await request.json();

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        twoFactorEnabled: enabled,
        // Clear any existing 2FA codes when disabling
        twoFactorCode: enabled ? undefined : null,
        twoFactorCodeExpires: enabled ? undefined : null,
      },
      select: { twoFactorEnabled: true },
    });

    // Log the 2FA toggle action
    await logAudit(
      session.user.id,
      session.user.email,
      user.twoFactorEnabled ? 'TWO_FACTOR_ENABLED' : 'TWO_FACTOR_DISABLED',
      'user_security',
      session.user.id,
      {
        previousState: !user.twoFactorEnabled,
        newState: user.twoFactorEnabled,
        codesCleared: !enabled,
      },
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
      request.headers.get('x-real-ip') || undefined,
      request.headers.get('user-agent') || undefined,
      true
    );

    return NextResponse.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
    });
  } catch (error) {
    console.error("Error toggling 2FA:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
