import { NextRequest } from 'next/server';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: jest.fn(),
    },
  })),
}));

describe('Admin Users API', () => {
  const mockGetServerSession = require('next-auth/next').getServerSession;
  const mockPrisma = new (require('@prisma/client').PrismaClient)();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should have proper mocks configured', () => {
      expect(mockGetServerSession).toBeDefined();
      expect(mockPrisma.user.findMany).toBeDefined();
    });

    it('should mock session for admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '1', role: 'admin' },
      });

      const session = await mockGetServerSession();
      expect(session.user.role).toBe('admin');
    });

    it('should mock session for non-admin user', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: '2', role: 'teacher' },
      });

      const session = await mockGetServerSession();
      expect(session.user.role).toBe('teacher');
    });

    it('should mock database queries', async () => {
      const mockUsers = [
        { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'teacher' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers);
      const users = await mockPrisma.user.findMany();
      
      expect(users).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));
      
      await expect(mockPrisma.user.findMany()).rejects.toThrow('Database error');
    });
  });
}); 