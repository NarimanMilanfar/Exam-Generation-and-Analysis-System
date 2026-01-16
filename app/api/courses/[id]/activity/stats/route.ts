import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import { validateCourseAccess } from "../../../../../../lib/coursePermissions";
import { getCourseActivityStats } from "../../../../../../lib/activityLogger";

// GET /api/courses/[id]/activity/stats - Get activity statistics for a course
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has access to the course
    const { hasAccess, error } = await validateCourseAccess(params.id, 'view');
    if (!hasAccess) {
      return NextResponse.json({ error: error || "Access denied" }, { status: error === 'Unauthorized' ? 401 : 403 });
    }

    // Fetch activity statistics for the course
    const stats = await getCourseActivityStats(params.id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching course activity stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 