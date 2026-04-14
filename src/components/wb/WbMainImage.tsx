"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

export function WbMainImage({
  entryId,
  projectId,
  value,
  onChange,
}: {
  entryId: string;
  projectId: string;
  value: string | null;
  onChange: (url: string | null) => void;
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

  return (
    <div className="mb-5">
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
