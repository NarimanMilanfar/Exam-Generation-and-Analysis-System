import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../lib/auth";
import prisma from "../../../lib/prisma";

// GET /api/terms - Get all terms
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const terms = await prisma.term.findMany({
      orderBy: [{ year: "desc" }, { term: "asc" }],
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
