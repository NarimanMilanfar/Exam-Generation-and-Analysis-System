// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Providers from "./providers";
import ModernHelpProvider from "./components/shared/ModernHelpProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UExam",
  description: "Streamlined exam management platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ModernHelpProvider showFloatingHelp={false} showHelpHints={true}>
            {children}
          </ModernHelpProvider>
        </Providers>
      </body>
    </html>
  );
}
