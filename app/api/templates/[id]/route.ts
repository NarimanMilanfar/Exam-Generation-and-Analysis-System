import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

// GET /api/templates/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateId = params.id;
    console.log("🔍 API GET: Fetching template:", templateId);

    // Query the template and all associated data
    const template = await prisma.examTemplate.findFirst({
      where: { id: templateId, userId: session.user.id },
      include: {
        items: {
          orderBy: { order: "asc" },
          include: {
            questionBank: {
              select: {
                id: true,
                name: true,
              },
            },
            question: {
              select: {
                id: true,
                text: true,
                type: true,
                difficulty: true,
                topic: true,
                points: true,
                negativePoints: true,
              },
            },
          },
        },
        course: { select: { id: true, name: true } },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    console.log(
      "🔍 API GET: Found template with",
      template.items.length,
      "items"
    );

    // Group items by sectionId and reconstruct section ranges
    const sectionGroups = new Map<string, any[]>();

    // Group items by sectionId
    template.items.forEach((item) => {
      const sectionId = item.sectionId || "Section 1";
      if (!sectionGroups.has(sectionId)) {
        sectionGroups.set(sectionId, []);
      }
      sectionGroups.get(sectionId)!.push(item);
    });

    // Create sections with proper start/end ranges
    const sections: any[] = [];
    let currentStart = 1;

    // Sort section groups by the minimum order within each section
    const sortedSectionEntries = Array.from(sectionGroups.entries()).sort(
      (a, b) => {
        const minOrderA = Math.min(...a[1].map((item) => item.order));
        const minOrderB = Math.min(...b[1].map((item) => item.order));
        return minOrderA - minOrderB;
      }
    );

    sortedSectionEntries.forEach(([sectionId, items]) => {
      const questionCount = items.length;
      const sectionType = items[0]?.type || "MULTIPLE_CHOICE";

      sections.push({
        id: sectionId,
        name: sectionId,
        type: sectionType,
        start: currentStart,
        end: currentStart + questionCount - 1,
      });

      currentStart += questionCount;
    });

    console.log("🔍 API GET: Reconstructed sections:", sections);

    // Transform questions with proper data handling
    const questions = template.items.map((item) => {
      console.log("🔍 API GET: Processing item:", {
        order: item.order,
        isRequired: item.isRequired,
        difficulty: item.difficulty,
        topic: item.topic,
        questionBankId: item.questionBankId,
        questionId: item.questionId,
        questionBank: item.questionBank?.name,
        hasQuestion: !!item.question,
      });

      // Clean up null string values from database
      const cleanDifficulty =
        item.difficulty === "null" ? null : item.difficulty;
      const cleanTopic = item.topic === "null" ? null : item.topic;

      const transformedQuestion = {
        id: item.id,
        questionNumber: item.order,
        type: item.type,
        isRequired: item.isRequired,
        selectedQuestionId: item.questionId,
        difficulty: cleanDifficulty || "",
        topic: cleanTopic || "",
        questionBankId: item.questionBankId || "",
        points: item.points || "",
        negativePoints: item.negativePoints,
        sectionId: item.sectionId || "Section 1",
        question: item.question
          ? {
              ...item.question,
              questionBankName: item.questionBank?.name || "Unknown Bank",
            }
          : null,
      };

      console.log("🔍 API GET: Transformed question:", transformedQuestion);
      return transformedQuestion;
    });

    const transformedTemplate = {
      id: template.id,
      name: template.title,
      description: template.description,
      sections,
      questions,
      totalQuestions: template.items.length,
      color: template.color,
      courseId: template.courseId,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
    };

    console.log("🔍 API GET: Final response:", {
      name: transformedTemplate.name,
      sectionsCount: transformedTemplate.sections.length,
      questionsCount: transformedTemplate.questions.length,
      sampleQuestion: transformedTemplate.questions[1], // Item 2 which should have data
    });

    return NextResponse.json(transformedTemplate);
  } catch (error) {
    console.error("🔍 API GET: Error fetching template:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateId = params.id;
    const body = await request.json();
    console.log("🔍 API PUT: Received request body:", body);

    const { title, description, courseId, sections, questions } = body;
    console.log("🔍 API PUT: Extracted questions:", questions);

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: "Title and questions are required" },
        { status: 400 }
      );
    }

    const existingTemplate = await prisma.examTemplate.findFirst({
      where: { id: templateId, userId: session.user.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    // Update the template and sub-items using transactions
    const updatedTemplate = await prisma.$transaction(async (tx) => {
      await tx.examTemplate.update({
        where: { id: templateId },
        data: {
          title: title,
          description: description || null,
          courseId: courseId || null,
        },
      });

      // 2. Delete existing sub-items
      await tx.examTemplateItem.deleteMany({
        where: { templateId },
      });

      // 3. Create a new sub-item
      const templateItems = questions.map((q: any) => {
        const item = {
          templateId,
          sectionId: q.sectionId || null,
          order: q.questionNumber,
          type: q.type,
          points:
            q.points !== undefined && q.points !== "" ? Number(q.points) : null,
          negativePoints:
            q.negativePoints !== undefined && q.negativePoints !== ""
              ? Number(q.negativePoints)
              : null,
          difficulty: q.difficulty || null,
          topic: q.topic || null,
          questionBankId: q.questionBankId || null,
          isRequired: q.isRequired,
          questionId: q.selectedQuestionId || null,
        };
        console.log("🔍 API PUT: Creating template item:", item);
        return item;
      });

      console.log("🔍 API PUT: All template items to save:", templateItems);

      await tx.examTemplateItem.createMany({
        data: templateItems,
      });

      return await tx.examTemplate.findUnique({
        where: { id: templateId },
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

    // Reconstruct sections with proper start/end ranges (same logic as GET)
    const sectionGroups = new Map<string, any[]>();

    // Group items by sectionId
    updatedTemplate?.items.forEach((item) => {
      const sectionId = item.sectionId || "Section 1";
      if (!sectionGroups.has(sectionId)) {
        sectionGroups.set(sectionId, []);
      }
      sectionGroups.get(sectionId)!.push(item);
    });

    // Create sections with proper start/end ranges
    const reconstructedSections: any[] = [];
    let currentStart = 1;

    // Sort section groups by the minimum order within each section
    const sortedSectionEntries = Array.from(sectionGroups.entries()).sort(
      (a, b) => {
        const minOrderA = Math.min(...a[1].map((item) => item.order));
        const minOrderB = Math.min(...b[1].map((item) => item.order));
        return minOrderA - minOrderB;
      }
    );

    sortedSectionEntries.forEach(([sectionId, items]) => {
      const questionCount = items.length;
      const sectionType = items[0]?.type || "MULTIPLE_CHOICE";

      reconstructedSections.push({
        id: sectionId,
        name: sectionId,
        type: sectionType,
        start: currentStart,
        end: currentStart + questionCount - 1,
      });

      currentStart += questionCount;
    });

    const result = {
      ...updatedTemplate,
      sections: reconstructedSections,
      name: updatedTemplate?.title,
      questions: updatedTemplate?.items.map((item) => ({
        id: item.id,
        questionNumber: item.order,
        type: item.type,
        isRequired: item.isRequired,
        selectedQuestionId: item.questionId,
        difficulty: item.difficulty,
        topic: item.topic,
        questionBankId: item.questionBankId,
        points: item.points,
        negativePoints: item.negativePoints,
        sectionId: item.sectionId || "Section 1",
      })),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateId = params.id;

    // Check whether the template exists and belongs to the current user
    const existingTemplate = await prisma.examTemplate.findFirst({
      where: { id: templateId, userId: session.user.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete template and its sub-items
    await prisma.$transaction(async (tx) => {
      await tx.examTemplateItem.deleteMany({
        where: { templateId },
      });

      await tx.examTemplate.delete({
        where: { id: templateId },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateId = params.id;
    const body = await request.json();

    const existingTemplate = await prisma.examTemplate.findFirst({
      where: { id: templateId, userId: session.user.id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    const updateData = {
      title: body.name,
      description: body.description,
      color: body.color,
    };

    // Filter out the fields that are not provided
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    // update template
    const updatedTemplate = await prisma.examTemplate.update({
      where: { id: templateId },
      data: filteredData,
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

    // Reconstruct sections with proper start/end ranges (same logic as GET)
    const sectionGroups = new Map<string, any[]>();

    // Group items by sectionId
    updatedTemplate.items.forEach((item) => {
      const sectionId = item.sectionId || "Section 1";
      if (!sectionGroups.has(sectionId)) {
        sectionGroups.set(sectionId, []);
      }
      sectionGroups.get(sectionId)!.push(item);
    });

    // Create sections with proper start/end ranges
    const reconstructedSections: any[] = [];
    let currentStart = 1;

    // Sort section groups by the minimum order within each section
    const sortedSectionEntries = Array.from(sectionGroups.entries()).sort(
      (a, b) => {
        const minOrderA = Math.min(...a[1].map((item) => item.order));
        const minOrderB = Math.min(...b[1].map((item) => item.order));
        return minOrderA - minOrderB;
      }
    );

    sortedSectionEntries.forEach(([sectionId, items]) => {
      const questionCount = items.length;
      const sectionType = items[0]?.type || "MULTIPLE_CHOICE";

      reconstructedSections.push({
        id: sectionId,
        name: sectionId,
        type: sectionType,
        start: currentStart,
        end: currentStart + questionCount - 1,
      });

      currentStart += questionCount;
    });

    return NextResponse.json({
      ...updatedTemplate,
      name: updatedTemplate.title,
      sections: reconstructedSections,
      questions: updatedTemplate.items.map((item) => ({
        id: item.id,
        questionNumber: item.order,
        type: item.type,
        isRequired: item.isRequired,
        selectedQuestionId: item.questionId,
        difficulty: item.difficulty,
        topic: item.topic,
        questionBankId: item.questionBankId,
        points: item.points,
        negativePoints: item.negativePoints,
        sectionId: item.sectionId || "Section 1",
      })),
    });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}
