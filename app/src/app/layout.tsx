import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Orbitron, Space_Grotesk, Playfair_Display, Lora, Fraunces, DM_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { getAppDisplayName } from "@/lib/i18n/app-brand";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fontVars = [
  geistSans.variable,
  geistMono.variable,
  orbitron.variable,
  spaceGrotesk.variable,
  playfair.variable,
  lora.variable,
  fraunces.variable,
  dmSans.variable,
].join(" ");

export const metadata: Metadata = {
  title: getAppDisplayName("en"),
  description: "Comprehensive personal productivity system with AI-powered features",
};

// Without an explicit export the production build ships no viewport meta tag,
// so phones fall back to the 980px legacy layout viewport and every
// fixed-position layer (topbar, FABs, dock) lands in the wrong place.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fontVars} h-full antialiased`}
      data-ui-theme="default"
      data-color-mode="light"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
