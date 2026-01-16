import { NextResponse } from 'next/server';
import prisma from '../../../../../../lib/prisma';

export async function PUT(
  request: Request,
  { params }: { params: { courseId: string; studentId: string } }
) {
  const { courseId, studentId: studentRecordId } = params;
  const body = await request.json();
  const { name, studentId } = body;

  try {
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { studentId },
          { name },
        ],
        NOT: {
          id: studentRecordId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Student ID or Name already exists for another student." },
        { status: 400 }
      );
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentRecordId },
      data: {
        name,
        studentId,
      },
    });

    return NextResponse.json({ success: true, student: updatedStudent });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; studentId: string } }
) {
  const courseId = params.id;
  const studentId = params.studentId;

  const url = new URL(request.url);
  const termId = url.searchParams.get("termId");

  try {
    const whereClause: any = {
      courseId,
      studentId,
    };

    if (termId) {
      whereClause.termId = termId;
    }

    // Delete the enrollment(s)
    await prisma.courseEnrollment.deleteMany({
      where: whereClause,
    });

    // Check if the student has any remaining enrollments or exam results
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

    return NextResponse.json({ success: true, message: 'Student removed from this course and term' });
  } catch (error: any) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete student' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: Request,
  { params }: { params: { studentId: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.studentId },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}