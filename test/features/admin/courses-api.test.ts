/**
 * @jest-environment jsdom
 */
import { NextRequest } from "next/server";
// Mock all dependencies
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("../../../lib/prisma", () => ({
  __esModule: true,
  default: {
    course: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    courseEnrollment: {
      aggregate: jest.fn(),
    },
    term: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("../../../lib/auth", () => ({
  authOptions: {},
}));

// Dynamic imports to avoid ESM issues
let GET: any, POST: any, GetCourse: any, PUT: any, DELETE: any, GetAnalytics: any;
let getServerSession: any, prisma: any;

// Mock session data
const mockAdminSession = {
  user: {
    id: "admin-id",
    email: "admin@test.com",
    role: "ADMIN",
  },
};

const mockTeacherSession = {
  user: {
    id: "teacher-id",
    email: "teacher@test.com",
    role: "TEACHER",
  },
};

// Mock course data
const mockCourse = {
  id: "course-1",
  name: "COSC 499",
  description: "Test Course",
  color: "#10b981",
  section: "001",
  createdAt: new Date(),
  updatedAt: new Date(),
  user: {
    id: "teacher-id",
    name: "Test Teacher",
    email: "teacher@test.com",
    role: "TEACHER",
  },
  term: {
    id: "term-1",
    term: "Fall",
    year: 2023,
  },
  collaborators: [],
  _count: {
    exams: 2,
    questions: 10,
    enrollments: 25,
  },
};

const mockInstructor = {
  id: "teacher-id",
  name: "Test Teacher",
  email: "teacher@test.com",
  role: "TEACHER",
};

describe("/api/admin/courses", () => {
  beforeAll(async () => {
    // Import modules after mocks are set up
    const coursesRoute = await import("../../../app/api/admin/courses/route");
    const courseRoute = await import("../../../app/api/admin/courses/[id]/route");
    const analyticsRoute = await import("../../../app/api/admin/courses/analytics/route");
    const nextAuth = await import("next-auth/next");
    const prismaModule = await import("../../../lib/prisma");

    GET = coursesRoute.GET;
    POST = coursesRoute.POST;
    GetCourse = courseRoute.GET;
    PUT = courseRoute.PUT;
    DELETE = courseRoute.DELETE;
    GetAnalytics = analyticsRoute.GET;
    getServerSession = nextAuth.getServerSession;
    prisma = prismaModule.default;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return courses for admin users", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.course.findMany.mockResolvedValue([mockCourse]);
      prisma.course.count.mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/admin/courses");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.courses).toHaveLength(1);
      expect(data.courses[0].name).toBe("COSC 499");
      expect(data.pagination.totalCount).toBe(1);
    });

    it("should return 401 for non-admin users", async () => {
      getServerSession.mockResolvedValue(mockTeacherSession);

      const request = new NextRequest("http://localhost:3000/api/admin/courses");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should return 401 for unauthenticated users", async () => {
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/courses");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should apply search filters", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.course.findMany.mockResolvedValue([]);
      prisma.course.count.mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/admin/courses?search=COSC&termId=term-1");
      await GET(request);

      expect(prisma.course.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            termId: "term-1",
          }),
        })
      );
    });
  });

  describe("POST", () => {
    it("should create a course with valid data", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue(mockInstructor);
      prisma.course.create.mockResolvedValue(mockCourse);

      const request = new NextRequest("http://localhost:3000/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "COSC 499",
          description: "Test Course",
          color: "#10b981",
          termId: "term-1",
          section: "001",
          userId: "teacher-id",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("COSC 499");
      expect(prisma.course.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "COSC 499",
            userId: "teacher-id",
          }),
        })
      );
    });

    it("should return 400 for missing required fields", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);

      const request = new NextRequest("http://localhost:3000/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("required");
    });

    it("should return 400 for invalid instructor", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "COSC 499",
          userId: "invalid-id",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Invalid instructor");
    });
  });
});

describe("/api/admin/courses/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return course details for admin", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.course.findUnique.mockResolvedValue({
        ...mockCourse,
        enrollments: [],
        exams: [],
      });

      const request = new NextRequest("http://localhost:3000/api/admin/courses/course-1");
      const response = await GetCourse(request, { params: { id: "course-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toBe("course-1");
      expect(data.name).toBe("COSC 499");
    });

    it("should return 404 for non-existent course", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.course.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/courses/invalid-id");
      const response = await GetCourse(request, { params: { id: "invalid-id" } });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT", () => {
    it("should update course successfully", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.course.update.mockResolvedValue(mockCourse);

      const request = new NextRequest("http://localhost:3000/api/admin/courses/course-1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Updated Course",
          description: "Updated description",
        }),
      });

      const response = await PUT(request, { params: { id: "course-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(prisma.course.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "course-1" },
          data: expect.objectContaining({
            name: "Updated Course",
            description: "Updated description",
          }),
        })
      );
    });
  });

  describe("DELETE", () => {
    it("should delete course successfully", async () => {
      getServerSession.mockResolvedValue(mockAdminSession);
      prisma.course.findUnique.mockResolvedValue(mockCourse);
      prisma.course.delete.mockResolvedValue(mockCourse);

      const request = new NextRequest("http://localhost:3000/api/admin/courses/course-1");
      const response = await DELETE(request, { params: { id: "course-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toContain("deleted successfully");
      expect(prisma.course.delete).toHaveBeenCalledWith({
        where: { id: "course-1" },
      });
    });
  });
});

describe("/api/admin/courses/analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return analytics data for admin", async () => {
    getServerSession.mockResolvedValue(mockAdminSession);
    
    // Mock all the analytics queries
    prisma.course.count
      .mockResolvedValueOnce(10) // totalCourses
      .mockResolvedValueOnce(8)  // coursesWithExams
      .mockResolvedValueOnce(7)  // coursesWithEnrollments
      .mockResolvedValueOnce(2); // recentActivity

    prisma.courseEnrollment.aggregate.mockResolvedValue({
      _avg: { courseId: 5 },
      _count: { courseId: 50 },
    });

    prisma.course.groupBy
      .mockResolvedValueOnce([]) // instructorStats
      .mockResolvedValueOnce([]); // termBreakdown

    prisma.user.findMany.mockResolvedValue([]);

    const request = new NextRequest("http://localhost:3000/api/admin/courses/analytics");
    const response = await GetAnalytics(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.overview).toBeDefined();
    expect(data.overview.totalCourses).toBe(10);
    expect(data.instructorStats).toBeDefined();
    expect(data.termBreakdown).toBeDefined();
  });

  it("should return 401 for non-admin users", async () => {
    getServerSession.mockResolvedValue(mockTeacherSession);

    const request = new NextRequest("http://localhost:3000/api/admin/courses/analytics");
    const response = await GetAnalytics(request);

    expect(response.status).toBe(401);
  });
});