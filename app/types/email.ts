export interface EmailResult {
  success: boolean;
  error?: any;
}

export interface VerificationEmailParams {
  email: string;
  name: string;
  verificationToken: string;
} 