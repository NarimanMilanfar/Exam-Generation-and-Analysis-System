import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

// GET /api/auth/onboarding - Get user's onboarding status
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        ["onboardingCompleted" as any]: true,
        ["onboardingSkipped" as any]: true,
        createdAt: true,
        _count: {
          select: {
            courses: true,
            exams: true,
            questionBanks: true,
          },
        },
      },
    }) as any;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Determine if user should see onboarding
    const shouldShowOnboarding = 
      !user.onboardingCompleted && 
      !user.onboardingSkipped &&
      user._count.courses === 0 &&
      user._count.exams === 0 &&
      user._count.questionBanks === 0;

    return NextResponse.json({
      onboardingCompleted: user.onboardingCompleted,
      onboardingSkipped: user.onboardingSkipped,
      shouldShowOnboarding,
      isNewUser: user._count.courses === 0 && user._count.exams === 0 && user._count.questionBanks === 0,
      userStats: {
        courses: user._count.courses,
        exams: user._count.exams,
        questionBanks: user._count.questionBanks,
      },
    });
  } catch (error) {
    console.error("Error fetching onboarding status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/auth/onboarding - Update user's onboarding status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action } = await request.json();

    if (!action || !["complete", "skip"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'complete' or 'skip'" },
        { status: 400 }
      );
    }

    const updateData = action === "complete" 
      ? { onboardingCompleted: true }
      : { onboardingSkipped: true };

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData as any,
      select: {
        ["onboardingCompleted" as any]: true,
        ["onboardingSkipped" as any]: true,
      },
    }) as any;

    return NextResponse.json({
      success: true,
      onboardingCompleted: updatedUser.onboardingCompleted,
      onboardingSkipped: updatedUser.onboardingSkipped,
    });
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 