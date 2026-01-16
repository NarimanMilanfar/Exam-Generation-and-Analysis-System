import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";
import { logFileUpload } from "../../../../../lib/auditLogger";

const prisma = new PrismaClient();

interface Question {
  text: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  options?: string[];
  correctAnswer: string;
  points: number;
  negativePoints?: number | null;
  difficulty?: string; // EASY, MEDIUM, HARD
  topic?: string;
}

// Helper function to determine question type
function determineQuestionType(
  block: string[]
): "MULTIPLE_CHOICE" | "TRUE_FALSE" {
  console.log("=== DEBUGGING determineQuestionType ===");
  console.log("Full block:", block);

  // Check if the block contains options (A., B., C., D.)
  const hasOptions = block.some((line) => {
    const isOption = /^[A-Z]\.\s*.+/.test(line);
    console.log(`Checking line "${line}" for options: ${isOption}`);
    return isOption;
  });

  // Check if it's a true/false question by looking at the answer
  const answerLines = block.filter((line) => /^Answer:\s*/.test(line.trim()));
  console.log("Found answer lines:", answerLines);

  let isTrueFalse = false;
  answerLines.forEach((line) => {
    const answerMatch = line.match(/^Answer:\s*(.+)$/i);
    if (answerMatch) {
      const answer = answerMatch[1].trim().toLowerCase();
      if (answer === "true" || answer === "false") {
        console.log(`Found true/false answer in line: "${line}"`);
        isTrueFalse = true;
      }
    }
  });

  console.log("Final determination:");
  console.log("hasOptions:", hasOptions);
  console.log("isTrueFalse:", isTrueFalse);

  if (hasOptions && !isTrueFalse) {
    console.log(
      "Type: MULTIPLE_CHOICE (because has options and not true/false)"
    );
    return "MULTIPLE_CHOICE";
  }

  if (isTrueFalse) {
    console.log("Type: TRUE_FALSE (because has true/false answer)");
    return "TRUE_FALSE";
  }

  console.log("Type: DEFAULTING TO MULTIPLE_CHOICE");
  return "MULTIPLE_CHOICE";
}

function extractPoints(block: string[]): number {
  const pointLine = block.find((line) => line.toLowerCase().includes("point:"));
  if (!pointLine) return 1;

  const pointMatch = pointLine.match(/point:\s*(-?\d+)/i);
  return pointMatch ? parseInt(pointMatch[1], 10) : 1;
}

function extractNegativePoints(block: string[]): number | null {
  const negPointLine = block.find((line) =>
    line.toLowerCase().includes("negative point:")
  );
  if (!negPointLine) return null;

  const negPointMatch = negPointLine.match(/negative point:\s*(-?\d+)/i);
  return negPointMatch ? parseInt(negPointMatch[1], 10) : null;
}

function extractTopic(block: string[]): string | undefined {
  const topicLine = block.find((line) => line.toLowerCase().includes("topic:"));
  if (!topicLine) return undefined;
  const topicMatch = topicLine.match(/topic:\s*(.+)/i);
  return topicMatch ? topicMatch[1].trim() : undefined;
}

function extractDifficulty(
  block: string[]
): "EASY" | "MEDIUM" | "HARD" | undefined {
  const difficultyLine = block.find((line) =>
    line.toLowerCase().includes("difficulty:")
  );
  if (!difficultyLine) return undefined;
  const difficultyMatch = difficultyLine.match(/difficulty:\s*(.+)/i);
  if (!difficultyMatch) return undefined;
  const difficulty = difficultyMatch[1].trim().toUpperCase();
  if (["EASY", "MEDIUM", "HARD"].includes(difficulty)) {
    return difficulty as "EASY" | "MEDIUM" | "HARD";
  }
  return undefined;
}

// Parse DOCX content with predefined rules
async function parseWithRules(content: string): Promise<Question[]> {
  const questionBlocks = content
    .split(/(?=\d+\.\s)/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0);

  const questions: Question[] = [];

  for (const block of questionBlocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const questionMatch = lines[0].match(/^\d+\.\s*(.+)/);
    if (!questionMatch) continue;

    const questionText = questionMatch[1].trim();
    const points = extractPoints(lines);
    const negativePoints = extractNegativePoints(lines);
    const type = determineQuestionType(lines);
    const topic = extractTopic(lines);
    const difficulty = extractDifficulty(lines);

    let options: string[] = [];
    let correctAnswer = "";

    if (type === "MULTIPLE_CHOICE") {
      // Extract all options (remove A. B. prefixes)
      options = lines
        .slice(1)
        .filter((line) => /^[A-Z]\.\s*.+/.test(line))
        .map((opt) => opt.replace(/^[A-Z]\.\s*/, "").trim());

      // Find the answer line with "Answer: X" format
      const answerLine = lines.find((line) => /^Answer:\s*/.test(line.trim()));
      if (answerLine) {
        const answerMatch = answerLine.match(/^Answer:\s*([A-Z])/i);
        if (answerMatch && options.length > 0) {
          const letter = answerMatch[1].toUpperCase();
          // Get the option index corresponding to the letter (A=0, B=1, etc.)
          const answerIndex = letter.charCodeAt(0) - "A".charCodeAt(0);
          // Ensure the index is within the options range
          if (answerIndex >= 0 && answerIndex < options.length) {
            correctAnswer = options[answerIndex]; // Use the option text as the correct answer
          }
        }
      }
    } else if (type === "TRUE_FALSE") {
      // For true/false questions, set standard options
      options = ["True", "False"];

      // Find the answer line with "Answer: X" format
      const answerLine = lines.find((line) => /^Answer:\s*/.test(line.trim()));
      if (answerLine) {
        const answerMatch = answerLine.match(/^Answer:\s*(.+)$/i);
        if (answerMatch) {
          const answer = answerMatch[1].trim();
          // Normalize the answer to match our standard format
          correctAnswer = answer.toLowerCase() === "true" ? "True" : "False";
        }
      }
    }

    const question: Question = {
      text: questionText,
      type,
      options,
      correctAnswer,
      points,
      negativePoints,
      topic,
      difficulty,
    };

    console.log("=== PARSED QUESTION ===");
    console.log("Text:", question.text);
    console.log("Type:", question.type);
    console.log("Topic:", question.topic);
    console.log("Difficulty:", question.difficulty);
    console.log("Options:", question.options);
    console.log("Correct Answer:", question.correctAnswer);
    console.log("Points:", question.points);
    console.log("========================");

    questions.push(question);
  }

  return questions;
}

