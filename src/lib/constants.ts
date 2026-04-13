import type { Genre } from "@/types/database";

export const GENRES: { value: Genre; label: string; emoji: string }[] = [
  { value: "fantasy", label: "Fantasy", emoji: "🐉" },
  { value: "sf", label: "Science-fiction", emoji: "🚀" },
  { value: "thriller", label: "Thriller", emoji: "🔪" },
  { value: "polar", label: "Polar", emoji: "🔍" },
  { value: "horreur", label: "Horreur", emoji: "👻" },
  { value: "romance", label: "Romance", emoji: "💕" },
  { value: "historique", label: "Historique", emoji: "📜" },
  { value: "contemporain", label: "Contemporain", emoji: "🏙️" },
];

export const GENRE_TO_THEME: Record<Genre, string> = {
  fantasy: "fantasy",
  sf: "sf",
  thriller: "polar",
  polar: "polar",
  horreur: "horreur",
  romance: "romance",
  historique: "historique",
  contemporain: "blanc",
};
