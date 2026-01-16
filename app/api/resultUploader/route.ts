import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import prisma from "@/lib/prisma";
import { validateCourseAccess } from "../../../lib/coursePermissions";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    
    // got parameter
    const generationId = searchParams.get("generationId");
    const courseId = searchParams.get("courseId");

    if (!generationId || !courseId) {
      return NextResponse.json(
        { error: "Missing the generationId or courseId parameters" },
        { status: 400 }
      );
    }

    // Check if user has access to the course
    const { hasAccess, error } = await validateCourseAccess(courseId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "The course was not found or access was not authorized" },
        { status: error === 'Unauthorized' ? 401 : 403 }
      );
    }

    // Get course information for response
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, name: true, description: true }
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // 1. Obtain the generation and associated exam information
    const generation = await prisma.examGeneration.findUnique({
      where: { id: generationId },
      select: {
        id: true,
        status: true,
        numberOfVariants: true,
        exam: {
          select: {
            id: true,
            termId: true,
            title: true,
            description: true,
            timeLimit: true
          }
        }
      }
    });

    if (!generation?.exam) {
      return NextResponse.json(
        { error: "No record of exam generation was found" },
        { status: 404 }
      );
    }

    const { exam } = generation;
    const termId = exam.termId;

    // 2. Obtain all the required data in parallel
    const [variants, enrollments, term, examQuestions, variantsWithAnswers] = await Promise.all([
      // Get the basic information of the exam variant
      prisma.examVariant.findMany({
        where: { generationId },
        orderBy: { variantNumber: 'asc' },
        select: {
          id: true,
          variantNumber: true,
          variantCode: true,
          questionOrder: true
        }
      }),
      
      // Get registered students for the course
      prisma.courseEnrollment.findMany({
        where: { courseId, termId },
        include: {
          student: {
            select: {
              id: true,
              name: true,
              studentId: true
            }
          }
        }
      }),
      
      // Get semester information
      prisma.term.findUnique({
        where: { id: termId },
        select: {
          id: true,
          term: true,
          year: true
        }
      }),

      // Get the exam question information (including score and options)
      prisma.examQuestion.findMany({
        where: { examId: exam.id },
        include: {
          question: {
            select: {
              id: true,
              text: true,
              points: true
            }
          }
        },
        orderBy: { order: 'asc' }
      }),

      // Get detailed information about the variants (including answer keys)
      prisma.examVariant.findMany({
        where: { generationId },
        select: {
          id: true,
          variantNumber: true,
          variantCode: true,
          answerKey: true,
          questionOrder: true
        }
      })
    ]);

    // 3. Format the returned data
    const responseData = {
      course: {
        id: course.id,
        name: course.name,
        description: course.description || ''
      },
      term: term ? {
        id: term.id,
        term: term.term,
        year: term.year
      } : null,
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description || '',
        timeLimit: exam.timeLimit || null,
        term: term ? {
          id: term.id,
          term: term.term,
          year: term.year
        } : null
      },
      variants: variants,
      students: enrollments.map(e => ({
        id: e.student.id,
        name: e.student.name,
        studentId: e.student.studentId || ''
      })),
      examQuestions: examQuestions.map(q => ({
        id: q.id,
        questionId: q.questionId,
        question: {
          id: q.question.id,
          text: q.question.text,
          points: q.question.points
        },
        points: q.points
      })),
      // Correct answers and scores for each version
      variantAnswers: variantsWithAnswers.map(variant => {
        const answerKey = variant.answerKey ? JSON.parse(variant.answerKey) : [];
        const questionOrder = variant.questionOrder ? JSON.parse(variant.questionOrder) : null;

        // Create a mapping from the question ID to the answer
        const answerMap = answerKey.reduce((acc, item) => {
          acc[item.questionId] = {
            correctAnswer: item.correctAnswer,
            originalAnswer: item.originalAnswer
          };
          return acc;
        }, {});

        // Associate the question information with the answer
        const questionsWithAnswers = examQuestions.map((q, index) => {
          const answer = answerMap[q.questionId] || {};

          // Calculate the question number as it appears in this variant
          // questionOrder maps variant position to original question index
          const questionNumber = questionOrder && questionOrder.length > 0
            ? questionOrder.findIndex(originalIndex => originalIndex === index) + 1
            : index + 1;

          return {
            questionId: q.questionId,
            questionNumber: questionNumber,
            text: q.question.text,
            correctAnswer: answer.correctAnswer || 'Not Set',
            originalAnswer: answer.originalAnswer || 'Not Set',
            points: q.points || q.question.points
          };
        });

        return {
          variantNumber: variant.variantNumber,
          variantCode: variant.variantCode,
          questions: questionsWithAnswers,
          questionOrder: variant.questionOrder
        };
      })
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error("Failed to obtain the uploaded information:", error);
    return NextResponse.json(
      { error: "server error" },
      { status: 500 }
    );
  }
}