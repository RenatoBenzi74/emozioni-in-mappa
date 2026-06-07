import type { PlaceIdentity, VisualMood, AtmosphereWord } from "../types";

/**
 * AGENT 02 — VISUAL MOOD ANALYZER
 *
 * Production prompt (Claude / GPT-4o vision):
 * ---------------------------------------------------------------
 * Sei un direttore artistico discreto. Ti vengono fornite 3 o più
 * fotografie scattate dallo stesso viaggiatore. Non sai dove sono
 * state scattate, e non ti interessa: guardi solo il loro linguaggio
 * visivo.
 *
 * Il tuo compito è scrivere una "interpretazione cromatica e
 * atmosferica" del set, NON una descrizione letterale del contenuto.
 *
 * Procedi in quattro passi (non mostrarli all'utente):
 *   1. Identifica la palette dominante: 4–6 colori massimo, restituiti
 *      in esadecimale, ordinati per ruolo (background, ink, accento,
 *      luce, ombra). Bilancia per superficie occupata, non per
 *      saturazione.
 *   2. Stima quantità misurabili: luminosità media, contrasto medio,
 *      saturazione media (0..1 ciascuna) e una temperatura cromatica
 *      categorica (calda / fredda / neutra).
 *   3. Valuta densità visiva (rarefatta / media / densa) e ritmo
 *      compositivo (regolare / spezzato / fluido).
 *   4. Scegli 2–4 parole atmosfera dal vocabolario consentito:
 *      delicato, urbano, rarefatto, caldo, freddo, silenzioso,
 *      vibrante, geometrico, organico, nostalgico, mediterraneo,
 *      nordico, industriale, intimo, arioso, minerale, luce.
 *      Mai più di quattro. Mai parole emotive banali (felice, triste).
 *
 * Restituisci JSON conforme allo schema VisualMood. Non aggiungere
 * commenti né testo libero al di fuori del JSON.
 *
 * Tono: sobrio, mai promozionale, mai retorico.
 * ---------------------------------------------------------------
 *
 * In produzione si combina node-vibrant per la palette + Claude/GPT-4o
 * per l'interpretazione atmosferica. Qui restituiamo un mood deterministico
 * derivato dal luogo per coerenza dimostrativa.
 */
