import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma'
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { logCSVImport } from "../../../../../lib/auditLogger";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const courseId = params.id;

  const url = new URL(request.url);
  const termId = url.searchParams.get("termId");

  try {
    const whereClause: any = { courseId };
    if (termId) {
      whereClause.termId = termId;
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: whereClause,
      include: {
        student: true,
        term: true,
      },
    });

    return NextResponse.json({ enrollments });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}


export async function POST(request: Request, { params }: { params: { id: string } }) {
  const courseId = params.id;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (Array.isArray(body.students)) {
      const students = body.students;
      const termId = body.termId;
      if (!termId) {
        return NextResponse.json({ error: 'Missing termId' }, { status: 400 });
      }

      for (const { id, name } of students) {
        // Check if student already exists by studentId (not primary key id)
        const existingStudent = await prisma.student.findFirst({
          where: { studentId: id },
        });

        // Create or update student - let Prisma generate the primary key
        const student = existingStudent || await prisma.student.create({
          data: { name, studentId: id },
        });

        // If student exists, update the name
        if (existingStudent && existingStudent.name !== name) {
          await prisma.student.update({
            where: { id: existingStudent.id },
            data: { name },
          });
        }

        await prisma.courseEnrollment.upsert({
          where: {
            studentId_courseId_termId: {
              courseId,
              studentId: student.id,  // Use the actual primary key
              termId,
            },
          },
          update: {},
          create: {
            courseId,
            studentId: student.id,  // Use the actual primary key
            termId,
          },
        });
      }

      // Log successful CSV import
      await logCSVImport(
        session.user.id,
        "student_roster.csv", // Generic name since we don't have the actual filename
        students.length,
        true,
        courseId,
        undefined,
        request
      );

      return NextResponse.json({ success: true });
    }

    const { name, studentId, termId } = body;

    if (!name || !studentId || !termId) {
      return NextResponse.json({ error: 'Missing required fields (name, studentId, termId)' }, { status: 400 });
    }

    const existingStudent = await prisma.student.findFirst({
      where: { studentId },
    });

    const student = existingStudent || await prisma.student.create({
      data: { name, studentId },
    });

    const alreadyEnrolled = await prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId_termId: {
          courseId,
          studentId: student.id,
          termId,
        },
      },
    });

    if (alreadyEnrolled) {
      return NextResponse.json({ error: 'Student already enrolled in this course and term' }, { status: 409 });
    }

    await prisma.courseEnrollment.create({
      data: {
        courseId,
        studentId: student.id,
        termId,
      },
    });

    const enrollment = await prisma.courseEnrollment.findUnique({
      where: {
        studentId_courseId_termId: {
          courseId,
          studentId: student.id,
          termId,
        },
      },
      include: {
        student: true,
        term: true,
      },
    });

    return NextResponse.json({
      success: true,
      enrollment,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error adding student(s):', error);
    
    // Try to log the failed operation if we have session
    try {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await logCSVImport(
          session.user.id,
          "student_roster.csv",
          0, // Unknown count on error
          false,
          courseId,
          error.message,
          request
        );
      }
    } catch (logError) {
      console.error("Failed to log CSV import error:", logError);
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const courseId = params.id;
  const { searchParams } = new URL(request.url);
  const termId = searchParams.get('termId');

  try {
    const deleteCondition = {
      courseId,
      ...(termId ? { termId } : {}),
    };

    // Get all enrollments that will be deleted to track affected students
    const enrollmentsToDelete = await prisma.courseEnrollment.findMany({
      where: deleteCondition,
      select: { studentId: true }
    });

    const affectedStudentIds = Array.from(new Set(enrollmentsToDelete.map(e => e.studentId)));

    // Delete the enrollments
    await prisma.courseEnrollment.deleteMany({
      where: deleteCondition,
    });

    // Check each affected student and delete if they have no remaining relationships
    for (const studentId of affectedStudentIds) {
      const remainingEnrollments = await prisma.courseEnrollment.count({
        where: { studentId }
      });

      const remainingExamResults = await prisma.examResult.count({
        where: { studentId }
      });

      // If student has no remaining relationships, delete the student record
      if (remainingEnrollments === 0 && remainingExamResults === 0) {
        await prisma.student.delete({
          where: { id: studentId }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: termId
        ? `All students removed from course ${courseId} for term ${termId}`
        : `All students removed from course ${courseId}`,
    });
  } catch (error: any) {
    console.error('Error deleting students from course:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete students' },
      { status: 500 }
    );
  }
}
