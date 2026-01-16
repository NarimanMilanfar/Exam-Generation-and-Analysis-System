import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../lib/auth";
import { validateCourseAccess } from "../../../../../lib/coursePermissions";
import { getCourseActivities } from "../../../../../lib/activityLogger";

/**
 * Activity API endpoint - Returns activity logs for course collaboration tracking
 * 
 * This endpoint powers the Activity tab in the course interface, showing what
 * actions users have performed (creating exams, adding questions, sharing course, etc.)
 * 
 * Security: Uses existing course permission system - only users with course access can view activities
 * Supports pagination via limit/offset query parameters
 */
// GET /api/courses/[id]/activity - Get activity logs for a course
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

    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch activities for the course
    const activities = await getCourseActivities(params.id, limit, offset);

    // Transform the response to match the expected format
    const transformedActivities = activities.map((activity) => ({
      id: activity.id,
      userId: activity.userId,
      courseId: activity.courseId,
      action: activity.action,
      resource: activity.resource,
      resourceId: activity.resourceId,
      details: activity.details,
      createdAt: activity.createdAt.toISOString(),
      user: {
        id: activity.user.id,
        name: activity.user.name,
        email: activity.user.email,
      },
    }));

    return NextResponse.json(transformedActivities);
  } catch (error) {
    console.error("Error fetching course activities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 