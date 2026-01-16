/**
 * 2FA Send API Route
 *
 * Handles two-factor authentication code generation and email delivery.
 * Validates user credentials and sends verification codes for 2FA-enabled accounts.
 *
 * ## Endpoint
 * POST /api/auth/2fa/send
 *
 * ## Request Body
 * - `email` (string): User's email address
 * - `password` (string): User's password for verification
 *
 * ## Response
 * **Success (200):**
 * - 2FA Disabled: `{ success: true, message: "2FA not required", userId, twoFactorRequired: false }`
 * - 2FA Enabled: `{ success: true, message: "Verification code sent", userId, twoFactorRequired: true }`
 *
 * **Error (400/401/500):**
 * - `{ error: "Email and password are required" }` - Missing credentials
 * - `{ error: "Invalid credentials" }` - Wrong email/password
 * - `{ error: "Please verify your email before logging in" }` - Unverified email
 * - `{ error: "Failed to send verification code" }` - Email delivery failure
 * - `{ error: "Internal server error" }` - Server/database errors
 *
 * ## Process Flow
 * 1. Validates required fields (email, password)
 * 2. Finds user by email in database
 * 3. Verifies password using bcrypt
 * 4. Checks email verification status
 * 5. For 2FA users: generates 6-digit code, stores in DB, sends via email
 * 6. For non-2FA users: returns success without code generation
 */

import { NextRequest, NextResponse } from "next/server";
import { send2FACode } from "../../../../lib/email";
import prisma from "../../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email before logging in" },
        { status: 401 }
      );
    }

    // Check if user has 2FA enabled
    if (!user.twoFactorEnabled) {
      return NextResponse.json({
        success: true,
        message: "2FA not required",
        userId: user.id,
        twoFactorRequired: false,
      });
    }

    // Generate 6-digit 2FA code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    // Store 2FA code in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorCode: code,
        twoFactorCodeExpires: expiresAt,
      },
    });

    // Send 2FA code via email
    const emailResult = await send2FACode(email, user.name || "User", code);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send verification code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      userId: user.id,
      twoFactorRequired: true,
    });
  } catch (error) {
    console.error("Error in 2FA send:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
