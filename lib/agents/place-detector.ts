import type { PlaceIdentity } from "../types";

/**
 * AGENT 01 — PLACE DETECTOR
 *
 * In questa versione l'utente DICHIARA il luogo nell'upload (campo
 * "Di quale luogo si tratta?"). L'agente parte da quel testo e:
 *   1. Cerca match con la base di città conosciute → ritorna preset.
 *   2. Altrimenti: accetta il testo dell'utente come nome città
 *      e infera country + coordinate plausibili.
 *
 * Production prompt (Claude Vision con la HINT come system input):
 * ----------------------------------------------------------------
 * Sei un cartografo silenzioso. L'utente ha dichiarato il luogo
 * (campo "hint"). Ti vengono fornite anche le fotografie e gli EXIF.
 *
 * Il tuo compito è:
 *   1. Confermare che il luogo dichiarato è coerente con foto/EXIF.
 *      Se contraddice, segnalalo nel campo "reasoning" ma rispetta
 *      la dichiarazione dell'utente.
 *   2. Arricchire: distretto/quartiere se visibile, coordinate del
 *      centro logico del luogo, country.
 *
 * Restituisci JSON conforme allo schema PlaceIdentity.
 * Tono: sobrio, mai promozionale, mai turistico.
 * ----------------------------------------------------------------
 */
export async function detectPlace(fileNames: string[], hint: string): Promise<PlaceIdentity> {
  const presets: PlaceIdentity[] = [
    {
      city: "Lisbona",
      district: "Alfama",
      country: "Portogallo",
      coordinates: { lat: 38.7128, lng: -9.1303 },
      confidence: 0.86,
      reasoning: "Azulejos, pendenze e luce bassa sul Tago coerenti con Alfama."
    },
    {
      city: "Reykjavík",
      district: "Miðborg",
      country: "Islanda",
      coordinates: { lat: 64.1466, lng: -21.9426 },
      confidence: 0.82,
      reasoning: "Cromia minerale, lamiera colorata e cielo basso coerenti col centro."
    },
    {
      city: "Tropea",
      district: "Centro storico",
      country: "Italia",
      coordinates: { lat: 38.6776, lng: 15.8978 },
      confidence: 0.84,
      reasoning: "Tufo, balaustre sul mare e cromia tirrenica coerenti con la rupe."
    },
    {
      city: "Kyoto",
      district: "Gion",
      country: "Giappone",
      coordinates: { lat: 35.0036, lng: 135.7778 },
      confidence: 0.78,
      reasoning: "Legno scuro, lanterne washi e ciottolato coerenti con Gion."
    },
    {
      city: "Copenhagen",
      district: "Nyhavn",
      country: "Danimarca",
      coordinates: { lat: 55.6797, lng: 12.5908 },
      confidence: 0.84,
      reasoning: "Facciate cromatiche sul canale e luce nordica diffusa coerenti con Nyhavn."
    },
    {
      city: "Marrakech",
      district: "Medina",
      country: "Marocco",
      coordinates: { lat: 31.6295, lng: -7.9811 },
      confidence: 0.8,
      reasoning: "Ocra terracotta dominante e archi a sesto acuto coerenti con la Medina."
    },
    {
      city: "Genova",
      district: "Centro storico",
      country: "Italia",
      coordinates: { lat: 44.4056, lng: 8.9463 },
      confidence: 0.83,
      reasoning: "Caruggi stretti, sfumature rosa-terracotta e luce ligure coerenti col centro."
    },
    {
      city: "Barcellona",
      district: "El Born",
      country: "Spagna",
      coordinates: { lat: 41.3851, lng: 2.1734 },
      confidence: 0.81,
      reasoning: "Modernismo catalano, palme e luce mediterranea coerenti con la città."
    },
    {
      city: "Venezia",
      district: "Cannaregio",
      country: "Italia",
      coordinates: { lat: 45.4408, lng: 12.3155 },
      confidence: 0.85,
      reasoning: "Acqua dominante, intonaci scrostati e ombre lunghe coerenti con Venezia."
    },
    {
      city: "Napoli",
      district: "Spaccanapoli",
      country: "Italia",
      coordinates: { lat: 40.8518, lng: 14.2681 },
      confidence: 0.82,
      reasoning: "Vicoli densi, panni stesi e luce alta coerenti con il centro antico."
    },
    {
      city: "Londra",
      district: "Southbank",
      country: "Regno Unito",
      coordinates: { lat: 51.5074, lng: -0.1278 },
      confidence: 0.8,
      reasoning: "Mattoni rossi, neon, e atmosfera urbana coerenti con la riva del Tamigi."
    },
    {
      city: "Parigi",
      district: "Marais",
      country: "Francia",
      coordinates: { lat: 48.8566, lng: 2.3522 },
      confidence: 0.81,
      reasoning: "Haussmann, portoni profondi e luce d'aprile coerenti con il Marais."
    }
  ];

  // 1. Match on user hint (case-insensitive, accent-insensitive)
  const normalized = stripAccents((hint ?? "").trim().toLowerCase());
  if (normalized.length > 0) {
    for (const p of presets) {
      const cityNorm = stripAccents(p.city.toLowerCase());
      const districtNorm = p.district ? stripAccents(p.district.toLowerCase()) : "";
      if (cityNorm === normalized || cityNorm.includes(normalized) || normalized.includes(cityNorm) || districtNorm === normalized) {
        return p;
      }
    }
    // 2. Unknown city — accept the user's text, generate plausible meta
    return buildUnknownPlace(hint.trim());
  }

  // 3. No hint at all — last-resort deterministic fallback
  const seed = hashStrings(fileNames);
  return presets[seed % presets.length];
}

function buildUnknownPlace(name: string): PlaceIdentity {
  // Capitalize first letter
  const city = name.charAt(0).toUpperCase() + name.slice(1);
  // Slight deterministic coord based on city name (so the tessellation stays stable)
  const h = hashStrings([city]);
  const lat = ((h % 9000) / 100) - 45 + Math.sin(h) * 5; // -45..+45
  const lng = (((h * 7) % 18000) / 100) - 90 + Math.cos(h) * 5; // -90..+90
  return {
    city,
    country: "—",
    coordinates: { lat: clamp(lat, -85, 85), lng: clamp(lng, -180, 180) },
    confidence: 0.55,
    reasoning: "Luogo specificato dall'utente."
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function hashStrings(items: string[]): number {
  let h = 0;
  for (const s of items.join("|")) h = (h * 31 + s.charCodeAt(0)) | 0;
  return Math.abs(h);
}
