import prisma from './prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth';

export type CoursePermission = 'OWNER' | 'EDITOR' | 'VIEWER' | 'NONE';

export interface CourseAccess {
  hasAccess: boolean;
  permission: CoursePermission;
  isOwner: boolean;
  canEdit: boolean;
  canView: boolean;
  canShare: boolean;
}

/**
 * Get user's permission level for a course
 */
export async function getCoursePermission(courseId: string, userId: string): Promise<CourseAccess> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      collaborators: {
        where: { userId: userId }
      }
    }
  });

  if (!course) {
    return {
      hasAccess: false,
      permission: 'NONE',
      isOwner: false,
      canEdit: false,
      canView: false,
      canShare: false
    };
  }

  const isOwner = course.userId === userId;
  const collaboration = course.collaborators[0];

  let permission: CoursePermission = 'NONE';
  let hasAccess = false;
  let canEdit = false;
  let canView = false;
  let canShare = false;

  if (isOwner) {
    permission = 'OWNER';
    hasAccess = true;
    canEdit = true;
    canView = true;
    canShare = true;
  } else if (collaboration) {
    permission = collaboration.role as CoursePermission;
    hasAccess = true;
    canView = true;
    canEdit = collaboration.role === 'EDITOR';
    canShare = false; // Only owners can share
  }

  return {
    hasAccess,
    permission,
    isOwner,
    canEdit,
    canView,
    canShare
  };
}

/**
 * Check if user can access a course (owner or collaborator)
 */
export async function canAccessCourse(courseId: string, userId: string): Promise<boolean> {
  const access = await getCoursePermission(courseId, userId);
  return access.hasAccess;
}

/**
 * Check if user can edit a course (owner or editor)
 */
export async function canEditCourse(courseId: string, userId: string): Promise<boolean> {
  const access = await getCoursePermission(courseId, userId);
  return access.canEdit;
}

/**
 * Check if user can share a course (owner only)
 */
export async function canShareCourse(courseId: string, userId: string): Promise<boolean> {
  const access = await getCoursePermission(courseId, userId);
  return access.canShare;
}

/**
 * Get all courses a user has access to (owned or collaborated)
 */
export async function getUserAccessibleCourses(userId: string) {
  const [ownedCourses, collaboratedCourses] = await Promise.all([
    // Owned courses
    prisma.course.findMany({
      where: { userId: userId },
      include: {
        _count: {
          select: {
            exams: true,
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    // Collaborated courses
    prisma.course.findMany({
      where: {
        collaborators: {
          some: { userId: userId }
        }
      },
      include: {
        collaborators: {
          where: { userId: userId }
        },
        _count: {
          select: {
            exams: true,
            questions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  ]);

  // Transform owned courses
  const transformedOwnedCourses = ownedCourses.map((course) => ({
    id: course.id,
    name: course.name,
    description: course.description || "",
    color: course.color,
    examCount: course._count.exams,
    questionCount: course._count.questions,
    createdAt: course.createdAt.toISOString(),
    permission: 'OWNER' as CoursePermission,
    isOwner: true,
    canEdit: true,
    canView: true,
    canShare: true,
  }));

  // Transform collaborated courses
  const transformedCollaboratedCourses = collaboratedCourses.map((course) => {
    const collaboration = course.collaborators[0];
    const permission = collaboration?.role as CoursePermission;
    const canEdit = permission === 'EDITOR';
    
    return {
      id: course.id,
      name: course.name,
      description: course.description || "",
      color: course.color,
      examCount: course._count.exams,
      questionCount: course._count.questions,
      createdAt: course.createdAt.toISOString(),
      permission: permission,
      isOwner: false,
      canEdit: canEdit,
      canView: true,
      canShare: false,
    };
  });

  return [...transformedOwnedCourses, ...transformedCollaboratedCourses];
}

/**
 * Middleware helper to check course access in API routes
 */
export async function validateCourseAccess(
  courseId: string,
  requiredPermission: 'view' | 'edit' | 'share' = 'view'
): Promise<{ hasAccess: boolean; userId: string | null; error?: string }> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { hasAccess: false, userId: null, error: 'Unauthorized' };
  }

  const userId = session.user.id;
  const access = await getCoursePermission(courseId, userId);

  if (!access.hasAccess) {
    return { hasAccess: false, userId, error: 'Course not found or access denied' };
  }

  if (requiredPermission === 'edit' && !access.canEdit) {
    return { hasAccess: false, userId, error: 'Edit permission required' };
  }

  if (requiredPermission === 'share' && !access.canShare) {
    return { hasAccess: false, userId, error: 'Share permission required' };
  }

  return { hasAccess: true, userId };
} 