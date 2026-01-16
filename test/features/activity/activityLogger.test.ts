/**
 * Activity Logger Backend Tests
 * 
 * Tests the core activity logging functionality with mocked database calls.
 * These tests verify the logging, retrieval, and statistics functions work correctly.
 */

import { logActivity, getCourseActivities, getCourseActivityStats, ActivityAction, ActivityResource } from '../../../lib/activityLogger';

// Mock the Prisma client
jest.mock('../../../lib/prisma', () => ({
  __esModule: true,
  default: {
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    course: {
      create: jest.fn(),
      delete: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

// Get the mocked prisma client
const prisma = require('../../../lib/prisma').default;

describe('Activity Logger Backend Tests', () => {
  const testUserId = 'test-user-123';
  const testCourseId = 'test-course-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logActivity', () => {
    it('should log a basic activity without details', async () => {
      prisma.activityLog.create.mockResolvedValue({
        id: 'activity-1',
        userId: testUserId,
        courseId: testCourseId,
        action: 'CREATED_COURSE',
        resource: null,
        resourceId: null,
        details: null,
        createdAt: new Date(),
      });

      await logActivity(testUserId, testCourseId, 'CREATED_COURSE');

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          courseId: testCourseId,
          action: 'CREATED_COURSE',
          resource: undefined,
          resourceId: undefined,
          details: null,
        },
      });
    });

    it('should log activity with resource and details', async () => {
      const details = { name: 'Test Exam', totalPoints: 100 };
      
      prisma.activityLog.create.mockResolvedValue({
        id: 'activity-2',
        userId: testUserId,
        courseId: testCourseId,
        action: 'CREATED_EXAM',
        resource: 'exam',
        resourceId: 'exam-123',
        details: JSON.stringify(details),
        createdAt: new Date(),
      });

      await logActivity(testUserId, testCourseId, 'CREATED_EXAM', 'exam', 'exam-123', details);

      expect(prisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          userId: testUserId,
          courseId: testCourseId,
          action: 'CREATED_EXAM',
          resource: 'exam',
          resourceId: 'exam-123',
          details: JSON.stringify(details),
        },
      });
    });

    it('should handle logging failures gracefully', async () => {
      prisma.activityLog.create.mockRejectedValue(new Error('Database error'));

      // This should not throw even with database error
      await expect(
        logActivity(testUserId, testCourseId, 'CREATED_COURSE')
      ).resolves.not.toThrow();

      expect(prisma.activityLog.create).toHaveBeenCalled();
    });

    it('should log multiple activities in sequence', async () => {
      const activities = [
        { action: 'CREATED_COURSE' as ActivityAction },
        { action: 'CREATED_EXAM' as ActivityAction, resource: 'exam' as ActivityResource, resourceId: 'exam-1' },
        { action: 'CREATED_QUESTION' as ActivityAction, resource: 'question' as ActivityResource, resourceId: 'q-1' },
      ];

      prisma.activityLog.create.mockResolvedValue({
        id: 'activity-id',
        userId: testUserId,
        courseId: testCourseId,
        action: 'CREATED_COURSE',
        resource: null,
        resourceId: null,
        details: null,
        createdAt: new Date(),
      });

      for (const activity of activities) {
        await logActivity(
          testUserId,
          testCourseId,
          activity.action,
          activity.resource,
          activity.resourceId
        );
      }

      expect(prisma.activityLog.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('getCourseActivities', () => {
    const mockActivities = [
      {
        id: 'activity-1',
        userId: testUserId,
        courseId: testCourseId,
        action: 'CREATED_EXAM',
        resource: 'exam',
        resourceId: 'exam-1',
        details: JSON.stringify({ name: 'Test Exam' }),
        createdAt: new Date('2024-01-15T10:30:00Z'),
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      },
      {
        id: 'activity-2',
        userId: testUserId,
        courseId: testCourseId,
        action: 'CREATED_QUESTION',
        resource: 'question',
        resourceId: 'q-1',
        details: JSON.stringify({ text: 'What is 2+2?' }),
        createdAt: new Date('2024-01-14T14:45:00Z'),
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      },
    ];

    it('should get all activities for a course', async () => {
      prisma.activityLog.findMany.mockResolvedValue(mockActivities);

      const activities = await getCourseActivities(testCourseId);

      expect(activities).toHaveLength(2);
      expect(activities[0].user).toBeDefined();
      expect(activities[0].user.name).toBe('Test User');
      expect(activities[0].courseId).toBe(testCourseId);
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { courseId: testCourseId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should respect limit parameter', async () => {
      prisma.activityLog.findMany.mockResolvedValue(mockActivities.slice(0, 1));

      const activities = await getCourseActivities(testCourseId, 1);

      expect(activities).toHaveLength(1);
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { courseId: testCourseId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
        skip: 0,
      });
    });

    it('should respect offset parameter', async () => {
      prisma.activityLog.findMany.mockResolvedValue(mockActivities.slice(1));

      const activities = await getCourseActivities(testCourseId, 50, 1);

      expect(activities).toHaveLength(1);
      expect(prisma.activityLog.findMany).toHaveBeenCalledWith({
        where: { courseId: testCourseId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 1,
      });
    });

    it('should return activities in correct format', async () => {
      prisma.activityLog.findMany.mockResolvedValue(mockActivities);

      const activities = await getCourseActivities(testCourseId);

      expect(activities[0]).toEqual({
        id: 'activity-1',
        userId: testUserId,
        courseId: testCourseId,
        action: 'CREATED_EXAM',
        resource: 'exam',
        resourceId: 'exam-1',
        details: JSON.stringify({ name: 'Test Exam' }),
        createdAt: new Date('2024-01-15T10:30:00Z'),
        user: {
          id: testUserId,
          name: 'Test User',
          email: 'test@example.com',
        },
      });
    });
  });

  describe('getCourseActivityStats', () => {
    it('should return correct activity statistics', async () => {
      const mockStats = {
        totalActivities: 15,
        recentActivities: 8,
        topUsers: [
          { userId: testUserId, _count: { userId: 10 } },
          { userId: 'user-2', _count: { userId: 5 } },
        ],
      };

      // Mock the Promise.all results
      prisma.activityLog.count
        .mockResolvedValueOnce(15) // totalActivities
        .mockResolvedValueOnce(8); // recentActivities

      prisma.activityLog.groupBy.mockResolvedValue([
        { userId: testUserId, _count: { userId: 10 } },
        { userId: 'user-2', _count: { userId: 5 } },
      ]);

      const stats = await getCourseActivityStats(testCourseId);

      expect(stats.totalActivities).toBe(15);
      expect(stats.recentActivities).toBe(8);
      expect(stats.topUsers).toHaveLength(2);
      expect(stats.topUsers[0].userId).toBe(testUserId);
      expect(stats.topUsers[0]._count.userId).toBe(10);
    });

    it('should handle course with no activities', async () => {
      prisma.activityLog.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      prisma.activityLog.groupBy.mockResolvedValue([]);

      const stats = await getCourseActivityStats(testCourseId);

      expect(stats.totalActivities).toBe(0);
      expect(stats.recentActivities).toBe(0);
      expect(stats.topUsers).toHaveLength(0);
    });

    it('should limit top users to 5', async () => {
      const mockTopUsers = Array.from({ length: 7 }, (_, i) => ({
        userId: `user-${i}`,
        _count: { userId: 7 - i },
      }));

      prisma.activityLog.count
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10);

      prisma.activityLog.groupBy.mockResolvedValue(mockTopUsers);

      const stats = await getCourseActivityStats(testCourseId);

      expect(stats.topUsers).toHaveLength(7); // groupBy returns all, but function should limit to 5
      expect(prisma.activityLog.groupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: { courseId: testCourseId },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      });
    });
  });
}); 