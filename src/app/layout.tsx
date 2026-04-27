import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const SITE_URL = "https://autris.app";
const SITE_NAME = "Autris";
const SITE_TAGLINE = "L'espace d'écriture des romanciers francophones";
const SITE_DESCRIPTION =
  "Worldbuilding, planification narrative et éditeur tout-en-un pour écrire vos romans. Trois mois d'essai gratuit, sans carte bancaire.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Chênerêve Éditions" }],
  creator: "Chênerêve Éditions",
  publisher: "Chênerêve Éditions",
  keywords: [
    "écriture",
    "roman",
    "romancier",
    "auteur",
    "worldbuilding",
    "planification",
    "outil d'écriture",
    "francophone",
    "édition indépendante",
  ],
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    // L'image OG est générée dynamiquement par src/app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    // Twitter image générée dynamiquement par src/app/twitter-image.tsx
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: "#1a1d2e",
  // Empêche le zoom auto iOS sur les inputs (font-size géré côté CSS)
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
