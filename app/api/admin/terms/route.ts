import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../lib/auth";
import prisma from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const terms = await prisma.term.findMany({
      include: {
        _count: {
          select: {
            courses: true,
            enrollments: true,
            exams: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { term: "desc" }],
    });

    return NextResponse.json(terms);
  } catch (error) {
    console.error("Error fetching terms:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { term, year } = await request.json();

    if (!term || !year) {
      return NextResponse.json(
        { error: "Term and year are required" },
        { status: 400 }
      );
    }

    // Check if term already exists
    const existingTerm = await prisma.term.findUnique({
      where: { term_year: { term, year: parseInt(year) } },
    });

    if (existingTerm) {
      return NextResponse.json(
        { error: "Term already exists" },
        { status: 400 }
      );
    }

    const newTerm = await prisma.term.create({
      data: {
        term,
        year: parseInt(year),
      },
      include: {
        _count: {
          select: {
            courses: true,
            enrollments: true,
            exams: true,
          },
        },
      },
    });

    return NextResponse.json(newTerm, { status: 201 });
  } catch (error) {
    console.error("Error creating term:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}