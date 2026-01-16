import nodemailer from "nodemailer";
import { EmailResult, VerificationEmailParams } from "../types/email";

// Create a transporter using Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send verification email
export async function sendVerificationEmail(
  email: string,
  name: string,
  verificationToken: string
): Promise<EmailResult> {
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const verificationUrl = `${baseUrl}/api/auth/verify?token=${verificationToken}`;

  const mailOptions = {
    from: `"UExam" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Verify your UExam account",
    text: `Hello ${name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nThis link will expire in 24 hours.\n\nIf you did not create an account, please ignore this email.\n\nThank you,\nUExam Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your UExam account</h2>
        <p>Hello ${name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4F46E5; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email Address
          </a>
        </p>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <p>Thank you,<br>UExam Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error };
  }
}

// Send 2FA code email
export async function send2FACode(
  email: string,
  name: string,
  code: string
): Promise<EmailResult> {
  const mailOptions = {
    from: `"UExam" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your UExam Login Code",
    text: `Hello ${name},\n\nYour login verification code is: ${code}\n\nThis code will expire in 10 minutes.\n\nIf you did not request this code, please ignore this email.\n\nThank you,\nUExam Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h2 style="color: #1e40af; margin-bottom: 10px;">UExam Login Verification</h2>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Hello ${name},</p>
        
        <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
          To complete your login, please use the verification code below:
        </p>
        
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1e40af; font-family: monospace;">
            ${code}
          </div>
          <p style="font-size: 14px; color: #6b7280; margin-top: 10px;">
            Enter this code in your browser to continue
          </p>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="font-size: 14px; color: #92400e; margin: 0;">
            <strong>Security Notice:</strong> This code will expire in 10 minutes. Never share this code with anyone.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #6b7280;">
          If you did not request this code, please ignore this email and ensure your account is secure.
        </p>
        
        <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
          Thank you,<br>
          <strong>UExam Team</strong>
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("Error sending 2FA code:", error);
    return { success: false, error };
  }
}
