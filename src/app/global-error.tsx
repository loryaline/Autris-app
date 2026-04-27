"use client";

import { useEffect } from "react";

/**
 * Error boundary racine — attrapé quand l'erreur survient dans le layout
 * racine lui-même (avant que les styles soient chargés). Doit définir son
 * propre <html> et <body>. Volontairement minimaliste : pas de fonts, pas
 * de Tailwind, juste du CSS inline pour rester lisible même si tout le
 * reste a échoué.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[autris] erreur racine :", error);
  }, [error]);

  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1d2e",
          color: "#e2d5c1",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center" }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#544d44",
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            Erreur fatale
          </div>
          <h1
            style={{
              fontSize: 28,
              lineHeight: 1.2,
              marginTop: 0,
              marginBottom: 12,
              fontFamily: "Georgia, serif",
            }}
          >
            Le site n&apos;a pas pu charger correctement.
          </h1>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "#a89e8d",
              marginBottom: 24,
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}
          >
            C&apos;est de notre côté. Vos données sont intactes.
          </p>
          {error?.digest && (
            <p
              style={{
                fontSize: 11,
                color: "#544d44",
                marginBottom: 20,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              Référence : {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              height: 40,
              padding: "0 20px",
              borderRadius: 8,
              border: "none",
              background: "#e4b48c",
              color: "#2a1a10",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
