"use client";

import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { createClient } from "@/lib/supabase/client";
import { FloatingToolbar } from "@/components/editor/FloatingToolbar";

/**
 * Onglet « Synopsis » de la planification.
 *
 * Éditeur de texte riche dédié au synopsis du roman (novels.synopsis) —
 * comme l'éditeur de rédaction mais sans les panneaux latéraux. Sert de
 * support aux étapes « La page » et « Le synopsis » de la méthode Snowflake.
 */
export function SynopsisView({
  novelId,
  initialSynopsis,
}: {
  novelId: string;
  initialSynopsis: string;
}) {
  const supabaseRef = useRef(createClient());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"saved" | "saving">("saved");

  // Contenu initial figé — évite que useEditor ré-instancie l'éditeur.
  const [initialContent] = useState<string>(
    () => (initialSynopsis ?? "").trim() || "<p></p>",
  );

  const save = useCallback(
    async (html: string) => {
      setStatus("saving");
      try {
        await supabaseRef.current
          .from("novels")
          .update({ synopsis: html })
          .eq("id", novelId);
      } finally {
        setStatus("saved");
      }
    },
    [novelId],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    enableInputRules: false,
    enablePasteRules: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({
        placeholder: "Rédigez ici le synopsis de votre roman…",
        showOnlyWhenEditable: true,
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: "tiptap",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(html), 1500);
    },
  });

  return (
    <div className="editor-paper flex-1">
      <FloatingToolbar editor={editor} />

      <div
        className="absolute top-3 right-3 z-30 text-[11px] px-2 py-0.5 rounded-full"
        style={{
          background: "var(--surface)",
          color: status === "saving" ? "var(--accent)" : "var(--text-4)",
          border: "1px solid var(--border-soft)",
        }}
      >
        {status === "saving" ? "Sauvegarde…" : "Sauvegardé"}
      </div>

      <div className="editor-scroll">
        <div className="paper-sheet">
          <div className="paper-prose">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </div>
  );
}
