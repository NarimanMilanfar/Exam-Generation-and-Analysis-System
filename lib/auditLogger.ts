import prisma from "./prisma";

// All possible audit actions for type safety and consistency
export type AuditAction = 
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_CHANGE'
  | 'EMAIL_CHANGE'
  | 'PROFILE_UPDATE'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'FILE_UPLOAD_SUCCESS'
  | 'FILE_UPLOAD_FAILED'
  | 'CSV_IMPORT_SUCCESS'
  | 'CSV_IMPORT_FAILED'
  | 'DOCX_IMPORT_SUCCESS'
  | 'DOCX_IMPORT_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'ADMIN_ACTION';

// Type for additional audit details
export type AuditDetails = {
  fileName?: string;
  fileSize?: number;
  recordCount?: number;
  errorDetails?: string;
  deviceInfo?: string;
  location?: string;
  [key: string]: any;
};

/**
 * Core audit logging function - records system-wide user actions for admin audit trails
 * 
 * This function logs global actions that aren't tied to specific courses,
 * including login attempts, file uploads, and administrative actions.
 * It's designed to be fault-tolerant - logging failures won't break core functionality.
 * 
 * @param userId - ID of the user performing the action (null for failed logins)
 * @param userEmail - Email for tracking failed login attempts when user doesn't exist
 * @param action - Type of action performed (from AuditAction enum)
 * @param resource - Type of resource involved (optional)
 * @param resourceId - ID of the specific resource involved (optional)
 * @param details - Additional context about the action (optional, stored as JSON)
 * @param ipAddress - IP address for security tracking (optional)
 * @param userAgent - User agent for device tracking (optional)
 * @param success - Whether the action was successful (default true)
 * @param errorMessage - Error message for failed actions (optional)
 */
export async function logAudit(
  userId: string | null,
  userEmail: string | null,
  action: AuditAction,
  resource?: string | null,
  resourceId?: string | null,
  details?: AuditDetails,
  ipAddress?: string | null,
  userAgent?: string | null,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        userEmail,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null,
        ipAddress,
        userAgent,
        success,
        errorMessage,
      },
    });
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // IMPORTANT: Don't throw errors - audit logging should never break core functionality
    // This ensures the main operation (login, file upload, etc.) still succeeds
  }
}

/**
 * Helper function to extract IP address and user agent from NextRequest
 * 
 * @param request - NextRequest object
 * @returns Object containing ipAddress and userAgent
 */
export function extractRequestInfo(request: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress = 
    // Check for forwarded IP (common in production with reverse proxies)
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    // For development/direct connections
    request.headers.get('remote-addr') ||
    null;

  const userAgent = request.headers.get('user-agent') || null;

  return { ipAddress, userAgent };
}

/**
 * Log successful login attempt
 */
export async function logLoginSuccess(
  userId: string,
  userEmail: string,
  request?: Request,
  details?: AuditDetails
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : { ipAddress: null, userAgent: null };
  
  await logAudit(
    userId,
    userEmail,
    'LOGIN_SUCCESS',
    'user_auth',
    userId,
    details,
    requestInfo.ipAddress,
    requestInfo.userAgent,
    true
  );
}

/**
 * Log failed login attempt
 */
export async function logLoginFailure(
  userEmail: string,
  reason: string,
  request?: Request,
  details?: AuditDetails
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : { ipAddress: null, userAgent: null };
  
  await logAudit(
    null, // No userId for failed login
    userEmail,
    'LOGIN_FAILED',
    'user_auth',
    null,
    { reason, ...details },
    requestInfo.ipAddress,
    requestInfo.userAgent,
    false,
    reason
  );
}

/**
 * Log file upload attempts
 */
export async function logFileUpload(
  userId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  success: boolean,
  resourceId?: string,
  errorMessage?: string,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : { ipAddress: null, userAgent: null };
  
  const action: AuditAction = success 
    ? (fileType.includes('docx') ? 'DOCX_IMPORT_SUCCESS' : 'FILE_UPLOAD_SUCCESS')
    : (fileType.includes('docx') ? 'DOCX_IMPORT_FAILED' : 'FILE_UPLOAD_FAILED');

  await logAudit(
    userId,
    null,
    action,
    'file',
    resourceId,
    {
      fileName,
      fileSize,
      fileType,
      errorDetails: errorMessage,
    },
    requestInfo.ipAddress,
    requestInfo.userAgent,
    success,
    errorMessage
  );
}

/**
 * Log CSV import attempts
 */
export async function logCSVImport(
  userId: string,
  fileName: string,
  recordCount: number,
  success: boolean,
  resourceId?: string,
  errorMessage?: string,
  request?: Request
): Promise<void> {
  const requestInfo = request ? extractRequestInfo(request) : { ipAddress: null, userAgent: null };
  
  const action: AuditAction = success ? 'CSV_IMPORT_SUCCESS' : 'CSV_IMPORT_FAILED';

  await logAudit(
    userId,
    null,
    action,
    'csv_file',
    resourceId,
    {
      fileName,
      recordCount,
      errorDetails: errorMessage,
    },
    requestInfo.ipAddress,
    requestInfo.userAgent,
    success,
    errorMessage
  );
}

/**
 * Get audit logs for a specific user (for admin viewing)
 * 
 * @param userId - ID of the user to get audit logs for
 * @param limit - Maximum number of logs to return (default 50)
 * @param offset - Number of logs to skip for pagination (default 0)
 * @returns Array of audit log entries with user information
 */
export async function getUserAuditLogs(
  userId: string, 
  limit: number = 50, 
  offset: number = 0
) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        OR: [
          { userId: userId },
          { userEmail: { in: await getUserEmails(userId) } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return logs;
  } catch (error) {
    console.error('Failed to fetch user audit logs:', error);
    return [];
  }
}

/**
 * Helper function to get all email addresses associated with a user
 * (in case user changed email, we want to capture all their activity)
 */
async function getUserEmails(userId: string): Promise<string[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    
    // For now, just return current email
    // In the future, could track email history if needed
    return user ? [user.email] : [];
  } catch (error) {
    console.error('Failed to fetch user emails:', error);
    return [];
  }
} 