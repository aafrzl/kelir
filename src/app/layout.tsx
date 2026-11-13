import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// Body/UI font from design-system.md (SIL OFL 1.1, logged in ASSETS.md).
// Display (Cormorant Garamond) and ornament (Noto Sans Javanese) fonts arrive in task 3.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "KELIR — The Last Shadow Play",
  description:
    "A first-person browser horror game where light is your only weapon, rooted in Javanese wayang kulit shadow theatre.",
};

// Props typed by hand (not Next's generated `LayoutProps`) so `npx tsc --noEmit`
// passes on a clean clone before `.next/types` exists.
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body>{children}</body>
    </html>
  );
}
