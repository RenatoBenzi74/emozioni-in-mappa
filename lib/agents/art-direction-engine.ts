import type { VisualMood, ArtDirection } from "../types";

/**
 * AGENT 04 — ART DIRECTION ENGINE
 *
 * Production prompt (Claude reasoning, structured output):
 * ---------------------------------------------------------------
 * Sei un art director di una galleria di stampe contemporanee.
 * Ricevi un VisualMood (palette + atmosfera misurabile). Il tuo
 * compito è scrivere una direzione artistica precisa per la
 * composizione di un poster stampabile.
 *
 * Regole non negoziabili:
 *   • Less is more: la mappa è il soggetto, niente illustrazioni
 *     decorative, niente icone, niente skyline, niente sticker.
 *   • Le emozioni emergono dalla composizione, mai dalla retorica.
 *     Lo stile dice tutto.
 *   • Il rapporto spazio negativo / segno deve essere coerente
 *     con la densità del mood:
 *       rarefatta → 0.62..0.72
 *       media → 0.48..0.58
 *       densa → 0.32..0.44
 *   • Background = il colore "background" della palette.
 *   • Ink = il colore "ink" della palette. Mai nero puro #000.
 *   • Accent = usato per al massimo un elemento (acqua, asse, segno).
 *   • Stroke weight: scegli pesi che mantengano leggibilità a
 *     stampa A2 (≥ 0.4 mm equivalente).
 *
 * Restituisci JSON conforme ad ArtDirection.
 * Niente commenti, niente testo libero fuori dal JSON.
 * ---------------------------------------------------------------
 */
export async function directArt(mood: VisualMood): Promise<ArtDirection> {
  const bg = mood.palette.find((c) => c.role === "background")?.hex ?? mood.palette[0].hex;
  const ink = mood.palette.find((c) => c.role === "ink")?.hex ?? "#1a1a1a";
  const accent = mood.palette.find((c) => c.role === "accent")?.hex ?? mood.palette[1].hex;
  const highlight = mood.palette.find((c) => c.role === "highlight")?.hex ?? mood.palette[2].hex;

  const negativeSpaceRatio = mood.density === "rarefatta" ? 0.68 : mood.density === "densa" ? 0.38 : 0.52;

  const strokeWeight =
    mood.density === "rarefatta"
      ? { primary: 1.2, secondary: 0.8, tertiary: 0.45 }
      : mood.density === "densa"
      ? { primary: 0.9, secondary: 0.55, tertiary: 0.28 }
      : { primary: 1.0, secondary: 0.7, tertiary: 0.35 };

  return {
    layout: "vertical-portrait",
    composition: "lower-third",
    background: bg,
    inkColor: ink,
    accentColor: accent,
    highlightColor: highlight,
    strokeWeight,
    negativeSpaceRatio,
    graininess: mood.atmosphere.includes("nostalgico") ? 0.55 : 0.25
  };
}