export async function analyzeMood(place: PlaceIdentity): Promise<VisualMood> {
  const presets: Record<string, VisualMood> = {
    Lisbona: {
      palette: [
        { hex: "#f0e3c8", role: "background", weight: 0.42 },
        { hex: "#d8b487", role: "highlight", weight: 0.24 },
        { hex: "#a76a47", role: "accent", weight: 0.14 },
        { hex: "#5d4a3a", role: "shadow", weight: 0.12 },
        { hex: "#1f1d1a", role: "ink", weight: 0.08 }
      ],
      temperature: "calda",
      luminosity: 0.68,
      contrast: 0.46,
      saturation: 0.38,
      density: "media",
      rhythm: "fluido",
      atmosphere: ["rarefatto", "caldo", "mediterraneo", "nostalgico"]
    },
    Reykjavík: {
      palette: [
        { hex: "#e8edf1", role: "background", weight: 0.46 },
        { hex: "#b6c2cc", role: "highlight", weight: 0.22 },
        { hex: "#7c8c99", role: "accent", weight: 0.14 },
        { hex: "#3a4a59", role: "shadow", weight: 0.10 },
        { hex: "#0f1418", role: "ink", weight: 0.08 }
      ],
      temperature: "fredda",
      luminosity: 0.74,
      contrast: 0.38,
      saturation: 0.18,
      density: "rarefatta",
      rhythm: "regolare",
      atmosphere: ["nordico", "rarefatto", "minerale"]
    },
    Tropea: {
      palette: [
        { hex: "#f8efd9", role: "background", weight: 0.40 },
        { hex: "#e6b67a", role: "highlight", weight: 0.20 },
        { hex: "#2a78a6", role: "accent", weight: 0.18 },
        { hex: "#0f1d2a", role: "ink", weight: 0.14 },
        { hex: "#a13a2e", role: "shadow", weight: 0.08 }
      ],
      temperature: "calda",
      luminosity: 0.78,
      contrast: 0.62,
      saturation: 0.52,
      density: "media",
      rhythm: "spezzato",
      atmosphere: ["vibrante", "mediterraneo", "luce"]
    },
    Kyoto: {
      palette: [
        { hex: "#e9e2d2", role: "background", weight: 0.38 },
        { hex: "#cdb89a", role: "highlight", weight: 0.22 },
        { hex: "#7b5a3f", role: "shadow", weight: 0.16 },
        { hex: "#324236", role: "accent", weight: 0.14 },
        { hex: "#1b1b18", role: "ink", weight: 0.10 }
      ],
      temperature: "neutra",
      luminosity: 0.62,
      contrast: 0.48,
      saturation: 0.32,
      density: "densa",
      rhythm: "regolare",
      atmosphere: ["silenzioso", "intimo", "organico"]
    },
    Copenhagen: {
      palette: [
        { hex: "#eee6d8", role: "background", weight: 0.40 },
        { hex: "#c89a6c", role: "highlight", weight: 0.18 },
        { hex: "#3a6b88", role: "accent", weight: 0.18 },
        { hex: "#7a3a3e", role: "shadow", weight: 0.14 },
        { hex: "#161514", role: "ink", weight: 0.10 }
      ],
      temperature: "fredda",
      luminosity: 0.66,
      contrast: 0.54,
      saturation: 0.36,
      density: "media",
      rhythm: "regolare",
      atmosphere: ["nordico", "geometrico", "delicato"]
    },
    Marrakech: {
      palette: [
        { hex: "#f1d6b1", role: "background", weight: 0.36 },
        { hex: "#c87146", role: "highlight", weight: 0.24 },
        { hex: "#7b2e1e", role: "shadow", weight: 0.18 },
        { hex: "#3a553a", role: "accent", weight: 0.12 },
        { hex: "#1c130d", role: "ink", weight: 0.10 }
      ],
      temperature: "calda",
      luminosity: 0.64,
      contrast: 0.58,
      saturation: 0.62,
      density: "densa",
      rhythm: "spezzato",
      atmosphere: ["vibrante", "organico", "caldo"]
    },
    Genova: {
      palette: [
        { hex: "#f4ebd7", role: "background", weight: 0.36 },
        { hex: "#d99970", role: "highlight", weight: 0.18 },
        { hex: "#c45c3a", role: "shadow", weight: 0.14 },
        { hex: "#3f6477", role: "accent", weight: 0.16 },
        { hex: "#8a6f4e", role: "highlight", weight: 0.10 },
        { hex: "#1d1815", role: "ink", weight: 0.06 }
      ],
      temperature: "calda",
      luminosity: 0.62,
      contrast: 0.62,
      saturation: 0.5,
      density: "densa",
      rhythm: "spezzato",
      atmosphere: ["mediterraneo", "vibrante", "nostalgico"]
    },
    Barcellona: {
      palette: [
        { hex: "#f5ebd3", role: "background", weight: 0.34 },
        { hex: "#e0a45e", role: "highlight", weight: 0.18 },
        { hex: "#c4502b", role: "shadow", weight: 0.14 },
        { hex: "#3a7f8c", role: "accent", weight: 0.18 },
        { hex: "#a6b07a", role: "highlight", weight: 0.10 },
        { hex: "#1a1a1a", role: "ink", weight: 0.06 }
      ],
      temperature: "calda",
      luminosity: 0.7,
      contrast: 0.6,
      saturation: 0.6,
      density: "densa",
      rhythm: "fluido",
      atmosphere: ["vibrante", "mediterraneo", "geometrico"]
    },
    Venezia: {
      palette: [
        { hex: "#efe6cf", role: "background", weight: 0.34 },
        { hex: "#c79a6e", role: "highlight", weight: 0.18 },
        { hex: "#7e8e3a", role: "accent", weight: 0.10 },
        { hex: "#3b6a86", role: "accent", weight: 0.20 },
        { hex: "#a64a2e", role: "shadow", weight: 0.10 },
        { hex: "#171717", role: "ink", weight: 0.08 }
      ],
      temperature: "neutra",
      luminosity: 0.66,
      contrast: 0.56,
      saturation: 0.46,
      density: "media",
      rhythm: "fluido",
      atmosphere: ["nostalgico", "rarefatto", "intimo"]
    },
    Napoli: {
      palette: [
        { hex: "#f3e6c8", role: "background", weight: 0.32 },
        { hex: "#d8a155", role: "highlight", weight: 0.18 },
        { hex: "#b13a2b", role: "shadow", weight: 0.16 },
        { hex: "#2c7a8a", role: "accent", weight: 0.16 },
        { hex: "#a7b97a", role: "highlight", weight: 0.10 },
        { hex: "#111111", role: "ink", weight: 0.08 }
      ],
      temperature: "calda",
      luminosity: 0.72,
      contrast: 0.66,
      saturation: 0.62,
      density: "densa",
      rhythm: "spezzato",
      atmosphere: ["vibrante", "mediterraneo", "urbano"]
    },
    Londra: {
      palette: [
        { hex: "#f4ecd9", role: "background", weight: 0.32 },
        { hex: "#3a6c70", role: "accent", weight: 0.16 },
        { hex: "#7b3a4f", role: "shadow", weight: 0.14 },
        { hex: "#d8542c", role: "highlight", weight: 0.16 },
        { hex: "#8b8aa5", role: "highlight", weight: 0.14 },
        { hex: "#1a1a1a", role: "ink", weight: 0.08 }
      ],
      temperature: "neutra",
      luminosity: 0.6,
      contrast: 0.7,
      saturation: 0.58,
      density: "densa",
      rhythm: "spezzato",
      atmosphere: ["urbano", "vibrante", "geometrico"]
    },
    Parigi: {
      palette: [
        { hex: "#efe8d6", role: "background", weight: 0.34 },
        { hex: "#c39a64", role: "highlight", weight: 0.2 },
        { hex: "#7b5c3a", role: "shadow", weight: 0.14 },
        { hex: "#5a6b7d", role: "accent", weight: 0.16 },
        { hex: "#b06a3f", role: "highlight", weight: 0.10 },
        { hex: "#1a1a1a", role: "ink", weight: 0.06 }
      ],
      temperature: "neutra",
      luminosity: 0.66,
      contrast: 0.5,
      saturation: 0.42,
      density: "media",
      rhythm: "regolare",
      atmosphere: ["delicato", "intimo", "nostalgico"]
    }
  };
  return (
    presets[place.city] ?? {
      // Default "anonymous traveler" palette — kept vibrant so unknown cities
      // still produce a poster worth printing instead of a beige rectangle.
      palette: [
        { hex: "#f4ebd3", role: "background", weight: 0.30 },
        { hex: "#3a6c70", role: "accent", weight: 0.16 },
        { hex: "#7b3a4f", role: "shadow", weight: 0.14 },
        { hex: "#d8542c", role: "highlight", weight: 0.16 },
        { hex: "#8b8aa5", role: "highlight", weight: 0.14 },
        { hex: "#1a1a1a", role: "ink", weight: 0.10 }
      ] as any,
      temperature: "neutra",
      luminosity: 0.62,
      contrast: 0.62,
      saturation: 0.55,
      density: "media",
      rhythm: "spezzato",
      atmosphere: ["urbano", "vibrante"] as AtmosphereWord[]
    }
  );
}
