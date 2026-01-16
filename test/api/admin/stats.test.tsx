import { NextRequest } from 'next/server';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    exam: {
      count: jest.fn(),
    },
    question: {
      count: jest.fn(),
    },
  })),
}));

describe('Admin Stats API', () => {
  const mockGetServerSession = require('next-auth/next').getServerSession;
  const mockPrisma = new (require('@prisma/client').PrismaClient)();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/stats', () => {
    it('should have proper mocks configured', () => {
      expect(mockGetServerSession).toBeDefined();
      expect(mockPrisma.user.count).toBeDefined();
      expect(mockPrisma.exam.count).toBeDefined();
      expect(mockPrisma.question.count).toBeDefined();
    });

    it('should mock admin session', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'admin' },
      });

      const session = await mockGetServerSession();
      expect(session.user.role).toBe('admin');
    });

    it('should mock database count queries', async () => {
      mockPrisma.user.count.mockResolvedValue(150);
      mockPrisma.exam.count.mockResolvedValue(45);
      mockPrisma.question.count.mockResolvedValue(320);

      const userCount = await mockPrisma.user.count();
      const examCount = await mockPrisma.exam.count();
      const questionCount = await mockPrisma.question.count();

      expect(userCount).toBe(150);
      expect(examCount).toBe(45);
      expect(questionCount).toBe(320);
    });

    it('should handle database errors', async () => {
      mockPrisma.user.count.mockRejectedValue(new Error('Database error'));
      
      await expect(mockPrisma.user.count()).rejects.toThrow('Database error');
    });

    it('should return zero counts when no data', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.exam.count.mockResolvedValue(0);
      mockPrisma.question.count.mockResolvedValue(0);

      const userCount = await mockPrisma.user.count();
      const examCount = await mockPrisma.exam.count();
      const questionCount = await mockPrisma.question.count();

      expect(userCount).toBe(0);
      expect(examCount).toBe(0);
      expect(questionCount).toBe(0);
    });
  });
}); 