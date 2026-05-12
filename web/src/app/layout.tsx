import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: {
    default: "México Bajo Lupa — Auditoría ciudadana de datos públicos",
    template: "%s · México Bajo Lupa",
  },
  description:
    "Mapa estadístico crítico de México. Cruza seguridad, gasto público, transparencia y compras del gobierno. No describe — cuestiona.",
  keywords: [
    "México",
    "datos abiertos",
    "transparencia",
    "auditoría ciudadana",
    "Benford",
    "SESNSP",
    "ComprasMX",
    "INEGI",
    "CONEVAL",
    "incidencia delictiva",
    "anticorrupción",
  ],
  authors: [{ name: "México Bajo Lupa" }],
  openGraph: {
    title: "México Bajo Lupa",
    description:
      "Auditoría ciudadana de datos públicos mexicanos. Seguridad, gasto y compras del gobierno cruzados con estadística forense.",
    locale: "es_MX",
    type: "website",
    siteName: "México Bajo Lupa",
  },
  twitter: {
    card: "summary_large_image",
    title: "México Bajo Lupa",
    description:
      "Auditoría ciudadana de datos públicos mexicanos. No describe, cuestiona.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es-MX"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-midnight-void text-cloud-whisper">
        <SiteHeader />
        <main id="main" className="flex-1 flex flex-col">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
