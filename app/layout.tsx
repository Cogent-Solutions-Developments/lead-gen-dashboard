import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "supernizo",
  description: "B2B Lead Generation Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <AppShell>{children}</AppShell>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
