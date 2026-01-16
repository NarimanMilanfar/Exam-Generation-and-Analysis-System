import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

// GET /api/templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    // Construct query conditions
    const where = courseId
      ? { userId: session.user.id, courseId }
      : { userId: session.user.id };

    // Query the template and its associated sub-items
    const templates = await prisma.examTemplate.findMany({
      where,
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            questionBank: { select: { id: true, name: true } },
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                difficulty: true,
                topic: true,
                negativePoints: true, // Include negativePoints from question
              },
            },
          },
        },
        course: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Convert the back-end data structure to the expected structure of the front-end
    const transformedTemplates = templates.map((template) => {
      const defaultSection = {
        id: "default-section",
        name: "Default Section",
        questionCount: template.items.length,
      };

      const questions = template.items.map((item) => ({
        id: item.id,
        questionNumber: item.order,
        type: item.type,
        isRequired: item.isRequired,
        selectedQuestionId: item.questionId,
        difficulty: item.difficulty,
        topic: item.topic,
        questionBankId: item.questionBankId,
        points: item.points,
        negativePoints: item.negativePoints, // Include negativePoints in transformed data
        sectionId: defaultSection.id,
      }));

      return {
        id: template.id,
        name: template.title,
        description: template.description,
        sections: [defaultSection],
        questions,
        totalQuestions: template.items.length,
        color: template.color,
        courseId: template.courseId,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      };
    });

    return NextResponse.json(transformedTemplates);
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, courseId, questions, color = "#3b82f6" } = body;

    // Enhanced input validation
    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "Title must be 200 characters or less" },
        { status: 400 }
      );
    }

    if (
      description &&
      (typeof description !== "string" || description.length > 1000)
    ) {
      return NextResponse.json(
        { error: "Description must be a string of 1000 characters or less" },
        { status: 400 }
      );
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { error: "Color must be a valid hex color format (#RRGGBB)" },
        { status: 400 }
      );
    }

    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Questions are required and must be an array" },
        { status: 400 }
      );
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    const savedTemplate = await prisma.$transaction(async (tx) => {
      const template = await tx.examTemplate.create({
        data: {
          title,
          description: description || null,
          userId: session.user.id,
          courseId: courseId || null,
          color: color,
        },
      });

      const templateItems = questions.map((q: any, index: number) => ({
        templateId: template.id,
        sectionId: q.sectionId || null,
        order: index + 1,
        type: q.type,
        points: q.points == null || q.points === "" ? null : Number(q.points),
        negativePoints:
          q.negativePoints == null || q.negativePoints === ""
            ? null
            : Number(q.negativePoints), // Add negativePoints handling
        difficulty: q.difficulty || null,
        topic: q.topic || null,
        questionBankId: q.questionBankId || null,
        isRequired: q.isRequired,
        questionId: q.selectedQuestionId || null,
      }));

      // Batch create sub-items
      await tx.examTemplateItem.createMany({
        data: templateItems,
      });

      return await tx.examTemplate.findUnique({
        where: { id: template.id },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              questionBank: { select: { id: true, name: true } },
              question: { select: { id: true, text: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(savedTemplate, { status: 201 });
  } catch (error) {
    console.error("Error saving template:", error);
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, courseId, questions } = body;

    if (!id || !title || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Id, title and questions are required" },
        { status: 400 }
      );
    }

    const existingTemplate = await prisma.examTemplate.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    const updatedTemplate = await prisma.$transaction(async (tx) => {
      await tx.examTemplate.update({
        where: { id },
        data: {
          title,
          description: description || null,
          courseId: courseId || null,
        },
      });

      await tx.examTemplateItem.deleteMany({
        where: { templateId: id },
      });

      const templateItems = questions.map((q: any, index: number) => ({
        templateId: id,
        order: index + 1,
        type: q.type,
        points: q.points == null || q.points === "" ? null : Number(q.points),
        negativePoints:
          q.negativePoints == null || q.negativePoints === ""
            ? null
            : Number(q.negativePoints), // Add negativePoints handling
        difficulty: q.difficulty || null,
        topic: q.topic || null,
        questionBankId: q.questionBankId || null,
        isRequired: q.isRequired,
        questionId: q.selectedQuestionId || null,
      }));

      await tx.examTemplateItem.createMany({
        data: templateItems,
      });

      return await tx.examTemplate.findUnique({
        where: { id },
        include: {
          items: {
            orderBy: { order: "asc" },
            include: {
              questionBank: { select: { id: true, name: true } },
              question: { select: { id: true, text: true } },
            },
          },
        },
      });
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}
