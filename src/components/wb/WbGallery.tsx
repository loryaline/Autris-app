"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 10;

export function WbGallery({
  entryId,
  projectId,
  value,
  onChange,
}: {
  entryId: string;
  projectId: string;
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const supabase = createClient();

  async function persist(next: string[]) {
    onChange(next);
    await supabase.from("wb_entries").update({ gallery: next }).eq("id", entryId);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setBusy(true);
    const remaining = MAX_IMAGES - value.length;
    const picked = Array.from(files).slice(0, remaining);
    const uploaded: string[] = [];
    for (const file of picked) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userData.user.id}/${projectId}/entries/${entryId}/gal-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("wb-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) {
        console.error(error);
        continue;
      }
      const { data: pub } = supabase.storage.from("wb-images").getPublicUrl(path);
      uploaded.push(pub.publicUrl);
    }
    if (uploaded.length > 0) await persist([...value, ...uploaded]);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function removeAt(idx: number) {
    const url = value[idx];
    const marker = "/wb-images/";
    const i = url.indexOf(marker);
    if (i >= 0) {
      await supabase.storage.from("wb-images").remove([url.slice(i + marker.length)]);
    }
    const next = value.filter((_, k) => k !== idx);
    await persist(next);
  }

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
  }

  const canAdd = value.length < MAX_IMAGES;

  return (
    <div className="mt-6 border-t border-border pt-4">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-[11px] font-medium text-text-tertiary uppercase tracking-wider">
          🖼 Galerie ({value.length}/{MAX_IMAGES})
        </label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy || !canAdd}
          className="text-[11px] px-2 py-1 text-primary hover:underline cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
        >
          {busy ? "Upload..." : canAdd ? "+ Ajouter" : "Maximum atteint"}
        </button>
      </div>
      {value.length === 0 ? (
        <div className="text-[11px] text-text-quaternary italic">
          Aucune image secondaire. Glisse-dépose des images pour enrichir la fiche.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {value.map((url, idx) => (
            <div
              key={url}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null) reorder(dragIdx, idx);
                setDragIdx(null);
              }}
              onDragEnd={() => setDragIdx(null)}
              className={`relative group aspect-square rounded overflow-hidden border border-border cursor-move ${
                dragIdx === idx ? "opacity-40" : ""
              }`}
              title="Glisser pour réordonner"
            >
              <Image
                src={url}
                alt={`Image ${idx + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 w-5 h-5 bg-bg-primary/90 border border-border rounded text-[10px] text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                title="Retirer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