// Save parsed questions to the database
async function saveQuestionsToDatabase(
  questions: Question[],
  questionBankId: string,
  userId: string
) {
  questions.forEach((q) =>
    console.log(
      "Saving question:",
      q.type,
      q.text,
      q.topic,
      q.difficulty,
      q.options,
      q.correctAnswer,
      q.points,
      q.negativePoints
    )
  );

  const questionBank = await prisma.questionBank.findUnique({
    where: { id: questionBankId },
    select: { courseId: true },
  });

  if (!questionBank) {
    throw new Error("Question bank not found");
  }

  return await prisma.$transaction(
    questions.map((q) =>
      prisma.question.create({
        data: {
          text: q.text,
          type: q.type,
          options: q.options ? JSON.stringify(q.options) : null,
          correctAnswer: q.correctAnswer,
          points: q.points,
          negativePoints: q.negativePoints ?? undefined,
          questionBankId: questionBankId,
          courseId: questionBank.courseId,
          topic: q.topic,
          difficulty: q.difficulty as "EASY" | "MEDIUM" | "HARD" | undefined,
        },
      })
    )
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const questionBankId = params.id;
    const contentType = req.headers.get("content-type");

    // Verify that the question bank exists and user has edit access to the course
    const questionBank = await prisma.questionBank.findUnique({
      where: { id: questionBankId },
      select: { id: true, courseId: true },
    });

    if (!questionBank) {
      return NextResponse.json(
        { error: "Question bank not found" },
        { status: 404 }
      );
    }

    // Check if user has edit access to the course
    const { hasAccess, error } = await validateCourseAccess(
      questionBank.courseId,
      "edit"
    );
    if (!hasAccess) {
      return NextResponse.json(
        { error: error || "Access denied" },
        { status: 403 }
      );
    }

    // Handle save to database request
    if (contentType?.includes("application/json")) {
      const { action, questions } = await req.json();
      console.log("json back questions:", questions);
      if (action === "save" && Array.isArray(questions)) {
        const savedQuestions = await saveQuestionsToDatabase(
          questions,
          questionBankId,
          session.user.id
        );
        return NextResponse.json({
          success: true,
          count: savedQuestions.length,
          savedIds: savedQuestions.map((q) => q.id),
        });
      }
      return NextResponse.json(
        { error: "invalid save request" },
        { status: 400 }
      );
    }

    // Handle file upload and parsing
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith(".docx")) {
      await logFileUpload(
        session.user.id,
        file.name,
        file.size,
        'docx',
        false,
        questionBankId,
        "Only DOCX files are supported",
        req
      );
      return NextResponse.json(
        { error: "Only DOCX files are supported" },
        { status: 400 }
      );
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      await logFileUpload(
        session.user.id,
        file.name,
        file.size,
        'docx',
        false,
        questionBankId,
        "File size too large. Maximum 10MB allowed",
        req
      );
      return NextResponse.json(
        { error: "File size too large. Maximum 10MB allowed" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const result = await mammoth.extractRawText({ buffer });
    const content = result.value;

    if (!content.trim()) {
      await logFileUpload(
        session.user.id,
        file.name,
        file.size,
        'docx',
        false,
        questionBankId,
        "No text content found in the file",
        req
      );
      return NextResponse.json(
        { error: "No text content found in the file" },
        { status: 400 }
      );
    }

    // Parse with rules only
    const questions = await parseWithRules(content);

    if (questions.length === 0) {
      await logFileUpload(
        session.user.id,
        file.name,
        file.size,
        'docx',
        false,
        questionBankId,
        "No questions parsed. Please check the format or download the template for the correct format",
        req
      );
      return NextResponse.json(
        {
          error:
            "No questions parsed. Please check the format or download the template for the correct format",
          content: content.substring(0, 500), // First 500 chars for debugging
        },
        { status: 400 }
      );
    }

    // Log successful file upload
    await logFileUpload(
      session.user.id,
      file.name,
      file.size,
      'docx',
      true,
      questionBankId,
      undefined,
      req
    );

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
      method: "Rule-based parsing",
    });
  } catch (error: any) {
    console.error("Operation failed:", error);
    
    // Try to log the failed upload if we have session and file info
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await logFileUpload(
          session.user.id,
          "unknown_file.docx", // fallback name
          0, // fallback size
          'docx',
          false,
          params.id,
          error.message,
          req
        );
      }
    } catch (logError) {
      console.error("Failed to log upload error:", logError);
    }
    
    return NextResponse.json(
      {
        error: "Operation failed",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
