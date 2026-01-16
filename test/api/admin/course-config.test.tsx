import { NextRequest } from 'next/server';

// Mock next-auth completely to avoid jose module issues
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options
jest.mock('../../../lib/auth', () => ({
  authOptions: {},
}));

jest.mock('../../../lib/prisma', () => ({
  course: {
    findUnique: jest.fn(),
  },
  courseConfig: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}));

// Import after mocks
const { POST, GET } = require('../../../app/api/admin/courses/[id]/config/route');
const { getServerSession } = require('next-auth/next');
const prisma = require('../../../lib/prisma');

const mockGetServerSession = getServerSession as jest.MockedFunction<any>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('/api/admin/courses/[id]/config', () => {
  const mockAdminSession = {
    user: { id: 'admin-id', role: 'ADMIN', email: 'admin@test.com' }
  };

  const mockCourse = {
    id: 'course-1',
    name: 'Test Course',
    description: 'Test Description',
    userId: 'user-1',
  };

  const mockCourseConfig = {
    id: 'config-1',
    courseId: 'course-1',
    defaultQuestionCount: 25,
    defaultFormat: 'MCQ',
    weightPerQuestion: 1.5,
    negativeMarking: true,
    allowInstructorOverride: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return course config when it exists', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse as any);
      mockPrisma.courseConfig.findUnique.mockResolvedValue(mockCourseConfig as any);

      const request = new NextRequest('http://localhost/api/admin/courses/course-1/config');
      const params = { id: 'course-1' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config.defaultQuestionCount).toBe(25);
      expect(data.config.defaultFormat).toBe('MCQ');
      expect(data.config.weightPerQuestion).toBe(1.5);
      expect(data.config.negativeMarking).toBe(true);
      expect(data.config.allowInstructorOverride).toBe(false);
    });

    it('should return default config when no config exists', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse as any);
      mockPrisma.courseConfig.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/courses/course-1/config');
      const params = { id: 'course-1' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config.defaultQuestionCount).toBe(20);
      expect(data.config.defaultFormat).toBe('MCQ');
      expect(data.config.weightPerQuestion).toBe(1.0);
      expect(data.config.negativeMarking).toBe(false);
      expect(data.config.allowInstructorOverride).toBe(true);
    });

    it('should return 404 when course does not exist', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.course.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/courses/invalid-id/config');
      const params = { id: 'invalid-id' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Course not found');
    });

    it('should return 403 for non-admin users', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-id', role: 'TEACHER', email: 'teacher@test.com' }
      });

      const request = new NextRequest('http://localhost/api/admin/courses/course-1/config');
      const params = { id: 'course-1' };

      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized. Admin access required.');
    });
  });

  describe('POST', () => {
    it('should create new course config successfully', async () => {
      const configData = {
        defaultQuestionCount: 30,
        defaultFormat: 'Mixed',
        weightPerQuestion: 2.0,
        negativeMarking: true,
        allowInstructorOverride: false,
      };

      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.course.findUnique.mockResolvedValue(mockCourse as any);
      mockPrisma.courseConfig.upsert.mockResolvedValue({
        ...mockCourseConfig,
        ...configData,
      } as any);

      const request = new NextRequest('http://localhost/api/admin/courses/course-1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { id: 'course-1' };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.config.defaultQuestionCount).toBe(30);
      expect(data.config.defaultFormat).toBe('Mixed');
      expect(data.config.weightPerQuestion).toBe(2.0);
      expect(data.config.negativeMarking).toBe(true);
      expect(data.config.allowInstructorOverride).toBe(false);

      expect(mockPrisma.courseConfig.upsert).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        update: configData,
        create: { courseId: 'course-1', ...configData },
      });
    });

    it('should return 400 for invalid config data', async () => {
      const invalidConfigData = {
        defaultQuestionCount: 'invalid', // should be number
        defaultFormat: 'InvalidFormat', // should be MCQ, TrueFalse, or Mixed
        weightPerQuestion: 2.0,
        negativeMarking: true,
        allowInstructorOverride: false,
      };

      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest('http://localhost/api/admin/courses/course-1/config', {
        method: 'POST',
        body: JSON.stringify(invalidConfigData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { id: 'course-1' };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid config format');
    });

    it('should return 404 when course does not exist', async () => {
      const configData = {
        defaultQuestionCount: 30,
        defaultFormat: 'Mixed',
        weightPerQuestion: 2.0,
        negativeMarking: true,
        allowInstructorOverride: false,
      };

      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrisma.course.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/courses/invalid-id/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { id: 'invalid-id' };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Course not found');
    });

    it('should return 403 for non-admin users', async () => {
      const configData = {
        defaultQuestionCount: 30,
        defaultFormat: 'Mixed',
        weightPerQuestion: 2.0,
        negativeMarking: true,
        allowInstructorOverride: false,
      };

      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-id', role: 'TEACHER', email: 'teacher@test.com' }
      });

      const request = new NextRequest('http://localhost/api/admin/courses/course-1/config', {
        method: 'POST',
        body: JSON.stringify(configData),
        headers: { 'Content-Type': 'application/json' },
      });
      const params = { id: 'course-1' };

      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized. Admin access required.');
    });
  });
});