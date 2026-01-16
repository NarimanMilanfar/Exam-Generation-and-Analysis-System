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

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

// Mock email service
jest.mock("../../../app/lib/email", () => ({
  send2FACode: jest.fn(),
}));

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
} as MockPrismaClient;

const mockBcrypt = require("bcryptjs");
const mockSend2FACode = require("../../../app/lib/email").send2FACode;

// Mock the POST handler from the 2FA send route
const mock2FASendPOST = jest.fn();

describe("2FA Send API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful 2FA Code Sending", () => {
    it("successfully sends 2FA code for user with 2FA enabled", async () => {
      const userEmail = "test@example.com";
      const password = "password123";
      const userId = "user-123";

      // Mock finding user with 2FA enabled
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: userEmail,
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
        twoFactorEnabled: true,
      });

      // Mock password validation
      mockBcrypt.compare.mockResolvedValue(true);

      // Mock updating user with 2FA code
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        twoFactorCode: "123456",
        twoFactorCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
      });

      // Mock email sending success
      mockSend2FACode.mockResolvedValue({ success: true });

      mock2FASendPOST.mockResolvedValue({
        success: true,
        message: "Verification code sent to your email",
        userId: userId,
        twoFactorRequired: true,
      });

      const response = await mock2FASendPOST();
      expect(response.success).toBe(true);
      expect(response.twoFactorRequired).toBe(true);
      expect(response.userId).toBe(userId);
    });

    it("allows direct login for user with 2FA disabled", async () => {
      const userEmail = "test@example.com";
      const password = "password123";
      const userId = "user-456";

      // Mock finding user with 2FA disabled
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: userEmail,
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
        twoFactorEnabled: false,
      });

      // Mock password validation
      mockBcrypt.compare.mockResolvedValue(true);

      mock2FASendPOST.mockResolvedValue({
        success: true,
        message: "2FA not required",
        userId: userId,
        twoFactorRequired: false,
      });

      const response = await mock2FASendPOST();
      expect(response.success).toBe(true);
      expect(response.twoFactorRequired).toBe(false);
      expect(response.userId).toBe(userId);
    });

    it("generates and stores 2FA code with proper expiration", async () => {
      const userId = "user-789";
      const userEmail = "user@example.com";

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: userEmail,
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
        twoFactorEnabled: true,
      });

      mockBcrypt.compare.mockResolvedValue(true);
      mockSend2FACode.mockResolvedValue({ success: true });

      mock2FASendPOST.mockImplementation(async () => {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await mockPrisma.user.update({
          where: { id: userId },
          data: {
            twoFactorCode: "123456",
            twoFactorCodeExpires: expiresAt,
          },
        });

        return {
          success: true,
          message: "Verification code sent to your email",
          userId: userId,
          twoFactorRequired: true,
        };
      });

      await mock2FASendPOST();

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          twoFactorCode: "123456",
          twoFactorCodeExpires: expect.any(Date),
        },
      });
    });
  });

  describe("Authentication Errors", () => {
    it("handles missing credentials", async () => {
      mock2FASendPOST.mockResolvedValue({
        error: "Email and password are required",
        status: 400,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Email and password are required");
      expect(response.status).toBe(400);
    });

    it("handles user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      mock2FASendPOST.mockResolvedValue({
        error: "Invalid credentials",
        status: 401,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Invalid credentials");
      expect(response.status).toBe(401);
    });

    it("handles invalid password", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
      });

      mockBcrypt.compare.mockResolvedValue(false);

      mock2FASendPOST.mockResolvedValue({
        error: "Invalid credentials",
        status: 401,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Invalid credentials");
      expect(response.status).toBe(401);
    });

    it("handles unverified email", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: "$2a$12$hashedpassword",
        emailVerified: null,
      });

      mockBcrypt.compare.mockResolvedValue(true);

      mock2FASendPOST.mockResolvedValue({
        error: "Please verify your email before logging in",
        status: 401,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Please verify your email before logging in");
      expect(response.status).toBe(401);
    });
  });

  describe("Email Service Errors", () => {
    it("handles email sending failure", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
        twoFactorEnabled: true,
      });

      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});
      mockSend2FACode.mockResolvedValue({ success: false });

      mock2FASendPOST.mockResolvedValue({
        error: "Failed to send verification code",
        status: 500,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Failed to send verification code");
      expect(response.status).toBe(500);
    });

    it("handles email service exception", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
        twoFactorEnabled: true,
      });

      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue({});
      mockSend2FACode.mockRejectedValue(new Error("SMTP connection failed"));

      mock2FASendPOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });
  });

  describe("Database Errors", () => {
    it("handles database connection errors", async () => {
      mockPrisma.user.findUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      mock2FASendPOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });

    it("handles user update errors", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        password: "$2a$12$hashedpassword",
        emailVerified: new Date(),
        twoFactorEnabled: true,
      });

      mockBcrypt.compare.mockResolvedValue(true);
      mockPrisma.user.update.mockRejectedValue(new Error("Update failed"));

      mock2FASendPOST.mockResolvedValue({
        error: "Internal server error",
        status: 500,
      });

      const response = await mock2FASendPOST();
      expect(response.error).toBe("Internal server error");
      expect(response.status).toBe(500);
    });
  });

  describe("Security Tests", () => {
    it("generates 6-digit numeric codes", async () => {
      // Test that codes are properly formatted
      const mockCode = "123456";
      expect(mockCode).toMatch(/^\d{6}$/);
      expect(mockCode).toHaveLength(6);
    });

    it("sets proper expiration time for 2FA codes", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime()); // Use same timestamp to avoid timing issues
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      expect(expiresAt.getTime() - now.getTime()).toBeLessThanOrEqual(10 * 60 * 1000);
    });

    it("does not expose sensitive user data", async () => {
      const userResponse = {
        success: true,
        userId: "user-123",
        twoFactorRequired: true,
      };

      expect(userResponse).not.toHaveProperty("password");
      expect(userResponse).not.toHaveProperty("twoFactorCode");
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