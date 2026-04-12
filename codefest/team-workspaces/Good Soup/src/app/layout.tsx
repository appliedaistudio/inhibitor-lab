import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";
import "./custom-layout.css";

import { AuthProvider } from "../components/auth-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "Verified Student Research Companion",
  description:
    "Hackathon prototype for research and learning assistance with inhibitor-first gating, parallel verifiers, and transparent synthesis."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.NEXTAUTH_SECRET
  );

  return (
    <html lang="en">
      <body className={`${inter.variable} ${manrope.variable}`}>
        <AuthProvider enabled={authEnabled}>{children}</AuthProvider>
      </body>
    </html>
  );
}
