"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { WbEntry } from "@/types/database";

export function Moodboard({
  projectId,
  projectTitle,
  entries,
  onEntriesChange,
}: {
  projectId: string;
  projectTitle: string;
  entries: WbEntry[];
  onEntriesChange: (entries: WbEntry[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    setUploading(true);

    const newEntries: WbEntry[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userData.user.id}/${projectId}/moodboard/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("wb-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) {
        console.error("Upload error", upErr);
        continue;
      }
      const { data: pub } = supabase.storage.from("wb-images").getPublicUrl(path);
      const { data: inserted, error: insErr } = await supabase
        .from("wb_entries")
        .insert({
          project_id: projectId,
          user_id: userData.user.id,
          category: "moodboard",
          title: file.name.replace(/\.[^.]+$/, ""),
          main_image_url: pub.publicUrl,
        })
        .select()
        .single();
      if (insErr || !inserted) continue;
      newEntries.push(inserted as WbEntry);
    }
    onEntriesChange([...newEntries, ...entries]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette image du moodboard ?")) return;
    const entry = entries.find((e) => e.id === id);
    if (entry?.main_image_url) {
      // Tenter de supprimer le fichier du storage
      const url = entry.main_image_url;
      const marker = "/wb-images/";
      const idx = url.indexOf(marker);
      if (idx >= 0) {
        const path = url.slice(idx + marker.length);
        await supabase.storage.from("wb-images").remove([path]);
      }
    }
    await supabase.from("wb_entries").delete().eq("id", id);
    onEntriesChange(entries.filter((e) => e.id !== id));
  }

  async function updateCaption(id: string, title: string) {
    await supabase.from("wb_entries").update({ title }).eq("id", id);
    onEntriesChange(
      entries.map((e) => (e.id === id ? { ...e, title } : e))
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-wider">
              {projectTitle} · World Building
            </div>
            <h1 className="text-[20px] font-semibold text-text-primary flex items-center gap-2 mt-0.5">
              <span>🎨</span>
              <span>MoodBoard</span>
            </h1>
            <div className="text-[11px] text-text-tertiary mt-0.5">
              {entries.length} image{entries.length > 1 ? "s" : ""}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {uploading && (
              <span className="text-[11px] text-text-tertiary">Upload en cours...</span>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-[12px] px-3 py-1.5 bg-primary text-white rounded hover:bg-primary-dark cursor-pointer disabled:opacity-50"
            >
              + Ajouter des images
            </button>
          </div>
        </div>

        {/* Masonry */}
        {entries.length === 0 ? (
          <div className="text-center py-16 text-text-tertiary text-[13px]">
            Ton moodboard est vide.
            <br />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 text-primary hover:underline cursor-pointer"
            >
              Téléverser les premières images
            </button>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:_balance]">
            {entries.map((e) => (
              <div
                key={e.id}
                className="break-inside-avoid mb-3 group relative bg-bg-secondary border border-border rounded overflow-hidden"
              >
                {e.main_image_url && (
                  <Image
                    src={e.main_image_url}
                    alt={e.title}
                    width={400}
                    height={600}
                    className="w-full h-auto block"
                    unoptimized
                  />
                )}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="w-6 h-6 bg-bg-primary/90 border border-border rounded text-[11px] text-text-tertiary hover:text-red-500 cursor-pointer"
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2">
                  {editingId === e.id ? (
                    <input
                      autoFocus
                      defaultValue={e.title}
                      onBlur={(ev) => {
                        updateCaption(e.id, ev.target.value);
                        setEditingId(null);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") {
                          updateCaption(e.id, ev.currentTarget.value);
                          setEditingId(null);
                        }
                        if (ev.key === "Escape") setEditingId(null);
                      }}
                      className="w-full text-[11px] px-1 py-0.5 bg-bg-primary border border-primary rounded focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(e.id)}
                      className="text-[11px] text-text-tertiary truncate w-full text-left hover:text-text-primary cursor-pointer"
                      title="Cliquer pour renommer"
                    >
                      {e.title || "Sans légende"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
