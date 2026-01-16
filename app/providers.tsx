"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { SidebarProvider } from "./components/Sidebar";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}

// Default export that combines all providers
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <SidebarProvider>
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#10b981',
                color: '#fff',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444',
                color: '#fff',
              },
            },
          }}
        />
      </SidebarProvider>
    </NextAuthSessionProvider>
  );
}
