import { getCoursePermission, validateCourseAccess } from '../../lib/coursePermissions';

// Mock prisma client
jest.mock('../../lib/prisma', () => ({
  __esModule: true,
  default: {
    course: {
      findUnique: jest.fn(),
    },
    courseCollaborator: {
      findMany: jest.fn(),
    },
  }
}));

// Mock getServerSession
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

const { getServerSession } = require('next-auth/next');
const prisma = require('../../lib/prisma').default;

describe('Course Permissions Integration Tests', () => {
  const mockCourseId = 'test-course-id';
  const ownerUserId = 'owner-user-id';
  const editorUserId = 'editor-user-id';
  const viewerUserId = 'viewer-user-id';
  const randomUserId = 'random-user-id';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup course data with proper collaborator structure
    prisma.course.findUnique.mockImplementation(({ include, where }) => {
      if (include?.collaborators) {
        // When including collaborators, return based on the user filter
        const collaboratorFilter = include.collaborators.where;
        if (collaboratorFilter?.userId === editorUserId) {
          return Promise.resolve({
            id: mockCourseId,
            name: 'Test Course',
            userId: ownerUserId,
            collaborators: [{ id: 'collab-1', role: 'EDITOR', userId: editorUserId }]
          });
        }
        if (collaboratorFilter?.userId === viewerUserId) {
          return Promise.resolve({
            id: mockCourseId,
            name: 'Test Course',
            userId: ownerUserId,
            collaborators: [{ id: 'collab-2', role: 'VIEWER', userId: viewerUserId }]
          });
        }
        // For owner or others, return empty collaborators
        return Promise.resolve({
          id: mockCourseId,
          name: 'Test Course',
          userId: ownerUserId,
          collaborators: []
        });
      }
      // Normal course lookup without collaborators
      return Promise.resolve({
        id: mockCourseId,
        name: 'Test Course',
        userId: ownerUserId
      });
    });
  });

  describe('getCoursePermission', () => {
    it('should grant owner full permissions', async () => {
      const result = await getCoursePermission(mockCourseId, ownerUserId);

      expect(result.hasAccess).toBe(true);
      expect(result.permission).toBe('OWNER');
      expect(result.isOwner).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.canView).toBe(true);
      expect(result.canShare).toBe(true);
    });

    it('should grant editor edit but not share permissions', async () => {
      const result = await getCoursePermission(mockCourseId, editorUserId);

      expect(result.hasAccess).toBe(true);
      expect(result.permission).toBe('EDITOR');
      expect(result.isOwner).toBe(false);
      expect(result.canEdit).toBe(true);
      expect(result.canView).toBe(true);
      expect(result.canShare).toBe(false);
    });

    it('should grant viewer only view permissions', async () => {
      const result = await getCoursePermission(mockCourseId, viewerUserId);

      expect(result.hasAccess).toBe(true);
      expect(result.permission).toBe('VIEWER');
      expect(result.isOwner).toBe(false);
      expect(result.canEdit).toBe(false);
      expect(result.canView).toBe(true);
      expect(result.canShare).toBe(false);
    });

    it('should deny access to non-collaborator', async () => {
      const result = await getCoursePermission(mockCourseId, randomUserId);

      expect(result.hasAccess).toBe(false);
      expect(result.permission).toBe('NONE');
      expect(result.isOwner).toBe(false);
      expect(result.canEdit).toBe(false);
      expect(result.canView).toBe(false);
      expect(result.canShare).toBe(false);
    });

    it('should handle non-existent course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      const result = await getCoursePermission('non-existent-course', ownerUserId);

      expect(result.hasAccess).toBe(false);
      expect(result.permission).toBe('NONE');
    });
  });

  describe('validateCourseAccess with session', () => {
    it('should validate owner access', async () => {
      getServerSession.mockResolvedValue({
        user: { id: ownerUserId, email: 'owner@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId);

      expect(result.hasAccess).toBe(true);
      expect(result.userId).toBe(ownerUserId);
      expect(result.error).toBeUndefined();
    });

    it('should validate editor access for view', async () => {
      getServerSession.mockResolvedValue({
        user: { id: editorUserId, email: 'editor@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId, 'view');

      expect(result.hasAccess).toBe(true);
      expect(result.userId).toBe(editorUserId);
    });

    it('should validate editor access for edit', async () => {
      getServerSession.mockResolvedValue({
        user: { id: editorUserId, email: 'editor@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId, 'edit');

      expect(result.hasAccess).toBe(true);
      expect(result.userId).toBe(editorUserId);
    });

    it('should deny editor access for share', async () => {
      getServerSession.mockResolvedValue({
        user: { id: editorUserId, email: 'editor@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId, 'share');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Share permission required');
    });

    it('should deny viewer edit access', async () => {
      getServerSession.mockResolvedValue({
        user: { id: viewerUserId, email: 'viewer@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId, 'edit');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Edit permission required');
    });

    it('should allow viewer view access', async () => {
      getServerSession.mockResolvedValue({
        user: { id: viewerUserId, email: 'viewer@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId, 'view');

      expect(result.hasAccess).toBe(true);
      expect(result.userId).toBe(viewerUserId);
    });

    it('should deny access without session', async () => {
      getServerSession.mockResolvedValue(null);

      const result = await validateCourseAccess(mockCourseId);

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Unauthorized');
    });

    it('should deny access to non-collaborator', async () => {
      getServerSession.mockResolvedValue({
        user: { id: randomUserId, email: 'random@test.com' }
      });

      const result = await validateCourseAccess(mockCourseId);

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Course not found or access denied');
    });
  });

  describe('Role-based scenarios', () => {
    it('should enforce editor privileges correctly', async () => {
      // Editor can view and edit but not share
      const editorPermissions = await getCoursePermission(mockCourseId, editorUserId);
      
      expect(editorPermissions.canView).toBe(true);
      expect(editorPermissions.canEdit).toBe(true);
      expect(editorPermissions.canShare).toBe(false);
    });

    it('should enforce viewer restrictions correctly', async () => {
      // Viewer can only view
      const viewerPermissions = await getCoursePermission(mockCourseId, viewerUserId);
      
      expect(viewerPermissions.canView).toBe(true);
      expect(viewerPermissions.canEdit).toBe(false);
      expect(viewerPermissions.canShare).toBe(false);
    });

    it('should maintain owner supremacy', async () => {
      // Owner has all permissions
      const ownerPermissions = await getCoursePermission(mockCourseId, ownerUserId);
      
      expect(ownerPermissions.canView).toBe(true);
      expect(ownerPermissions.canEdit).toBe(true);
      expect(ownerPermissions.canShare).toBe(true);
      expect(ownerPermissions.isOwner).toBe(true);
    });
  });

  describe('Permission consistency', () => {
    it('should have consistent permission hierarchy', async () => {
      const ownerPerms = await getCoursePermission(mockCourseId, ownerUserId);
      const editorPerms = await getCoursePermission(mockCourseId, editorUserId);
      const viewerPerms = await getCoursePermission(mockCourseId, viewerUserId);

      // Owner > Editor > Viewer in terms of permissions
      expect(ownerPerms.canShare).toBe(true);
      expect(editorPerms.canShare).toBe(false);
      expect(viewerPerms.canShare).toBe(false);

      expect(ownerPerms.canEdit).toBe(true);
      expect(editorPerms.canEdit).toBe(true);
      expect(viewerPerms.canEdit).toBe(false);

      expect(ownerPerms.canView).toBe(true);
      expect(editorPerms.canView).toBe(true);
      expect(viewerPerms.canView).toBe(true);
    });
  });
}); 