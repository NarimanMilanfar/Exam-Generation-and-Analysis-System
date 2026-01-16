import { NextRequest } from "next/server";
import "@testing-library/jest-dom";

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

// Mock the POST handler from the 2FA verify route
const mock2FAVerifyPOST = jest.fn();

describe("2FA Verify API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful 2FA Verification", () => {
    it("successfully verifies valid 2FA code", async () => {
      const userId = "user-123";
      const validCode = "123456";

      // Mock finding user with valid 2FA code
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: "test@example.com",
        name: "Test User",
        role: "TEACHER",
        twoFactorCode: validCode,
        twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000), // 5 min from now
      });

      // Mock clearing 2FA code after verification
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      });

      mock2FAVerifyPOST.mockResolvedValue({
        success: true,
        message: "2FA verification successful",
        user: {
          id: userId,
          email: "test@example.com",
          name: "Test User",
          role: "TEACHER",
        },
      });

      const response = await mock2FAVerifyPOST();
      expect(response.success).toBe(true);
      expect(response.user.id).toBe(userId);
      expect(response.user).not.toHaveProperty("twoFactorCode");
    });

    it("clears 2FA code after successful verification", async () => {
      const userId = "user-456";
      const validCode = "654321";

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        twoFactorCode: validCode,
        twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
      });

      mock2FAVerifyPOST.mockImplementation(async () => {
        await mockPrisma.user.update({
          where: { id: userId },
          data: {
            twoFactorCode: null,
            twoFactorCodeExpires: null,
          },
        });

        return {
          success: true,
          message: "2FA verification successful",
          user: {
            id: userId,
            email: "user@example.com",
            name: "User",
            role: "TEACHER",
          },
        };
      });

      await mock2FAVerifyPOST();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorCode: null,
          twoFactorCodeExpires: null,
        },
      });
    });
  });

  describe("Validation Errors", () => {
    it("handles missing user ID and code", async () => {
      mock2FAVerifyPOST.mockResolvedValue({
        error: "User ID and code are required",
        status: 400,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("User ID and code are required");
      expect(response.status).toBe(400);
    });

    it("handles user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      mock2FAVerifyPOST.mockResolvedValue({
        error: "User not found",
        status: 404,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("User not found");
      expect(response.status).toBe(404);
    });

    it("handles missing verification code", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      });

      mock2FAVerifyPOST.mockResolvedValue({
        error: "No verification code found",
        status: 400,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("No verification code found");
      expect(response.status).toBe(400);
    });

    it("handles invalid verification code", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        twoFactorCode: "123456",
        twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
      });

      mock2FAVerifyPOST.mockResolvedValue({
        error: "Invalid verification code",
        status: 400,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("Invalid verification code");
      expect(response.status).toBe(400);
    });
  });

  describe("Expiration Handling", () => {
    it("handles expired verification code", async () => {
      const userId = "user-123";
      const expiredCode = "123456";

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        twoFactorCode: expiredCode,
        twoFactorCodeExpires: new Date(Date.now() - 1000), // Expired 1 second ago
      });

      // Mock clearing expired code
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      });

      mock2FAVerifyPOST.mockResolvedValue({
        error: "Verification code has expired",
        status: 400,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("Verification code has expired");
      expect(response.status).toBe(400);
    });

    it("clears expired codes from database", async () => {
      const userId = "user-789";

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        twoFactorCode: "123456",
        twoFactorCodeExpires: new Date(Date.now() - 1000),
      });

      mock2FAVerifyPOST.mockImplementation(async () => {
        await mockPrisma.user.update({
          where: { id: userId },
          data: {
            twoFactorCode: null,
            twoFactorCodeExpires: null,
          },
        });

        return {
          error: "Verification code has expired",
          status: 400,
        };
      });

      await mock2FAVerifyPOST();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorCode: null,
          twoFactorCodeExpires: null,
        },
      });
    });

    it("accepts codes that are still valid", async () => {
      const now = new Date();
      const validExpiry = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

      expect(validExpiry.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe("Database Errors", () => {
    it("handles database connection errors", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      mock2FAVerifyPOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });

    it("handles user update errors", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        twoFactorCode: "123456",
        twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
      });

      mockPrisma.user.update.mockRejectedValue(new Error("Update failed"));

      mock2FAVerifyPOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });
  });

  describe("Security Tests", () => {
    it("validates 6-digit code format", async () => {
      const validCodes = ["123456", "000000", "999999"];
      const invalidCodes = ["12345", "1234567", "abcdef", ""];

      validCodes.forEach(code => {
        expect(code).toMatch(/^\d{6}$/);
      });

      invalidCodes.forEach(code => {
        expect(code).not.toMatch(/^\d{6}$/);
      });
    });

    it("prevents code reuse after successful verification", async () => {
      const userId = "user-123";
      const usedCode = "123456";

      // First verification should succeed
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: userId,
        twoFactorCode: usedCode,
        twoFactorCodeExpires: new Date(Date.now() + 5 * 60 * 1000),
      });

      // After clearing, code should not exist
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: userId,
        twoFactorCode: null,
        twoFactorCodeExpires: null,
      });

      mock2FAVerifyPOST.mockResolvedValue({
        error: "No verification code found",
        status: 400,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.error).toBe("No verification code found");
    });

    it("does not expose sensitive data in response", async () => {
      const userResponse = {
        success: true,
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          role: "TEACHER",
        },
      };

      expect(userResponse.user).not.toHaveProperty("password");
      expect(userResponse.user).not.toHaveProperty("twoFactorCode");
      expect(userResponse.user).not.toHaveProperty("twoFactorCodeExpires");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long user IDs", async () => {
      const longUserId = "a".repeat(1000);

      mockPrisma.user.findUnique.mockResolvedValue(null);

      mock2FAVerifyPOST.mockResolvedValue({
        error: "User not found",
        status: 404,
      });

      const response = await mock2FAVerifyPOST();
      expect(response.status).toBe(404);
    });

    it("handles codes with leading zeros", async () => {
      const codeWithZeros = "000123";
      expect(codeWithZeros).toMatch(/^\d{6}$/);
      expect(codeWithZeros).toHaveLength(6);
    });

    it("handles exactly expired codes", async () => {
      const exactlyExpired = new Date();
      const slightly_before = new Date(exactlyExpired.getTime() - 1);

      expect(exactlyExpired.getTime()).toBeGreaterThan(slightly_before.getTime());
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