import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";
import { validateCourseAccess } from "../../../lib/coursePermissions";

// POST /api/exam-variants - Save exam variant with answer keys
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      generationId,
      variantNumber,
      variantCode,
      examId,
      answerKey,
      questionOrder,
      answerOrder,
    } = body;

    // Validate required fields
    if (!generationId || !variantNumber || !examId || !answerKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get exam and check course permissions
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, courseId: true }
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(exam.courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Verify the generation belongs to the exam
    const generation = await prisma.examGeneration.findFirst({
      where: {
        id: generationId,
        examId: examId,
      },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Create or update the exam variant
    const variant = await prisma.examVariant.upsert({
      where: {
        generationId_variantNumber: {
          generationId: generationId,
          variantNumber: variantNumber,
        },
      },
      update: {
        variantCode: variantCode,
        answerKey: answerKey,
        questionOrder: questionOrder,
        answerOrder: answerOrder,
      },
      create: {
        generationId: generationId,
        examId: examId,
        variantNumber: variantNumber,
        variantCode: variantCode,
        answerKey: answerKey,
        questionOrder: questionOrder,
        answerOrder: answerOrder,
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("Error saving exam variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/exam-variants - Get exam variants for a generation
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("generationId");

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    // Get the generation and exam info to check permissions
    const generation = await prisma.examGeneration.findUnique({
      where: { id: generationId },
      include: {
        exam: {
          select: { id: true, courseId: true }
        }
      }
    });

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Check if user has access to the course
    const { hasAccess, error } = await validateCourseAccess(generation.exam.courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Get variants for the generation
    const variants = await prisma.examVariant.findMany({
      where: {
        generationId: generationId,
      },
      orderBy: {
        variantNumber: "asc",
      },
    });

    return NextResponse.json(variants);
  } catch (error) {
    console.error("Error fetching exam variants:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/exam-variants - Delete exam variant by generation and variant number
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("generationId");
    const variantNumber = searchParams.get("variantNumber");

    if (!generationId || !variantNumber) {
      return NextResponse.json(
        { error: "Generation ID and variant number are required" },
        { status: 400 }
      );
    }

    // Get the generation and exam info to check permissions
    const generation = await prisma.examGeneration.findUnique({
      where: { id: generationId },
      include: {
        exam: {
          select: { id: true, courseId: true }
        }
      }
    });

    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 });
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(generation.exam.courseId, 'edit');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Delete the variant
    await prisma.examVariant.delete({
      where: {
        generationId_variantNumber: {
          generationId: generationId,
          variantNumber: parseInt(variantNumber),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting exam variant:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
