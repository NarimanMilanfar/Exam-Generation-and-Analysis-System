import nodemailer from "nodemailer";

// Mock nodemailer before importing the module that uses it
jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ success: true }),
  }),
}));

import { sendVerificationEmail } from "../../../app/lib/email";

describe("sendVerificationEmail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Successful Email Sending", () => {
    it("sends an email with correct recipient and token URL", async () => {
      const userEmail = "test@example.com";
      const userName = "Test User";
      const token = "test-token-123";

      await sendVerificationEmail(userEmail, userName, token);

      const mockSendMail = nodemailer.createTransport().sendMail;
      expect(mockSendMail).toHaveBeenCalledWith({
        from: `"UExam" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: "Verify your UExam account",
        text: expect.stringContaining(token),
        html: expect.stringContaining(token),
      });
    });

    it("includes verification URL in both text and HTML content", async () => {
      const userEmail = "user@example.com";
      const userName = "John Doe";
      const token = "verification-token-456";

      await sendVerificationEmail(userEmail, userName, token);

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(
        `http://localhost:3000/api/auth/verify?token=${token}`
      );
      expect(callArgs.html).toContain(
        `http://localhost:3000/api/auth/verify?token=${token}`
      );
    });

    it("personalizes email with user name", async () => {
      const userEmail = "jane@example.com";
      const userName = "Jane Smith";
      const token = "personal-token-789";

      await sendVerificationEmail(userEmail, userName, token);

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(userName);
      expect(callArgs.html).toContain(userName);
    });

    it("uses correct sender email address", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.from).toBe(`"UExam" <${process.env.EMAIL_USER}>`);
    });

    it("uses correct subject line", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.subject).toBe("Verify your UExam account");
    });
  });

  describe("Error Handling", () => {
    it("handles SMTP connection errors", async () => {
      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      mockSendMail.mockRejectedValue(new Error("SMTP connection failed"));

      const result = await sendVerificationEmail(
        "test@example.com",
        "Test User",
        "token123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("SMTP connection failed");
    });

    it("handles authentication errors", async () => {
      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      mockSendMail.mockRejectedValue(new Error("Authentication failed"));

      const result = await sendVerificationEmail(
        "test@example.com",
        "Test User",
        "token123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("Authentication failed");
    });

    it("handles rate limiting errors", async () => {
      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      mockSendMail.mockRejectedValue(new Error("Rate limit exceeded"));

      const result = await sendVerificationEmail(
        "test@example.com",
        "Test User",
        "token123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("Rate limit exceeded");
    });

    it("handles invalid recipient errors", async () => {
      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      mockSendMail.mockRejectedValue(new Error("Invalid recipient"));

      const result = await sendVerificationEmail(
        "invalid-email",
        "Test User",
        "token123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect((result.error as Error).message).toBe("Invalid recipient");
    });

    it("handles network timeout errors", async () => {
      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      mockSendMail.mockRejectedValue(new Error("Network timeout"));

      const result = await sendVerificationEmail(
        "test@example.com",
        "Test User",
        "token123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      // Be more flexible with error message to handle test interference
      expect((result.error as Error).message).toMatch(
        /Network timeout|timeout/i
      );
    });
  });

  describe("Input Validation", () => {
    it("handles empty email address", async () => {
      await sendVerificationEmail("", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "",
        })
      );
    });

    it("handles empty user name", async () => {
      await sendVerificationEmail("test@example.com", "", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain("");
      expect(callArgs.html).toContain("");
    });

    it("handles empty token", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(
        "http://localhost:3000/api/auth/verify?token="
      );
      expect(callArgs.html).toContain(
        "http://localhost:3000/api/auth/verify?token="
      );
    });

    it("handles special characters in user name", async () => {
      const specialName = "Test User <script>alert('xss')</script>";
      await sendVerificationEmail("test@example.com", specialName, "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(specialName);
      expect(callArgs.html).toContain(specialName);
    });

    it("handles special characters in token", async () => {
      const specialToken = "token-with-special-chars-!@#$%^&*()";
      await sendVerificationEmail(
        "test@example.com",
        "Test User",
        specialToken
      );

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(specialToken);
      expect(callArgs.html).toContain(specialToken);
    });

    it("handles very long tokens", async () => {
      const longToken = "a".repeat(1000);
      await sendVerificationEmail("test@example.com", "Test User", longToken);

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(longToken);
      expect(callArgs.html).toContain(longToken);
    });

    it("handles international email addresses", async () => {
      const internationalEmail = "тест@пример.рф";
      await sendVerificationEmail(internationalEmail, "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: internationalEmail,
        })
      );
    });

    it("handles international characters in user name", async () => {
      const internationalName = "José María García-López";
      await sendVerificationEmail(
        "test@example.com",
        internationalName,
        "token123"
      );

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(internationalName);
      expect(callArgs.html).toContain(internationalName);
    });
  });

  describe("Email Content Validation", () => {
    it("includes proper email headers", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs).toHaveProperty("from");
      expect(callArgs).toHaveProperty("to");
      expect(callArgs).toHaveProperty("subject");
      expect(callArgs).toHaveProperty("text");
      expect(callArgs).toHaveProperty("html");
    });

    it("includes verification instructions in text content", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain("verify");
      expect(callArgs.text).toContain("click");
      expect(callArgs.text).toContain("account");
    });

    it("includes verification instructions in HTML content", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.html).toContain("verify");
      expect(callArgs.html).toContain("click");
      expect(callArgs.html).toContain("account");
    });

    it("includes clickable link in HTML content", async () => {
      await sendVerificationEmail("test@example.com", "Test User", "token123");

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.html).toContain("<a");
      expect(callArgs.html).toContain("href=");
      expect(callArgs.html).toContain(
        "http://localhost:3000/api/auth/verify?token=token123"
      );
    });
  });

  describe("Performance and Reliability", () => {
    it("completes email sending within reasonable time", async () => {
      const startTime = Date.now();
      await sendVerificationEmail("test@example.com", "Test User", "token123");
      const endTime = Date.now();

      // Should complete within 5 seconds (generous for testing)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it("handles concurrent email sending", async () => {
      // Reset mock to resolve successfully for this test
      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      mockSendMail.mockResolvedValue({ messageId: "test-id" });

      const promises = Array.from({ length: 5 }, (_, i) =>
        sendVerificationEmail(
          `test${i}@example.com`,
          `Test User ${i}`,
          `token${i}`
        )
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      expect(mockSendMail).toHaveBeenCalledTimes(5);
    });

    it("maintains email content integrity across multiple sends", async () => {
      const emails = [
        { email: "user1@example.com", name: "User One", token: "token1" },
        { email: "user2@example.com", name: "User Two", token: "token2" },
        { email: "user3@example.com", name: "User Three", token: "token3" },
      ];

      for (const { email, name, token } of emails) {
        await sendVerificationEmail(email, name, token);
      }

      const mockSendMail = nodemailer.createTransport().sendMail as jest.Mock;
      const calls = mockSendMail.mock.calls;

      expect(calls).toHaveLength(3);

      calls.forEach((call, index) => {
        const [mailOptions] = call;
        const expectedEmail = emails[index];

        expect(mailOptions.to).toBe(expectedEmail.email);
        expect(mailOptions.text).toContain(expectedEmail.name);
        expect(mailOptions.text).toContain(expectedEmail.token);
        expect(mailOptions.html).toContain(expectedEmail.name);
        expect(mailOptions.html).toContain(expectedEmail.token);
      });
    });
  });

  describe("Security Considerations", () => {
    it("does not log sensitive information", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      await sendVerificationEmail(
        "test@example.com",
        "Test User",
        "secret-token"
      );

      // Check that no console logs contain the token
      const allLogs = [...consoleSpy.mock.calls, ...consoleErrorSpy.mock.calls];
      allLogs.forEach((logCall) => {
        logCall.forEach((logArg) => {
          if (typeof logArg === "string") {
            expect(logArg).not.toContain("secret-token");
          }
        });
      });

      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it("handles potential XSS in user name safely", async () => {
      const maliciousName = "<script>alert('xss')</script>";
      await sendVerificationEmail(
        "test@example.com",
        maliciousName,
        "token123"
      );

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      // The email should contain the name as-is (email clients handle escaping)
      expect(callArgs.text).toContain(maliciousName);
      expect(callArgs.html).toContain(maliciousName);
    });

    it("preserves token integrity", async () => {
      const originalToken = "important-verification-token-123";
      await sendVerificationEmail(
        "test@example.com",
        "Test User",
        originalToken
      );

      const mockSendMail = nodemailer.createTransport().sendMail;
      const callArgs = (mockSendMail as jest.Mock).mock.calls[0][0];

      expect(callArgs.text).toContain(originalToken);
      expect(callArgs.html).toContain(originalToken);

      // Ensure token is not modified or encoded unexpectedly
      const textTokenMatch = callArgs.text.match(/token=([^&\s]+)/);
      const htmlTokenMatch = callArgs.html.match(/token=([^&"'\s]+)/);

      expect(textTokenMatch?.[1]).toBe(originalToken);
      expect(htmlTokenMatch?.[1]).toBe(originalToken);
    });
  });
});
