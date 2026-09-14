import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeScript, ThemeSync } from "@/components/theme";
import { TaskEditorProvider } from "@/components/task-editor";
import { AppShell } from "@/components/app-shell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Proxima",
    template: "%s · Proxima",
  },
  description:
    "A calm task tracker with a calendar and one-click Canvas (Instructure) import.",
  applicationName: "Proxima",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f13" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <StoreProvider>
          <ThemeSync />
          <TaskEditorProvider>
            <AppShell>{children}</AppShell>
          </TaskEditorProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
