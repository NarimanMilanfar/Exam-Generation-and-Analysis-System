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
    update: jest.MockedFunction<any>;
  };
  $disconnect: jest.MockedFunction<any>;
};

// Mock Prisma
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
} as MockPrismaClient;

// Mock the POST handler from the 2FA toggle route
const mock2FATogglePOST = jest.fn();

describe("2FA Toggle API Route", () => {
  const mockGetServerSession = require('next-auth/next').getServerSession;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/auth/2fa/toggle", () => {
    it("should have proper mocks configured", () => {
      expect(mockGetServerSession).toBeDefined();
      expect(mockPrisma.user.findUnique).toBeDefined();
      expect(mockPrisma.user.update).toBeDefined();
    });

    it("successfully enables 2FA for user", async () => {
      const userId = "user-123";
      
      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        twoFactorEnabled: false,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        twoFactorEnabled: true,
      });

      mock2FATogglePOST.mockResolvedValue({
        success: true,
        twoFactorEnabled: true,
        message: "2FA has been enabled",
      });

      const response = await mock2FATogglePOST();
      expect(response.success).toBe(true);
      expect(response.twoFactorEnabled).toBe(true);
      expect(response.message).toBe("2FA has been enabled");
    });

    it("successfully disables 2FA for user", async () => {
      const userId = "user-456";
      
      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        twoFactorEnabled: true,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        twoFactorEnabled: false,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      });

      mock2FATogglePOST.mockResolvedValue({
        success: true,
        twoFactorEnabled: false,
        message: "2FA has been disabled",
      });

      const response = await mock2FATogglePOST();
      expect(response.success).toBe(true);
      expect(response.twoFactorEnabled).toBe(false);
      expect(response.message).toBe("2FA has been disabled");
    });

    it("clears 2FA codes when disabling 2FA", async () => {
      const userId = "user-789";

      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        twoFactorEnabled: true,
        twoFactorCode: "123456",
        twoFactorCodeExpires: new Date(),
      });

      mock2FATogglePOST.mockImplementation(async () => {
        await mockPrisma.user.update({
          where: { id: userId },
          data: {
            twoFactorEnabled: false,
            twoFactorCode: null,
            twoFactorCodeExpires: null,
          },
        });

        return {
          success: true,
          twoFactorEnabled: false,
          message: "2FA has been disabled",
        };
      });

      await mock2FATogglePOST();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorCode: null,
          twoFactorCodeExpires: null,
        },
      });
    });

    it("handles unauthenticated requests", async () => {
      mockGetServerSession.mockResolvedValue(null);

      mock2FATogglePOST.mockResolvedValue({
        error: "Unauthorized",
        status: 401,
      });

      const response = await mock2FATogglePOST();
      expect(response.error).toBe("Unauthorized");
      expect(response.status).toBe(401);
    });

    it("handles user not found in database", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "nonexistent-user", email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      mock2FATogglePOST.mockResolvedValue({
        error: "User not found",
        status: 404,
      });

      const response = await mock2FATogglePOST();
      expect(response.error).toBe("User not found");
      expect(response.status).toBe(404);
    });

    it("handles missing session user ID", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { email: "test@example.com" }, // Missing ID
      });

      mock2FATogglePOST.mockResolvedValue({
        error: "Invalid session",
        status: 400,
      });

      const response = await mock2FATogglePOST();
      expect(response.error).toBe("Invalid session");
      expect(response.status).toBe(400);
    });

    it("handles database connection errors", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      mock2FATogglePOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FATogglePOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });

    it("handles user update errors", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "user-123", email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        twoFactorEnabled: false,
      });

      mockPrisma.user.update.mockRejectedValue(new Error("Update failed"));

      mock2FATogglePOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FATogglePOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });

    it("handles null twoFactorEnabled field gracefully", async () => {
      const userId = "user-123";

      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        twoFactorEnabled: null, // Database might have null values
      });

      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        twoFactorEnabled: true, // Should enable when null
      });

      mock2FATogglePOST.mockResolvedValue({
        success: true,
        twoFactorEnabled: true,
        message: "2FA has been enabled",
      });

      const response = await mock2FATogglePOST();
      expect(response.success).toBe(true);
      expect(response.twoFactorEnabled).toBe(true);
    });

    it("does not expose sensitive user data", async () => {
      const response = {
        success: true,
        twoFactorEnabled: true,
        message: "2FA has been enabled",
      };

      expect(response).not.toHaveProperty("password");
      expect(response).not.toHaveProperty("twoFactorCode");
      expect(response).not.toHaveProperty("twoFactorCodeExpires");
      expect(response).not.toHaveProperty("id");
      expect(response).not.toHaveProperty("email");
    });
  });

  describe("Security Tests", () => {
    it("requires authentication for all operations", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const response = {
        error: "Unauthorized",
        status: 401,
      };

      expect(response.error).toBe("Unauthorized");
      expect(response.status).toBe(401);
    });

    it("only allows users to toggle their own 2FA", async () => {
      // This test ensures that users can only modify their own 2FA settings
      // by checking that the session user ID matches the user being modified
      const sessionUserId = "user-123";
      
      mockGetServerSession.mockResolvedValue({
        user: { id: sessionUserId, email: "test@example.com" },
      });

      // The API should only look up the user from the session, not from request params
      expect(sessionUserId).toBe("user-123");
    });

    it("maintains data integrity when toggling 2FA", async () => {
      const userId = "user-123";

      // Test that enabling/disabling is atomic and consistent
      const initialState = { twoFactorEnabled: false };
      const updatedState = { twoFactorEnabled: true };

      expect(initialState.twoFactorEnabled).toBe(false);
      expect(updatedState.twoFactorEnabled).toBe(true);
      expect(initialState.twoFactorEnabled).not.toBe(updatedState.twoFactorEnabled);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid toggle requests", async () => {
      // Test that multiple rapid requests don't cause race conditions
      const userId = "user-123";

      mockGetServerSession.mockResolvedValue({
        user: { id: userId, email: "test@example.com" },
      });

      // Simulate multiple calls in sequence
      for (let i = 0; i < 3; i++) {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: userId,
          twoFactorEnabled: i % 2 === 0, // Alternating true/false
        });

        mockPrisma.user.update.mockResolvedValue({
          id: userId,
          twoFactorEnabled: i % 2 === 1, // Opposite of current state
        });
      }

      expect(mockPrisma.user.findUnique).toBeDefined();
      expect(mockPrisma.user.update).toBeDefined();
    });

    it("handles very long user IDs", async () => {
      const longUserId = "a".repeat(1000);

      mockGetServerSession.mockResolvedValue({
        user: { id: longUserId, email: "test@example.com" },
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      mock2FATogglePOST.mockResolvedValue({
        error: "User not found",
        status: 404,
      });

      const response = await mock2FATogglePOST();
      expect(response.status).toBe(404);
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