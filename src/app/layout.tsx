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

// Script anti-flash : lit le thème choisi depuis localStorage et l'applique
// sur <html> AVANT le premier paint. Sans ça, l'utilisatrice qui a choisi
// (ex.) SF clair verrait un flash de fantasy sombre (le défaut SSR) à
// chaque chargement.
const THEME_INIT_SCRIPT = `
(function(){try{
  var t=localStorage.getItem('autris.theme');
  var m=localStorage.getItem('autris.mode');
  var el=document.documentElement;
  if(t==='fantasy'||t==='sf'||t==='corporate')el.dataset.theme=t;
  if(m==='light'||m==='dark')el.dataset.mode=m;
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} h-full`}
      // Défauts SSR — surchargés avant paint par THEME_INIT_SCRIPT
      data-theme="fantasy"
      data-mode="dark"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {/* Polices des thèmes : Cormorant (fantasy), Space Grotesk (SF),
            JetBrains Mono. Inter est déjà chargé via next/font.
            Le lint no-page-custom-font vise le Pages Router : ici on est
            dans le <head> du RootLayout App Router, chargé pour toutes
            les pages — règle non applicable. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
