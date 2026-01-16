import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../../../../lib/auth";
import { getUserAuditLogs } from "../../../../../../lib/auditLogger";

/**
 * GET /api/admin/users/[id]/audit-logs - Get audit logs for a specific user
 * 
 * This endpoint allows admins to view comprehensive audit trails for any user,
 * including login attempts, file uploads, and other system actions.
 * 
 * Security: Restricted to ADMIN role only
 * Supports pagination via limit/offset query parameters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const userId = params.id;
    
    // Get query parameters for pagination
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Validate pagination parameters
    if (limit < 1 || limit > 200) {
      return NextResponse.json(
        { error: "Limit must be between 1 and 200" },
        { status: 400 }
      );
    }

    if (offset < 0) {
      return NextResponse.json(
        { error: "Offset must be non-negative" },
        { status: 400 }
      );
    }

    // Fetch audit logs for the user
    const auditLogs = await getUserAuditLogs(userId, limit, offset);

    // Transform the response to include readable action descriptions
    const transformedLogs = auditLogs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userEmail: log.userEmail,
      action: log.action,
      actionDescription: getActionDescription(log.action),
      resource: log.resource,
      resourceId: log.resourceId,
      details: log.details ? JSON.parse(log.details) : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      success: log.success,
      errorMessage: log.errorMessage,
      createdAt: log.createdAt.toISOString(),
      user: log.user ? {
        id: log.user.id,
        name: log.user.name,
        email: log.user.email,
      } : null,
    }));

    return NextResponse.json({
      logs: transformedLogs,
      pagination: {
        limit,
        offset,
        hasMore: auditLogs.length === limit, // If we got exactly the limit, there might be more
      }
    });
  } catch (error) {
    console.error("Error fetching user audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Helper function to convert action codes to human-readable descriptions
 */
function getActionDescription(action: string): string {
  const descriptions: Record<string, string> = {
    'LOGIN_SUCCESS': 'Successful login',
    'LOGIN_FAILED': 'Failed login attempt',
    'LOGOUT': 'Logged out',
    'PASSWORD_RESET_REQUEST': 'Requested password reset',
    'PASSWORD_RESET_SUCCESS': 'Successfully reset password',
    'PASSWORD_CHANGE': 'Changed password',
    'EMAIL_CHANGE': 'Changed email address',
    'PROFILE_UPDATE': 'Updated profile',
    'TWO_FACTOR_ENABLED': 'Enabled two-factor authentication',
    'TWO_FACTOR_DISABLED': 'Disabled two-factor authentication',
    'FILE_UPLOAD_SUCCESS': 'Successfully uploaded file',
    'FILE_UPLOAD_FAILED': 'Failed to upload file',
    'CSV_IMPORT_SUCCESS': 'Successfully imported CSV file',
    'CSV_IMPORT_FAILED': 'Failed to import CSV file',
    'DOCX_IMPORT_SUCCESS': 'Successfully imported DOCX file',
    'DOCX_IMPORT_FAILED': 'Failed to import DOCX file',
    'USER_CREATED': 'Created user account',
    'USER_UPDATED': 'Updated user account',
    'USER_DELETED': 'Deleted user account',
    'ADMIN_ACTION': 'Performed admin action',
  };

  return descriptions[action] || action;
} 