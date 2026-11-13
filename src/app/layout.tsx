import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Cormorant_Garamond, Inter, Noto_Sans_Javanese } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

// Fonts from design-system.md, all SIL OFL 1.1 and logged in ASSETS.md.
// next/font self-hosts them at build time, so players' browsers never call Google.

/** Body and UI text (variable weight). */
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/** Display: titles and act names. Only the two weights the design uses. */
const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-cormorant-garamond",
});

/** Decorative aksara Jawa only, always aria-hidden next to an English translation.
 *  Not preloaded (ornament), and `block` avoids flashing empty glyph boxes. */
const notoSansJavanese = Noto_Sans_Javanese({
  subsets: ["javanese"],
  variable: "--font-noto-sans-javanese",
  display: "block",
  preload: false,
});

export const metadata: Metadata = {
  title: "KELIR — The Last Shadow Play",
  description:
    "A first-person browser horror game where light is your only weapon, rooted in Javanese wayang kulit shadow theatre.",
};

// Props typed by hand (not Next's generated `LayoutProps`) so `npx tsc --noEmit`
// passes on a clean clone before `.next/types` exists.
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // KELIR is dark-only; `dark` keeps shadcn's dark-surface variants active.
    <html
      lang="en"
      className={cn(
        "dark",
        inter.variable,
        cormorantGaramond.variable,
        notoSansJavanese.variable,
      )}
    >
      <body>{children}</body>
    </html>
  );
}
