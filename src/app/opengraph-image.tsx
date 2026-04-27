import { ImageResponse } from "next/og";

// OpenGraph image — 1200×630, affichée quand un lien autris.app est partagé
// sur Twitter / Facebook / LinkedIn / Discord / Slack / iMessage.

export const alt = "Autris — L'espace d'écriture des romanciers francophones";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(228,180,140,0.10) 0%, transparent 55%), #1a1d2e",
          padding: "0 100px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: "#7a7163",
            marginBottom: 40,
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            fontWeight: 600,
          }}
        >
          ◆ &nbsp; Plume &nbsp; · &nbsp; Univers &nbsp; · &nbsp; Récit &nbsp; ◆
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 200,
            fontStyle: "italic",
            color: "#e4b48c",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            display: "flex",
          }}
        >
          Autris
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 36,
            color: "#e2d5c1",
            marginTop: 36,
            textAlign: "center",
            lineHeight: 1.3,
            display: "flex",
          }}
        >
          L&apos;espace d&apos;écriture des romanciers francophones
        </div>

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 18,
            color: "#544d44",
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
            letterSpacing: "0.08em",
            display: "flex",
          }}
        >
          autris.app
        </div>
      </div>
    ),
    size,
  );
}
