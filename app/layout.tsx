import type { Metadata } from "next";
import { Barlow_Condensed, Manrope } from "next/font/google";
import "./globals.css";

const display = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.GITHUB_PAGES === "true"
    ? "https://lochesystem.github.io/aurora-wilds-vr/"
    : "http://localhost:3000/");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Aurora Wilds VR — Sobrevivência WebXR",
  description: "Entre no mundo de Aurora Wilds pelo Meta Quest, corte árvores e minere pedras com as próprias mãos.",
  icons: { icon: "favicon.svg", shortcut: "favicon.svg" },
  openGraph: {
    title: "Aurora Wilds VR — Sobrevivência WebXR",
    description: "Um mundo procedural para explorar em realidade virtual.",
    images: [{ url: "og-vr.png", width: 1744, height: 902, alt: "Aurora Wilds VR" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurora Wilds VR — Sobrevivência WebXR",
    description: "Um mundo procedural para explorar em realidade virtual.",
    images: ["og-vr.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${body.variable}`}>{children}</body>
    </html>
  );
}
