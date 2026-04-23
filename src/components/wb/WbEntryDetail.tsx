"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WbEntry, WbLink, WbStatus } from "@/types/database";
import {
  WB_STATUSES,
  getCategoryDef,
  UNIVERS_SUBTYPES,
  BESTIAIRE_SUBCATEGORIES,
} from "@/lib/wb-constants";
import { getTemplate } from "@/lib/wb-templates";
import { toneFor } from "@/lib/wb-tones";
import { DynamicTemplate } from "./DynamicTemplate";
import { WbMainImage } from "./WbMainImage";
import { WbGallery } from "./WbGallery";
import { WbTagsEditor } from "./WbTagsEditor";
import { WbLinksEditor } from "./WbLinksEditor";

export function WbEntryDetail({
  entry,
  projectId,
  allEntries,
  projectTags,
  entryLinks,
  onSelectEntry,
  onLinkAdded,
  onLinkRemoved,
  onUpdate,
  onDelete,
  onClose,
}: {
  entry: WbEntry;
  projectId: string;
  allEntries: WbEntry[];
  projectTags: string[];
  entryLinks: WbLink[];
  onSelectEntry: (id: string) => void;
  onLinkAdded: (link: WbLink) => void;
  onLinkRemoved: (id: string) => void;
  onUpdate: (entry: WbEntry) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<WbEntry>(entry);
  const [saving, setSaving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    setLocal(entry);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (!entry.title?.trim()) {
      requestAnimationFrame(() => titleInputRef.current?.focus());
    }
  }, [entry]);

  function scheduleSave(next: WbEntry) {
    setLocal(next);
    onUpdate(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSaving(true);
      await supabase
        .from("wb_entries")
        .update({
          title: next.title,
          subtitle: next.subtitle,
          description: next.description,
          template_data: next.template_data,
          personal_notes: next.personal_notes,
          status: next.status,
          subcategory: next.subcategory,
        })
        .eq("id", next.id);
      setSaving(false);
    }, 800);
  }

  async function handleDelete() {
    if (!confirm(`Supprimer définitivement "${local.title}" ?`)) return;
    await supabase.from("wb_entries").delete().eq("id", local.id);
    onDelete(local.id);
  }

  const template = getTemplate(local.category, local.subcategory);
  const catDef = getCategoryDef(local.category);

  // Liste des sous-catégories disponibles pour rendre les chips "Catégorie".
  const subList = useMemo(() => {
    if (local.category === "univers_monde") {
      return UNIVERS_SUBTYPES.map((s) => ({
        key: s.key,
        label: s.label,
        icon: s.icon as string | undefined,
      }));
    }
    if (local.category === "bestiaire") {
      return BESTIAIRE_SUBCATEGORIES.map((s) => ({
        key: s.key,
        label: s.label,
        icon: undefined as string | undefined,
      }));
    }
    return [];
  }, [local.category]);

  // Navigation prev/next : fiches frères (même catégorie, non archivés).
  const siblings = useMemo(() => {
    return allEntries
      .filter((e) => e.category === local.category && e.status !== "archive")
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
  }, [allEntries, local.category]);

  const currentIdx = siblings.findIndex((e) => e.id === local.id);
  const prev = currentIdx > 0 ? siblings[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < siblings.length - 1
    ? siblings[currentIdx + 1]
    : null;

  const statusDef = WB_STATUSES.find((s) => s.key === local.status);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bg-primary">
      <div className="max-w-[1280px] mx-auto px-8 py-5">
        {/* === Action bar === */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-[var(--radius-md)] text-[12px] text-text-secondary hover:text-text-primary hover:bg-white/[0.04] cursor-pointer transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Retour aux fiches
            </button>

            {/* Pill MODE ÉDITION */}
            <span
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[10.5px] font-medium uppercase"
              style={{
                letterSpacing: "0.16em",
                background: "var(--color-accent-bg)",
                borderColor: "var(--color-accent-border)",
                color: "var(--color-accent)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)]" />
              Mode édition
            </span>

            {siblings.length > 1 && currentIdx >= 0 && (
              <>
                <span className="text-text-quaternary/40 text-[11px]">/</span>
                <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
                  <span className="font-serif italic">Fiche {currentIdx + 1}</span>
                  <span className="opacity-40">/ {siblings.length}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    disabled={!prev}
                    onClick={() => prev && onSelectEntry(prev.id)}
                    className="w-7 h-7 rounded-[var(--radius-sm)] bg-bg-secondary border border-white/[0.06] text-text-tertiary hover:text-text-primary hover:border-white/[0.1] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    title={prev?.title || "Fiche précédente"}
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M8.5 3.5L5 7L8.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    disabled={!next}
                    onClick={() => next && onSelectEntry(next.id)}
                    className="w-7 h-7 rounded-[var(--radius-sm)] bg-bg-secondary border border-white/[0.06] text-text-tertiary hover:text-text-primary hover:border-white/[0.1] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                    title={next?.title || "Fiche suivante"}
                  >
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                      <path d="M5.5 3.5L9 7L5.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Indicateur auto-save */}
            <span className="inline-flex items-center gap-1.5 text-[11px] text-text-quaternary">
              {saving ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
                  <span className="font-serif italic">Sauvegarde…</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-teal" />
                  <span className="font-serif italic">Auto · enregistré</span>
                </>
              )}
            </span>
            <div className="relative">
              <select
                value={local.status}
                onChange={(e) => scheduleSave({ ...local, status: e.target.value as WbStatus })}
                className="h-8 pl-5 pr-6 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.06] text-[11.5px] text-text-secondary cursor-pointer appearance-none hover:border-white/[0.1]"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23737687' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 6px center",
                }}
              >
                {WB_STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span
                className={`pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${
                  local.status === "valide"
                    ? "bg-teal"
                    : local.status === "archive"
                      ? "bg-white/30"
                      : "bg-[var(--color-accent)]"
                }`}
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-[var(--radius-md)] bg-bg-secondary border border-white/[0.06] text-text-tertiary hover:text-text-primary hover:border-white/[0.1] cursor-pointer flex items-center justify-center"
                title="Plus d'options"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor">
                  <circle cx="3" cy="7" r="1.2" />
                  <circle cx="7" cy="7" r="1.2" />
                  <circle cx="11" cy="7" r="1.2" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-[180px] bg-bg-tertiary border border-white/[0.08] rounded-[var(--radius-md)] shadow-xl z-20 py-1.5">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleDelete();
                      }}
                      className="w-full text-left px-3 py-2 text-[12px] text-text-secondary hover:bg-white/[0.04] hover:text-red-400 cursor-pointer flex items-center gap-2"
                    >
                      <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                        <path d="M3 4H11M5 4V3C5 2.45 5.45 2 6 2H8C8.55 2 9 2.45 9 3V4M4.5 4L5 11.5C5 12.05 5.45 12.5 6 12.5H8C8.55 12.5 9 12.05 9 11.5L9.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Supprimer la fiche
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* === Zone Identité : image carrée + titre / sous-titre / catégorie chips === */}
        <div className="grid grid-cols-12 gap-6 mb-6 pb-6 border-b border-white/[0.05]">
          {/* Image drop square */}
          <div className="col-span-12 md:col-span-4 lg:col-span-3">
            <WbMainImage
              entryId={local.id}
              projectId={projectId}
              value={local.main_image_url}
              variant="drop-square"
              onChange={(url) => {
                const n = { ...local, main_image_url: url };
                setLocal(n);
                onUpdate(n);
              }}
            />
          </div>

          {/* Titre + Sous-titre + Catégorie chips */}
          <div className="col-span-12 md:col-span-8 lg:col-span-9 flex flex-col gap-4">
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className="text-[10px] font-medium text-text-quaternary uppercase"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Nom de la fiche
                </span>
                <span className="font-serif italic text-[13px] text-[var(--color-accent)]">
                  *
                </span>
              </div>
              <input
                ref={titleInputRef}
                value={local.title}
                onChange={(e) => scheduleSave({ ...local, title: e.target.value })}
                placeholder="Nomme cette fiche…"
                className="w-full bg-transparent border-none focus:outline-none text-text-primary placeholder:text-text-quaternary placeholder:italic font-serif text-[38px] leading-[1.05] tracking-tight py-1 border-b border-white/[0.06] focus:border-[var(--color-accent-border)] transition-colors"
                style={{ borderBottomWidth: "1px" }}
              />
            </div>

            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span
                  className="text-[10px] font-medium text-text-quaternary uppercase"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Sous-titre <span className="opacity-60">/ surnom</span>
                </span>
                <span className="font-serif italic text-[10px] text-text-quaternary/70">
                  — optionnel
                </span>
              </div>
              <input
                value={local.subtitle ?? ""}
                onChange={(e) => scheduleSave({ ...local, subtitle: e.target.value })}
                placeholder="Un surnom, une désignation poétique…"
                className="w-full bg-transparent border-none focus:outline-none font-serif italic text-[17px] text-[var(--color-accent)] placeholder:text-text-quaternary/70 py-0.5"
              />
            </div>

            {/* Chips Catégorie (pour univers_monde / bestiaire) */}
            {subList.length > 0 && (
              <div>
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase mb-2"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Catégorie
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {subList.map((s) => {
                    const active = local.subcategory === s.key;
                    const tone = toneFor(local.category, s.key);
                    return (
                      <button
                        key={s.key}
                        onClick={() =>
                          scheduleSave({ ...local, subcategory: s.key })
                        }
                        className="h-7 inline-flex items-center gap-1.5 px-3 rounded-full text-[11.5px] cursor-pointer transition-colors border"
                        style={{
                          background: active ? tone.bg : "rgba(255,255,255,0.02)",
                          borderColor: active ? tone.border : "rgba(255,255,255,0.05)",
                          color: active ? tone.text : "var(--text-tertiary, #737687)",
                        }}
                      >
                        {s.icon && <span className="text-[12px] leading-none">{s.icon}</span>}
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cas fiche sans sous-catégorie : afficher la catégorie comme chip simple */}
            {subList.length === 0 && catDef && (
              <div>
                <div
                  className="text-[10px] font-medium text-text-quaternary uppercase mb-2"
                  style={{ letterSpacing: "0.16em" }}
                >
                  Catégorie
                </div>
                <span
                  className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11.5px] border"
                  style={{
                    background: toneFor(local.category).bg,
                    borderColor: toneFor(local.category).border,
                    color: toneFor(local.category).text,
                  }}
                >
                  <span className="text-[12px] leading-none">{catDef.icon}</span>
                  {catDef.label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* === 2-col content === */}
        <div className="grid grid-cols-12 gap-4">
          {/* Colonne principale */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            {template ? (
              <DynamicTemplate
                template={template}
                data={local.template_data ?? {}}
                onChange={(data) => scheduleSave({ ...local, template_data: data })}
                renderAsCards
              />
            ) : (
              <Card icon="📝" title="Description">
                <textarea
                  value={local.description}
                  onChange={(e) => scheduleSave({ ...local, description: e.target.value })}
                  rows={10}
                  placeholder="Décris cette fiche…"
                  className="w-full text-[13px] leading-relaxed px-3 py-2 bg-white/[0.02] border border-white/[0.06] rounded-[var(--radius-md)] resize-none focus:outline-none focus:border-[var(--color-accent-border)] focus:bg-white/[0.03] text-text-primary placeholder:text-text-quaternary transition-colors"
                />
              </Card>
            )}

            <Card
              icon="💬"
              title={
                <span>
                  Notes <span className="font-serif italic text-[var(--color-accent)]">personnelles</span>
                  <span className="text-text-quaternary font-sans italic ml-2 text-[12px]">
                    — hors worldbuilding
                  </span>
                </span>
              }
              accent
            >
              <textarea
                value={local.personal_notes}
                onChange={(e) => scheduleSave({ ...local, personal_notes: e.target.value })}
                rows={5}
                placeholder="Idées narratives, scènes à écrire, intrigues potentielles…"
                className="w-full text-[13px] leading-relaxed px-3 py-2 bg-transparent border-none resize-none focus:outline-none text-text-secondary placeholder:text-text-quaternary/80 font-serif italic"
              />
            </Card>

            <Card
              icon="🖼"
              title="Galerie"
              titleAccent={`${local.gallery?.length ?? 0} / 10`}
            >
              <WbGallery
                entryId={local.id}
                projectId={projectId}
                value={local.gallery}
                onChange={(gallery) => {
                  const n = { ...local, gallery };
                  setLocal(n);
                  onUpdate(n);
                }}
                embedded
              />
            </Card>
          </div>

          {/* Colonne latérale */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">
            <Card icon="ⓘ" title="Informations">
              <InfoList
                items={[
                  {
                    label: "Catégorie",
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-[13px]">{catDef?.icon}</span>
                        <span>
                          {(subList.find((s) => s.key === local.subcategory)?.label) ??
                            catDef?.label}
                        </span>
                      </span>
                    ),
                  },
                  {
                    label: "Créée le",
                    value: formatDate(local.created_at),
                  },
                  {
                    label: "Modifiée",
                    value: relativeTime(local.updated_at),
                  },
                  {
                    label: "Statut",
                    value: (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            local.status === "valide"
                              ? "bg-teal"
                              : local.status === "archive"
                                ? "bg-white/30"
                                : "bg-[var(--color-accent)]"
                          }`}
                        />
                        <span>{statusDef?.label ?? local.status}</span>
                      </span>
                    ),
                  },
                ]}
              />
            </Card>

            <Card icon="🏷" title="Tags">
              <WbTagsEditor
                entryId={local.id}
                value={local.tags}
                onChange={(tags) => {
                  const n = { ...local, tags };
                  setLocal(n);
                  onUpdate(n);
                }}
                projectTags={projectTags}
                embedded
              />
            </Card>

            <Card
              icon="🔗"
              title="Liens"
              titleAccent={entryLinks.length > 0 ? `${entryLinks.length}` : undefined}
            >
              <WbLinksEditor
                entry={local}
                allEntries={allEntries}
                links={entryLinks}
                onSelectEntry={onSelectEntry}
                onLinkAdded={onLinkAdded}
                onLinkRemoved={onLinkRemoved}
                embedded
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== Sub-components ========== */

function Card({
  icon,
  title,
  titleAccent,
  accent,
  children,
}: {
  icon?: string;
  title: React.ReactNode;
  titleAccent?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--radius-lg)] border p-4 ${
        accent
          ? "border-[var(--color-accent-border)]/50 bg-[var(--color-accent-bg)]/20"
          : "border-white/[0.06] bg-bg-tertiary/50"
      }`}
    >
      <header className="flex items-center gap-2 mb-3">
        {icon && (
          <span
            className="flex items-center justify-center w-6 h-6 rounded-[var(--radius-sm)] bg-white/[0.04] text-[12px]"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <h3 className="text-[13.5px] text-text-primary font-medium">{title}</h3>
        {titleAccent && (
          <span className="text-[11px] text-text-quaternary ml-auto font-serif italic">
            {titleAccent}
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function InfoList({
  items,
}: {
  items: { label: string; value: React.ReactNode }[];
}) {
  return (
    <dl className="flex flex-col gap-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between gap-3 text-[12px]">
          <dt className="text-text-tertiary">{it.label}</dt>
          <dd className="text-text-primary text-right">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return formatDate(iso);
}
