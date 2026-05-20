import type { FullInterpretation, PosterOutput } from "../types";
import { renderPosterSvg } from "../poster-svg";

/**
 * AGENT 06 — GENERATIVE OUTPUT ENGINE
 *
 * Production responsibilities:
 *   • Riceve FullInterpretation (place + mood + map + art + type).
 *   • Compone il poster finale come SVG vettoriale puro (no raster).
 *   • Produce varianti: verticale (A2/A3), quadrato (social),
 *     wallpaper (3840x2160), preview (1080x1620 per condivisione).
 *   • Esporta:
 *       - SVG originale (per stampa fine art)
 *       - PNG ad alta risoluzione via sharp/resvg
 *       - JPG ottimizzato per social
 *       - PDF/X-1a se l'utente ordina la stampa
 *
 * Vincolo qualitativo: ogni output deve passare il "test della
 * galleria" — se vista accanto a una stampa Mads Berg / Justus
 * Hirvi / Anders Nilsen, non deve sembrare AI.
 *
 * Questo MVP genera direttamente l'SVG verticale tramite
 * lib/poster-svg.ts. Le varianti raster sono predisposte ma
 * lasciate al rendering server (sharp).
 */
export async function generatePoster(full: FullInterpretation): Promise<PosterOutput> {
  const { svg, width, height } = renderPosterSvg(full, "vertical-portrait");
  return { svg, width, height, format: "vertical-portrait" };
}
