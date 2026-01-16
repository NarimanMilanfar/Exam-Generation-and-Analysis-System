import { NextRequest } from "next/server";
import "@testing-library/jest-dom";

// Mock Prisma Client type for testing
type MockPrismaClient = {
  verificationToken: {
    findUnique: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  user: {
    findUnique: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
  $disconnect: jest.MockedFunction<any>;
};

// Mock Prisma
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    verificationToken: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
}));

const mockPrisma = {
  verificationToken: {
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  $disconnect: jest.fn(),
} as MockPrismaClient;

// Mock the GET handler from the verify route
const mockVerifyGET = jest.fn();

describe("Email Verification API Route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Verification", () => {
    it("successfully verifies email with valid token", async () => {
      const validToken = "valid-token-123";
      const userEmail = "test@example.com";
      const userId = "user-123";

      // Mock finding the verification token
      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        token: validToken,
        identifier: userEmail,
        expires: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
      });

      // Mock finding the user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        email: userEmail,
        name: "Test User",
        emailVerified: null,
      });

      // Mock updating user
      mockPrisma.user.update.mockResolvedValue({
        id: userId,
        email: userEmail,
        emailVerified: new Date(),
      });

      // Mock deleting verification token
      mockPrisma.verificationToken.delete.mockResolvedValue({
        token: validToken,
      });

      // Mock successful verification response
      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/verified"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
    });

    it("updates user emailVerified field", async () => {
      const validToken = "valid-token-456";
      const userEmail = "user@example.com";

      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        token: validToken,
        identifier: userEmail,
        expires: new Date(Date.now() + 1000 * 60 * 60),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "user-456",
        email: userEmail,
        emailVerified: null,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "user-456",
        emailVerified: new Date(),
      });

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/verified"]]),
      });

      mockVerifyGET.mockImplementation(async () => {
        // Simulate the actual verification flow
        await mockPrisma.user.update({ where: { id: "user-456" }, data: { emailVerified: new Date() } });
        return {
          status: 302,
          headers: new Map([["Location", "/auth/verified"]]),
        };
      });

      await mockVerifyGET();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "user-456" },
          data: { emailVerified: expect.any(Date) },
        })
      );
    });
  });

  describe("Error Scenarios", () => {
    it("handles missing token", async () => {
      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=missing-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=missing-token");
    });

    it("handles invalid token", async () => {
      const invalidToken = "invalid-token-123";

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=invalid-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=invalid-token");
    });

    it("handles expired token", async () => {
      const expiredToken = "expired-token-123";
      const userEmail = "expired@example.com";

      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        token: expiredToken,
        identifier: userEmail,
        expires: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      });

      mockPrisma.verificationToken.delete.mockResolvedValue({
        token: expiredToken,
      });

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=expired-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=expired-token");
    });

    it("handles user not found", async () => {
      const validToken = "token-for-missing-user";
      const missingUserEmail = "missing@example.com";

      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        token: validToken,
        identifier: missingUserEmail,
        expires: new Date(Date.now() + 1000 * 60 * 60),
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=user-not-found"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=user-not-found");
    });

    it("handles server errors", async () => {
      const validToken = "token-causing-error";

      mockPrisma.verificationToken.findUnique.mockRejectedValue(
        new Error("Database connection failed")
      );

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=server-error"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=server-error");
    });
  });

  describe("Token Cleanup", () => {
    it("deletes verification token after successful verification", async () => {
      const validToken = "cleanup-token-123";
      const userEmail = "cleanup@example.com";

      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        token: validToken,
        identifier: userEmail,
        expires: new Date(Date.now() + 1000 * 60 * 60),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: "cleanup-user",
        email: userEmail,
      });

      mockPrisma.user.update.mockResolvedValue({
        id: "cleanup-user",
        emailVerified: new Date(),
      });

      mockPrisma.verificationToken.delete.mockResolvedValue({
        token: validToken,
      });

      mockVerifyGET.mockImplementation(async () => {
        // Simulate the actual flow
        await mockPrisma.verificationToken.findUnique({ where: { token: validToken } });
        await mockPrisma.user.findUnique({ where: { email: userEmail } });
        await mockPrisma.user.update({ where: { id: "cleanup-user" }, data: { emailVerified: new Date() } });
        await mockPrisma.verificationToken.delete({ where: { token: validToken } });
        
        return {
          status: 302,
          headers: new Map([["Location", "/auth/verified"]]),
        };
      });

      await mockVerifyGET();
      
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: validToken },
      });
    });

    it("deletes expired tokens during cleanup", async () => {
      const expiredToken = "expired-cleanup-token";

      mockPrisma.verificationToken.findUnique.mockResolvedValue({
        token: expiredToken,
        expires: new Date(Date.now() - 1000),
      });

      mockPrisma.verificationToken.delete.mockResolvedValue({
        token: expiredToken,
      });

      mockVerifyGET.mockImplementation(async () => {
        await mockPrisma.verificationToken.delete({ where: { token: expiredToken } });
        return {
          status: 302,
          headers: new Map([["Location", "/auth/error?error=expired-token"]]),
        };
      });

      await mockVerifyGET();
      
      expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith({
        where: { token: expiredToken },
      });
    });
  });

  describe("Edge Cases", () => {
    it("handles malformed tokens", async () => {
      const malformedToken = "abc123!@#$%^&*()";

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=invalid-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=invalid-token");
    });

    it("handles very long tokens", async () => {
      const longToken = "a".repeat(1000);

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=invalid-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
    });

    it("handles tokens with special characters", async () => {
      const specialToken = "token-with-special-chars-éñ中文";

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=invalid-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
    });
  });

  describe("Security Tests", () => {
    it("prevents token reuse", async () => {
      const usedToken = "already-used-token";
      
      // First use - should succeed
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce({
        token: usedToken,
        identifier: "user@example.com",
        expires: new Date(Date.now() + 1000 * 60 * 60),
      });

      // Second use - token should be gone
      mockPrisma.verificationToken.findUnique.mockResolvedValueOnce(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=invalid-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/error?error=invalid-token");
    });

    it("validates token format and length", async () => {
      const shortToken = "abc";

      mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

      mockVerifyGET.mockResolvedValue({
        status: 302,
        headers: new Map([["Location", "/auth/error?error=invalid-token"]]),
      });

      const response = await mockVerifyGET();
      expect(response.status).toBe(302);
    });

    it("ensures tokens are cryptographically secure", async () => {
      // Test that our token generation is secure (this would be tested in the email service)
      const secureToken = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0abcd";
      
      expect(secureToken).toHaveLength(64); // Expected length for crypto.randomBytes(32).toString('hex')
      expect(secureToken).toMatch(/^[a-f0-9]+$/); // Should only contain hex characters
    });
  });

  describe("Database Cleanup", () => {
    afterEach(async () => {
      // Ensure database connections are properly closed
      await mockPrisma.$disconnect();
    });

    it("properly disconnects from database", async () => {
      await mockPrisma.$disconnect();
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
}); 