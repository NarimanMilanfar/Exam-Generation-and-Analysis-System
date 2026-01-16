import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";
import { CourseConfigRequest } from "../../../../../types/courseConfig";

export const dynamic = "force-dynamic";

const DEFAULT_CONFIG: CourseConfigRequest = {
  defaultQuestionCount: 20,
  defaultFormat: 'MCQ',
  weightPerQuestion: 1.0,
  negativeMarking: false,
  allowInstructorOverride: true,
};

// GET course config
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const courseId = params.id;
    console.log("Fetching config for course:", courseId);

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Get course config
    const courseConfig = await prisma.courseConfig.findUnique({
      where: { courseId },
    });
    console.log("Found course config:", courseConfig);

    if (!courseConfig) {
      // Return default config if none exists
      return NextResponse.json({
        success: true,
        config: DEFAULT_CONFIG,
      });
    }

    const config: CourseConfigRequest = {
      defaultQuestionCount: courseConfig.defaultQuestionCount,
      defaultFormat: courseConfig.defaultFormat as 'MCQ' | 'TrueFalse' | 'Mixed',
      weightPerQuestion: courseConfig.weightPerQuestion,
      negativeMarking: courseConfig.negativeMarking,
      allowInstructorOverride: courseConfig.allowInstructorOverride,
    };

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error fetching course config:", error);
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Failed to fetch course configuration", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST/PUT course config
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }

    const courseId = params.id;
    const config: CourseConfigRequest = await request.json();

    // Validate config structure
    if (
      typeof config.defaultQuestionCount !== 'number' ||
      !['MCQ', 'TrueFalse', 'Mixed'].includes(config.defaultFormat) ||
      typeof config.weightPerQuestion !== 'number' ||
      typeof config.negativeMarking !== 'boolean' ||
      typeof config.allowInstructorOverride !== 'boolean'
    ) {
      return NextResponse.json(
        { error: "Invalid config format" },
        { status: 400 }
      );
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }

    // Upsert course config
    const courseConfig = await prisma.courseConfig.upsert({
      where: { courseId },
      update: {
        defaultQuestionCount: config.defaultQuestionCount,
        defaultFormat: config.defaultFormat,
        weightPerQuestion: config.weightPerQuestion,
        negativeMarking: config.negativeMarking,
        allowInstructorOverride: config.allowInstructorOverride,
      },
      create: {
        courseId,
        defaultQuestionCount: config.defaultQuestionCount,
        defaultFormat: config.defaultFormat,
        weightPerQuestion: config.weightPerQuestion,
        negativeMarking: config.negativeMarking,
        allowInstructorOverride: config.allowInstructorOverride,
      },
    });

    return NextResponse.json({
      success: true,
      config: {
        defaultQuestionCount: courseConfig.defaultQuestionCount,
        defaultFormat: courseConfig.defaultFormat,
        weightPerQuestion: courseConfig.weightPerQuestion,
        negativeMarking: courseConfig.negativeMarking,
        allowInstructorOverride: courseConfig.allowInstructorOverride,
      },
    });
  } catch (error) {
    console.error("Error saving course config:", error);
    return NextResponse.json(
      { error: "Failed to save course configuration" },
      { status: 500 }
    );
  }
}