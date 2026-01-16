import { logAudit } from "../../lib/auditLogger";

// Mock Prisma
jest.mock("../../lib/prisma", () => ({
  auditLog: {
    create: jest.fn(),
  },
}));

const prisma = require("../../lib/prisma");

describe("auditLogger", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should log audit entry successfully", async () => {
    const mockAuditLog = {
      id: "test-id",
      userId: "user-1",
      userEmail: "test@example.com",
      action: "USER_CREATED",
      resource: "exam",
      resourceId: "exam-1",
      details: JSON.stringify({ examTitle: "Test Exam" }),
      ipAddress: "127.0.0.1",
      userAgent: "test-agent",
      success: true,
      createdAt: new Date(),
    };

    prisma.auditLog.create.mockResolvedValue(mockAuditLog);

    await logAudit(
      "user-1",
      "test@example.com",
      "USER_CREATED",
      "exam",
      "exam-1",
      { examTitle: "Test Exam" },
      "127.0.0.1",
      "test-agent",
      true
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        userEmail: "test@example.com",
        action: "USER_CREATED",
        resource: "exam",
        resourceId: "exam-1",
        details: JSON.stringify({ examTitle: "Test Exam" }),
        ipAddress: "127.0.0.1",
        userAgent: "test-agent",
        success: true,
        errorMessage: undefined,
      },
    });
  });

  it("should handle database errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    prisma.auditLog.create.mockRejectedValue(new Error("Database error"));

    // Should not throw an error
    await expect(
      logAudit("user-1", "test@example.com", "USER_CREATED", "exam")
    ).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to log audit entry:",
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });

  it("should work with minimal parameters", async () => {
    prisma.auditLog.create.mockResolvedValue({});

    await logAudit("user-1", "test@example.com", "LOGIN_SUCCESS");

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        userEmail: "test@example.com",
        action: "LOGIN_SUCCESS",
        resource: undefined,
        resourceId: undefined,
        details: null,
        ipAddress: undefined,
        userAgent: undefined,
        success: true,
        errorMessage: undefined,
      },
    });
  });
});
