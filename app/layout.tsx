import type { Metadata } from "next";
import { Google_Sans, Jersey_10 } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/AppShell";

const googleSans = Google_Sans({
  subsets: ["latin"],
  variable: "--font-google-sans",
});

const jersey10 = Jersey_10({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-jersey-10",
});

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
    <html lang="en" className="bg-transparent">
      <body className={`${googleSans.className} ${googleSans.variable} ${jersey10.variable} min-h-screen bg-black/3`}>
        <AppShell>{children}</AppShell>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
