import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import { ChromeAgentSync } from "@/components/ChromeAgentSync";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-pixel-heading",
  weight: "400",
  subsets: ["latin"],
});

const vt323 = VT323({
  variable: "--font-pixel-body",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Local Focus Agent",
  description:
    "A local Chrome study agent with rule-based NLP checks, a pinned timer, and Android distraction alerts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} ${vt323.variable}`}>
        <ChromeAgentSync />
        {children}
      </body>
    </html>
  );
}
