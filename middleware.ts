import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Admin route protection (exclude login page)
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      if (!token || token.role !== "ADMIN") {
        // Redirect non-admin users to admin login
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    // Regular dashboard protection - ensure professors can't accidentally access admin
    if (pathname.startsWith("/dashboard")) {
      if (!token) {
        return NextResponse.redirect(new URL("/auth/login", req.url));
      }
      if (token.role === "ADMIN") {
        // Redirect admins to their proper dashboard
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Admin routes require ADMIN role (except login page)
        if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
          return token?.role === "ADMIN";
        }

        // Regular protected routes require any authenticated user
        if (
          pathname.startsWith("/dashboard") ||
          pathname.startsWith("/profile")
        ) {
          return !!token;
        }

        // Public routes (including admin login)
        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/profile/:path*"],
};
