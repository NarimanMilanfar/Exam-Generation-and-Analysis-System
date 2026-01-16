import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";

// GET /api/exams/[id]/generations - Get exam generations for a specific exam
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get exam and check course permissions
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
      select: { id: true, courseId: true }
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    // Check if user has access to the course
    const { hasAccess, error } = await validateCourseAccess(exam.courseId);
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    const generations = await prisma.examGeneration.findMany({
      where: {
        examId: params.id,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        generatedAt: "desc",
      },
    });

    return NextResponse.json(generations);
  } catch (error) {
    console.error("Error fetching exam generations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/exams/[id]/generations - Create a new exam generation
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      numberOfVariants,
      randomizeQuestionOrder,
      randomizeOptionOrder,
      randomizeTrueFalse,
    } = body;

    // Validate input
    if (!numberOfVariants || numberOfVariants < 1 || numberOfVariants > 10) {
      return NextResponse.json(
        { error: "Number of variants must be between 1 and 10" },
        { status: 400 }
      );
    }

    // Get exam and check course permissions  
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
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

    // Create the exam generation record
    const generation = await prisma.examGeneration.create({
      data: {
        examId: params.id,
        numberOfVariants,
        randomizeQuestionOrder: randomizeQuestionOrder || false,
        randomizeOptionOrder: randomizeOptionOrder || false,
        randomizeTrueFalse: randomizeTrueFalse || false,
        status: "PENDING",
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(generation, { status: 201 });
  } catch (error) {
    console.error("Error creating exam generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/exams/[id]/generations - Update exam generation status or configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      generationId,
      status,
      numberOfVariants,
      randomizeQuestionOrder,
      randomizeOptionOrder,
      randomizeTrueFalse,
    } = body;

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    // Get exam and check course permissions
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
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

    // Check if generation is completed and prevent config changes (unless admin)
    const currentGeneration = await prisma.examGeneration.findFirst({
      where: {
        id: generationId,
        examId: params.id,
      },
    });

    if (!currentGeneration) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Only allow status updates for completed exams, not config changes
    if (currentGeneration.status === "COMPLETED" && status === undefined) {
      return NextResponse.json(
        { error: "Cannot modify configuration of completed exam generation" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      updateData.completedAt = status === "COMPLETED" ? new Date() : null;
    }

    if (numberOfVariants !== undefined) {
      updateData.numberOfVariants = numberOfVariants;
    }

    if (randomizeQuestionOrder !== undefined) {
      updateData.randomizeQuestionOrder = randomizeQuestionOrder;
    }

    if (randomizeOptionOrder !== undefined) {
      updateData.randomizeOptionOrder = randomizeOptionOrder;
    }

    if (randomizeTrueFalse !== undefined) {
      updateData.randomizeTrueFalse = randomizeTrueFalse;
    }

    // Update the generation
    const updatedGeneration = await prisma.examGeneration.update({
      where: {
        id: generationId,
        examId: params.id,
      },
      data: updateData,
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(updatedGeneration);
  } catch (error) {
    console.error("Error updating exam generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/exams/[id]/generations - Delete exam generation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { generationId } = body;

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    // Get exam and check course permissions
    const exam = await prisma.exam.findUnique({
      where: { id: params.id },
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

    // CRITICAL FIX: Only delete results for THIS specific generation, not all exam results
    // First get the variant codes for this generation
    const generationVariants = await prisma.examVariant.findMany({
      where: { generationId },
      select: { variantCode: true },
    });
    
    const variantCodes = generationVariants.map(v => v.variantCode);
    
    // Only delete results that belong to this specific generation
    if (variantCodes.length > 0) {
      await prisma.examResult.deleteMany({
        where: {
          examId: params.id,
          variantCode: { in: variantCodes },
        },
      });
    }

    const deletedGeneration = await prisma.examGeneration.delete({
      where: {
        id: generationId,
        examId: params.id,
      },
    });

    return NextResponse.json({
      message: "Exam generation & related results deleted successfully",
      deletedGeneration,
    });
  } catch (error) {
    console.error("Error deleting exam generation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
