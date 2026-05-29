import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Nav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "365 DaysOfArt",
  description: "A social network for daily drawing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#f7f5ef]`}
    >
      <body className="min-h-screen flex flex-col bg-[#f7f5ef]">
        <AuthProvider>
          <Nav />
          <main className="flex-1 bg-[#f7f5ef]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
