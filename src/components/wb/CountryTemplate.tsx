"use client";

import { useState, useEffect } from "react";

export interface CountryData {
  gouvernement?: string;
  dirigeant?: string;
  alliances?: string;
  environnement?: string;
  faune?: string;
  flore?: string;
  moeurs?: string;
  style_vie?: string;
  celebrations?: string;
  rites_sociaux?: string;
  climat?: string;
  phenomenes_naturels?: string;
  sanctuaires?: string;
  effets_etranges?: string;
  langue_locale?: string;
  dieu_associe?: string;
  personnages_notables?: string;
}

const SECTIONS: { group: string; icon: string; fields: { key: keyof CountryData; label: string; placeholder: string }[] }[] = [
  {
    group: "Gouvernement",
    icon: "🗺️",
    fields: [
      { key: "gouvernement", label: "Type de gouvernement", placeholder: "Royauté / Pharaonie / État militaire..." },
      { key: "dirigeant", label: "Dirigeant actuel", placeholder: "Nom + titre" },
      { key: "alliances", label: "Alliances / conflits / particularités", placeholder: "Résumé géopolitique, tensions, traités..." },
    ],
  },
  {
    group: "Faune / Flore",
    icon: "🌿",
    fields: [
      { key: "environnement", label: "Type d'environnement", placeholder: "Montagne, mer, jungle..." },
      { key: "faune", label: "Faune spécifique", placeholder: "Créatures, montures, bêtes sacrées..." },
      { key: "flore", label: "Flore notable", placeholder: "Arbres, plantes symboliques ou magiques" },
    ],
  },
  {
    group: "Mœurs",
    icon: "🧬",
    fields: [
      { key: "moeurs", label: "Religion, magie, famille", placeholder: "Rapport à la magie, place de l'individu, rôle de la famille" },
      { key: "style_vie", label: "Style de vie, lois sociales", placeholder: "Lois sociales ou familiales" },
    ],
  },
  {
    group: "Traditions & Rites",
    icon: "🔮",
    fields: [
      { key: "celebrations", label: "Célébrations", placeholder: "Nom : explication (une par ligne)" },
      { key: "rites_sociaux", label: "Rites sociaux (mariage/mort/naissance)", placeholder: "Comment sont-ils célébrés ou codifiés ?" },
    ],
  },
  {
    group: "Saisons & Climat",
    icon: "🌦️",
    fields: [
      { key: "climat", label: "Climat", placeholder: "Aride, tropical, inversé..." },
      { key: "phenomenes_naturels", label: "Phénomènes naturels", placeholder: "Marée chantante, hiver éternel..." },
    ],
  },
  {
    group: "Phénomènes magiques",
    icon: "🕯️",
    fields: [
      { key: "sanctuaires", label: "Sanctuaires / lieux sacrés", placeholder: "Nom + effet magique / lien divin" },
      { key: "effets_etranges", label: "Effets étranges", placeholder: "Plantes sensibles, brumes altérant la mémoire..." },
    ],
  },
  {
    group: "Liens utiles",
    icon: "🧭",
    fields: [
      { key: "langue_locale", label: "Langue locale", placeholder: "Nom de la langue parlée" },
      { key: "dieu_associe", label: "Dieu ou divinité associée", placeholder: "Nom de la divinité / panthéon" },
      { key: "personnages_notables", label: "Personnages notables", placeholder: "Noms (à lier plus tard)" },
    ],
  },
];

export function CountryTemplate({
  data,
  onChange,
}: {
  data: CountryData;
  onChange: (data: CountryData) => void;
}) {
  const [local, setLocal] = useState<CountryData>(data);

  useEffect(() => {
    setLocal(data);
  }, [data]);

  function update(key: keyof CountryData, value: string) {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-5">
      {SECTIONS.map((section) => (
        <div key={section.group}>
          <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold text-text-primary">
            <span>{section.icon}</span>
            <span>{section.group}</span>
          </div>
          <div className="flex flex-col gap-2 pl-6">
            {section.fields.map((f) => (
              <div key={f.key}>
                <label className="block text-[11px] text-text-tertiary mb-0.5">
                  {f.label}
                </label>
                <textarea
                  value={local[f.key] ?? ""}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={2}
                  className="w-full text-[12.5px] px-2 py-1.5 bg-bg-primary border border-border rounded resize-none focus:outline-none focus:border-primary"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
