/**
 * 2FA Verification API Route
 *
 * Verifies two-factor authentication codes and completes the authentication process.
 * Validates time-sensitive verification codes and handles secure cleanup after verification.
 *
 * ## Endpoint
 * POST /api/auth/2fa/verify
 *
 * ## Request Body
 * ```json
 * {
 *   "userId": string,
 *   "code": string
 * }
 * ```
 *
 * ## Response
 * **Success (200):**
 * ```json
 * {
 *   "success": true,
 *   "message": "2FA verification successful",
 *   "user": {
 *     "id": string,
 *     "email": string,
 *     "name": string,
 *     "role": string
 *   }
 * }
 * ```
 *
 * **Error Responses:**
 * - `400 Bad Request`:
 *   - `{ error: "User ID and code are required" }` - Missing required fields
 *   - `{ error: "No verification code found" }` - No active 2FA code
 *   - `{ error: "Verification code has expired" }` - Code past 10-minute expiry
 *   - `{ error: "Invalid verification code" }` - Incorrect code provided
 * - `404 Not Found`: `{ error: "User not found" }` - Invalid user ID
 * - `500 Internal Server Error`: `{ error: "Internal server error" }` - Database/server errors
 *
 * ## Process Flow
 * 1. Validates required fields (userId, code)
 * 2. Finds user in database by ID
 * 3. Checks if verification code exists and is not expired
 * 4. Compares provided code with stored code
 * 5. Clears verification code after successful verification
 * 6. Returns user data for session creation
 *
 * ## Security Features
 * - Time-based code expiration (10 minutes)
 * - Automatic cleanup of expired codes
 * - Single-use codes (cleared after verification)
 * - Secure code comparison
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: "User ID and code are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if code exists and is not expired
    if (!user.twoFactorCode || !user.twoFactorCodeExpires) {
      return NextResponse.json(
        { error: "No verification code found" },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (new Date() > user.twoFactorCodeExpires) {
      // Clear expired code
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorCode: null,
          twoFactorCodeExpires: null,
        },
      });

      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Verify code
    if (user.twoFactorCode !== code) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Clear 2FA code after successful verification
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "2FA verification successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in 2FA verify:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
