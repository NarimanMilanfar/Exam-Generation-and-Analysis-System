import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Verify the user's identity
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateId = params.id;
    const { courseId } = await request.json();

    // 2. Verify that the template exists and belongs to the current user
    const template = await prisma.examTemplate.findFirst({
      where: {
        id: templateId,
        userId: session.user.id,
        ...(courseId && { courseId }),
      },
      include: {
        items: {
          include: {
            question: true,
            questionBank: true,
          },
          orderBy: { order: "asc" },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or unauthorized" },
        { status: 404 }
      );
    }

    // 3. Handle template projects and generate a list of questions
    const generatedQuestions: any[] = [];
    const usedQuestionIds = new Set<string>();

    for (const item of template.items) {
      // 3.1 Deal with necessary issues
      if (item.isRequired) {
        if (!item.questionId || !item.question) {
          return NextResponse.json(
            { error: `Required item ${item.id} has no associated question` },
            { status: 400 }
          );
        }

        // Make sure that the necessary questions belong to the current course
        if (item.question.courseId !== courseId) {
          return NextResponse.json(
            { error: `Required question ${item.questionId} does not belong to course ${courseId}` },
            { status: 400 }
          );
        }

        if (!usedQuestionIds.has(item.questionId)) {
          // Include negativePoints when adding required questions
          generatedQuestions.push({
            ...item.question,
            negativePoints: item.question.negativePoints, // Add negativePoints from question
            templateItemPoints: item.points, // Preserve template item's points for reference
          });
          usedQuestionIds.add(item.questionId);
        }
        continue;
      }

      // 3.2 Handle non-essential problems (randomly selected based on conditions)
      const whereConditions: any = {
        courseId, // Make sure the problem belongs to the current course
      };

      if (item.questionBankId) {
        whereConditions.questionBankId = item.questionBankId;
      }

      if (item.type) {
        whereConditions.type = item.type;
      }

      if (item.difficulty) {
        whereConditions.difficulty = item.difficulty;
      }

      if (item.topic) {
        whereConditions.topic = item.topic;
      }

      whereConditions.id = {
        notIn: Array.from(usedQuestionIds),
      };

      const candidateQuestions = await prisma.question.findMany({
        where: whereConditions,
        take: 20,
      });

      if (candidateQuestions.length > 0) {
        const randomIndex = Math.floor(Math.random() * candidateQuestions.length);
        const selectedQuestion = candidateQuestions[randomIndex];
        
        // Include negativePoints when adding selected random questions
        generatedQuestions.push({
          ...selectedQuestion,
          negativePoints: selectedQuestion.negativePoints, // Add negativePoints from question
          templateItemPoints: item.points, // Preserve template item's points for reference
        });
        usedQuestionIds.add(selectedQuestion.id);
      } else {
        console.warn(`No matching questions for template item ${item.id}`);
      }
    }

    // 4. Return the generated list of questions with negativePoints included
    return NextResponse.json({
      questions: generatedQuestions,
      count: generatedQuestions.length,
    });

  } catch (error) {
    console.error("Error generating exam from template:", error);
    return NextResponse.json(
      { error: "Failed to generate exam questions" },
      { status: 500 }
    );
  }
}