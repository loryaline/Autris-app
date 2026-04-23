"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function WbMainImage({
  entryId,
  projectId,
  value,
  onChange,
  variant = "default",
}: {
  entryId: string;
  projectId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  /**
   * "default" : encadré avec prévisualisation intégrée.
   * "hero-controls" : rend uniquement les boutons Remplacer/Retirer/Ajouter,
   *   sans cadre ni image ; l'image est rendue par le parent (hero banner).
   * "drop-square" : zone carrée compacte type dépose-ton-image
   *   (pour la zone identité en mode édition).
   */
  variant?: "default" | "hero-controls" | "drop-square";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  async function upload(file: File) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setBusy(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${userData.user.id}/${projectId}/entries/${entryId}/main-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("wb-images")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) {
      console.error(error);
      setBusy(false);
      return;
    }
    const { data: pub } = supabase.storage.from("wb-images").getPublicUrl(path);

    // Supprimer l'ancienne image si elle existait
    if (value) await removeStorageObject(value);

    await supabase
      .from("wb_entries")
      .update({ main_image_url: pub.publicUrl })
      .eq("id", entryId);
    onChange(pub.publicUrl);
    setBusy(false);
  }

  async function removeStorageObject(url: string) {
    const marker = "/wb-images/";
    const idx = url.indexOf(marker);
    if (idx < 0) return;
    const path = url.slice(idx + marker.length);
    await supabase.storage.from("wb-images").remove([path]);
  }

  async function handleRemove() {
    if (!value) return;
    if (!confirm("Retirer l'image principale ?")) return;
    setBusy(true);
    await removeStorageObject(value);
    await supabase
      .from("wb_entries")
      .update({ main_image_url: null })
      .eq("id", entryId);
    onChange(null);
    setBusy(false);
  }

  // Input file partagé, monté quelle que soit la variante
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) upload(f);
        if (inputRef.current) inputRef.current.value = "";
      }}
    />
  );

  if (variant === "drop-square") {
    return (
      <>
        {fileInput}
        {value ? (
          <div className="relative group aspect-square rounded-[var(--radius-lg)] overflow-hidden border border-white/[0.06] bg-bg-tertiary/40">
            <Image
              src={value}
              alt="Image principale"
              fill
              className="object-cover"
              unoptimized
            />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center gap-1.5 p-2 bg-gradient-to-t from-black/70 via-transparent to-transparent">
              <button
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="text-[11px] px-2.5 h-7 bg-black/50 backdrop-blur-sm border border-white/[0.15] rounded-[var(--radius-sm)] text-white/90 hover:border-white/30 cursor-pointer disabled:opacity-50"
              >
                Remplacer
              </button>
              <button
                onClick={handleRemove}
                disabled={busy}
                className="text-[11px] px-2.5 h-7 bg-black/50 backdrop-blur-sm border border-white/[0.15] rounded-[var(--radius-sm)] text-white/80 hover:text-red-400 hover:border-white/30 cursor-pointer disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="group aspect-square w-full rounded-[var(--radius-lg)] border border-dashed border-white/[0.1] bg-white/[0.02] hover:bg-white/[0.03] hover:border-[var(--color-accent-border)] flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors disabled:opacity-60"
          >
            <span
              className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-accent-border)] text-[var(--color-accent)]"
              aria-hidden
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 16L8 12L12 16L20 8M4 20H20"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div className="text-[12px] text-text-tertiary text-center leading-snug font-serif italic px-4">
              {busy ? (
                "Upload en cours…"
              ) : (
                <>
                  Dépose une image
                  <br />
                  <span className="text-text-quaternary not-italic font-sans">
                    ou clique pour parcourir
                  </span>
                </>
              )}
            </div>
            <div className="text-[9.5px] text-text-quaternary uppercase" style={{ letterSpacing: "0.18em" }}>
              PNG · JPG · WEBP · 10 Mo max
            </div>
          </button>
        )}
      </>
    );
  }

  if (variant === "hero-controls") {
    return (
      <>
        {fileInput}
        {value ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="text-[11px] px-2.5 h-7 bg-black/40 backdrop-blur-sm border border-white/[0.15] rounded-[var(--radius-sm)] text-white/90 hover:border-white/30 cursor-pointer disabled:opacity-50"
            >
              Remplacer
            </button>
            <button
              onClick={handleRemove}
              disabled={busy}
              className="text-[11px] px-2.5 h-7 bg-black/40 backdrop-blur-sm border border-white/[0.15] rounded-[var(--radius-sm)] text-white/80 hover:text-red-400 hover:border-white/30 cursor-pointer disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-[11px] px-2.5 h-7 bg-white/[0.04] border border-white/[0.1] rounded-[var(--radius-sm)] text-text-tertiary hover:text-[var(--color-accent)] hover:border-[var(--color-accent-border)] cursor-pointer disabled:opacity-50"
          >
            {busy ? "Upload…" : "+ Image principale"}
          </button>
        )}
      </>
    );
  }

  return (
    <div className="mb-5">
      {fileInput}
      {value ? (
        <div className="relative group rounded overflow-hidden border border-border">
          <Image
            src={value}
            alt="Image principale"
            width={800}
            height={400}
            className="w-full h-auto max-h-[260px] object-cover"
            unoptimized
          />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="text-[11px] px-2 py-1 bg-bg-primary/90 border border-border rounded hover:border-primary cursor-pointer disabled:opacity-50"
            >
              Remplacer
            </button>
            <button
              onClick={handleRemove}
              disabled={busy}
              className="text-[11px] px-2 py-1 bg-bg-primary/90 border border-border rounded hover:text-red-500 cursor-pointer disabled:opacity-50"
            >
              Retirer
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full text-[12px] py-6 border border-dashed border-border rounded text-text-tertiary hover:border-primary hover:text-primary cursor-pointer disabled:opacity-50"
        >
          {busy ? "Upload en cours..." : "+ Ajouter une image principale"}
        </button>
      )}
    </div>
  );
}
