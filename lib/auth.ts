import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "./prisma";
import bcrypt from "bcryptjs";
import { logLoginSuccess, logLoginFailure } from "./auditLogger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) {
            // Try to log the failure, but don't let it break authentication
            try {
              await logLoginFailure(
                credentials?.email || "unknown",
                "Missing credentials"
              );
            } catch (logError) {
              console.error("Failed to log login failure:", logError);
            }
            throw new Error("Invalid credentials");
          }

          const user = await prisma.user.findUnique({
            where: {
              email: credentials.email,
            },
          });

          if (!user || !user.password) {
            // Try to log the failure, but don't let it break authentication
            try {
              await logLoginFailure(
                credentials.email,
                "Invalid email or user not found"
              );
            } catch (logError) {
              console.error("Failed to log login failure:", logError);
            }
            throw new Error("Invalid credentials");
          }

          const isCorrectPassword = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isCorrectPassword) {
            // Try to log the failure, but don't let it break authentication
            try {
              await logLoginFailure(
                credentials.email,
                "Invalid password"
              );
            } catch (logError) {
              console.error("Failed to log login failure:", logError);
            }
            throw new Error("Invalid credentials");
          }

          // Check if user account is active (email verified)
          if (!user.emailVerified) {
            // Try to log the failure, but don't let it break authentication
            try {
              await logLoginFailure(
                credentials.email,
                "Account inactive - email not verified"
              );
            } catch (logError) {
              console.error("Failed to log login failure:", logError);
            }
            throw new Error(
              "Account is inactive. Please contact an administrator."
            );
          }

          // Try to log successful login, but don't let it break authentication
          try {
            await logLoginSuccess(
              user.id,
              user.email,
              undefined, // No request object available in NextAuth authorize
              {
                loginMethod: "credentials",
                role: user.role,
              }
            );
          } catch (logError) {
            console.error("Failed to log login success:", logError);
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Authentication error:", error);
          throw error; // Re-throw the error to maintain NextAuth behavior
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        return {
          ...token,
          id: user.id,
          role: user.role,
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id,
          role: token.role,
        },
      };
    },
  },
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
