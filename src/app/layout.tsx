import type { Metadata, Viewport } from "next";
import {
  Inter,
  Cormorant_Garamond,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

// Polices auto-hébergées via next/font : aucune requête externe, pas de
// décalage de mise en page. Exposées en variables CSS, consommées par les
// tokens de thème (--font-display / --font-sans / --font-mono).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const SITE_URL = "https://autris.app";
const SITE_NAME = "Autris";
const SITE_TAGLINE = "L'espace d'écriture des romanciers francophones";
const SITE_DESCRIPTION =
  "Worldbuilding, planification narrative et éditeur tout-en-un pour écrire vos romans. Gratuit pendant la bêta.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Autris" }],
  creator: "Autris",
  publisher: "Autris",
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
      className={`${inter.variable} ${cormorant.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full`}
      // Défauts SSR — surchargés avant paint par THEME_INIT_SCRIPT
      data-theme="fantasy"
      data-mode="dark"
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
