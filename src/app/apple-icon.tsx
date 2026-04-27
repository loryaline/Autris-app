import { ImageResponse } from "next/og";

// Apple Touch Icon — 180×180, fond navy + « A » italique serif accent peach.
// Affiché quand l'utilisatrice ajoute autris.app à son écran d'accueil iOS.

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1d2e",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            fontSize: 130,
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            color: "#e4b48c",
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          A
        </div>
      </div>
    ),
    size,
  );
}
