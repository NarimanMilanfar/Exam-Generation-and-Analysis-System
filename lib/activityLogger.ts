import prisma from './prisma';

// Interface for additional activity details (stored as JSON)
export interface ActivityDetails {
  [key: string]: any;
}

// All possible activity actions for type safety and consistency
export type ActivityAction = 
  | 'CREATED_COURSE'
  | 'UPDATED_COURSE'
  | 'DELETED_COURSE'
  | 'SHARED_COURSE'
  | 'ADDED_COLLABORATOR'
  | 'UPDATED_COLLABORATOR'
  | 'REMOVED_COLLABORATOR'
  | 'CREATED_EXAM'
  | 'UPDATED_EXAM'
  | 'DELETED_EXAM'
  | 'CREATED_QUESTION_BANK'
  | 'UPDATED_QUESTION_BANK'
  | 'DELETED_QUESTION_BANK'
  | 'CREATED_QUESTION'
  | 'UPDATED_QUESTION'
  | 'DELETED_QUESTION'
  | 'BULK_IMPORTED_QUESTIONS';

// Resource types that can have activities logged against them
export type ActivityResource = 
  | 'course'
  | 'exam'
  | 'question_bank'
  | 'question'
  | 'collaborator';

/**
 * Core activity logging function - records user actions for audit trail and collaboration tracking
 * 
 * This function is called from API routes whenever users perform important actions.
 * It's designed to be fault-tolerant - logging failures won't break the main functionality.
 * 
 * @param userId - ID of the user performing the action
 * @param courseId - ID of the course the action is performed on  
 * @param action - Type of action performed (from ActivityAction enum)
 * @param resource - Type of resource involved (optional)
 * @param resourceId - ID of the specific resource involved (optional)
 * @param details - Additional context about the action (optional, stored as JSON)
 */
export async function logActivity(
  userId: string,
  courseId: string,
  action: ActivityAction,
  resource?: ActivityResource,
  resourceId?: string,
  details?: ActivityDetails
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        courseId,
        action,
        resource,
        resourceId,
        details: details ? JSON.stringify(details) : null,
      },
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
    // IMPORTANT: Don't throw errors - activity logging should never break core functionality
    // This ensures the main operation (creating exam, adding question, etc.) still succeeds
  }
}

/**
 * Get activities for a specific course
 * @param courseId - ID of the course
 * @param limit - Maximum number of activities to return (default: 50)
 * @param offset - Number of activities to skip (default: 0)
 * @returns Promise<ActivityLog[]>
 */
export async function getCourseActivities(
  courseId: string,
  limit: number = 50,
  offset: number = 0
) {
  return await prisma.activityLog.findMany({
    where: {
      courseId,
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
}

/**
 * Get activity statistics for a course
 * @param courseId - ID of the course
 * @returns Promise<object> - Statistics object
 */
export async function getCourseActivityStats(courseId: string) {
  const [totalActivities, recentActivities, topUsers] = await Promise.all([
    // Total activities count
    prisma.activityLog.count({
      where: { courseId },
    }),
    
    // Recent activities (last 7 days)
    prisma.activityLog.count({
      where: {
        courseId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
      },
    }),
    
    // Top active users
    prisma.activityLog.groupBy({
      by: ['userId'],
      where: { courseId },
      _count: {
        userId: true,
      },
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 5,
    }),
  ]);

  return {
    totalActivities,
    recentActivities,
    topUsers,
  };
} 