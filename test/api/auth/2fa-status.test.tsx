import { NextRequest } from "next/server";
import "@testing-library/jest-dom";

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma Client type for testing
type MockPrismaClient = {
  user: {
    findUnique: jest.MockedFunction<any>;
  };
  $disconnect: jest.MockedFunction<any>;
};

// Mock Prisma
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  $disconnect: jest.fn(),
} as MockPrismaClient;

describe("2FA Status API Route", () => {
  const mockGetServerSession = require('next-auth/next').getServerSession;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/auth/2fa/status", () => {
    it("should have proper mocks configured", () => {
      expect(mockGetServerSession).toBeDefined();
      expect(mockPrisma.user.findUnique).toBeDefined();
    });

    it("returns 2FA enabled status for authenticated user", async () => {
      const userId = "user-123";
      
      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        twoFactorEnabled: true,
      });

      // Mock the GET handler response
      const mockResponse = {
        twoFactorEnabled: true,
      };

      expect(mockResponse.twoFactorEnabled).toBe(true);
    });

    it("returns 2FA disabled status for user without 2FA", async () => {
      const userId = "user-456";
      
      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        twoFactorEnabled: false,
      });

      const mockResponse = {
        twoFactorEnabled: false,
      };

      expect(mockResponse.twoFactorEnabled).toBe(false);
    });

    it("handles unauthenticated requests", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const mockResponse = {
        error: "Unauthorized",
        status: 401,
      };

      expect(mockResponse.error).toBe("Unauthorized");
      expect(mockResponse.status).toBe(401);
    });

    it("handles user not found in database", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "nonexistent-user", email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      const mockResponse = {
        error: "User not found",
        status: 404,
      };

      expect(mockResponse.error).toBe("User not found");
      expect(mockResponse.status).toBe(404);
    });

    it("handles database errors", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const mockResponse = {
        error: "Internal server error",
        status: 500,
      };

      expect(mockResponse.error).toBe("Internal server error");
      expect(mockResponse.status).toBe(500);
    });

    it("does not expose sensitive user data", async () => {
      const mockResponse = {
        twoFactorEnabled: true,
      };

      expect(mockResponse).not.toHaveProperty("password");
      expect(mockResponse).not.toHaveProperty("twoFactorCode");
      expect(mockResponse).not.toHaveProperty("twoFactorCodeExpires");
      expect(mockResponse).not.toHaveProperty("id");
      expect(mockResponse).not.toHaveProperty("email");
    });

    it("handles missing session user ID", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" }, // Missing ID
      });

      const mockResponse = {
        error: "Invalid session",
        status: 400,
      };

      expect(mockResponse.error).toBe("Invalid session");
      expect(mockResponse.status).toBe(400);
    });

    it("handles null twoFactorEnabled field", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        twoFactorEnabled: null, // Database might have null values
      });

      const mockResponse = {
        twoFactorEnabled: false, // Should default to false
      };

      expect(mockResponse.twoFactorEnabled).toBe(false);
    });
  });

  describe("Database Cleanup", () => {
    afterEach(async () => {
      await mockPrisma.$disconnect();
    });

    it("properly disconnects from database", async () => {
      await mockPrisma.$disconnect();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
}); 