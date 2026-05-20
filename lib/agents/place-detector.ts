import type { PlaceIdentity } from "../types";

/**
 * AGENT 01 — PLACE DETECTOR
 *
 * Production prompt (Claude / GPT-4o vision):
 * ---------------------------------------------------------------
 * Sei un cartografo silenzioso. Ti vengono fornite 3 o più fotografie
 * scattate dallo stesso viaggiatore nello stesso luogo, eventualmente
 * accompagnate dai metadati EXIF (GPS, ora, fotocamera).
 *
 * Il tuo compito è identificare, con la massima certezza possibile,
 * UN unico luogo coerente. Non sei autorizzato a inventare. Se i
 * segnali non bastano, restituisci una stima a bassa confidenza con
 * una spiegazione onesta.
 *
 * Procedi in tre passi mentali (non mostrarli all'utente):
 *   1. Leggi i metadati. Se esistono coordinate GPS, sono prioritarie.
 *   2. Cerca indizi visivi: architetture, vegetazione, segnaletica,
 *      placche stradali, tipologie di facciate, qualità della luce.
 *   3. Triangola tra metadati e indizi visivi: scartare l'uno se
 *      contraddice l'altro è preferibile a inventare un luogo.
 *
 * Restituisci JSON conforme al seguente schema:
 *   {
 *     "city": "string",
 *     "district": "string | null",
 *     "country": "string",
 *     "coordinates": { "lat": number, "lng": number },
 *     "confidence": number  // 0..1
 *     "reasoning": "string" // breve, 1-2 frasi, mai didascalico
 *   }
 *
 * Lingua: italiano. Tono: sobrio, mai promozionale, mai turistico.
 * ---------------------------------------------------------------
 *
 * In produzione, questa funzione verrebbe sostituita da una chiamata
 * a Claude Vision / GPT-4o con il prompt soprastante e gli EXIF dei file.
 * In questo MVP restituisce un risultato deterministico basato sul
 * fingerprint delle immagini ricevute.
 */
export async function detectPlace(fileNames: string[]): Promise<PlaceIdentity> {
  const seed = hashStrings(fileNames);
  const samples: PlaceIdentity[] = [
    {
      city: "Lisbona",
      district: "Alfama",
      country: "Portogallo",
      coordinates: { lat: 38.7128, lng: -9.1303 },
      confidence: 0.86,
      reasoning:
        "Azulejos visibili in due scatti, pendenza tipica del quartiere, luce bassa sul Tago suggeriscono Alfama in tardo pomeriggio."
    },
    {
      city: "Reykjavík",
      district: "Miðborg",
      country: "Islanda",
      coordinates: { lat: 64.1466, lng: -21.9426 },
      confidence: 0.78,
      reasoning:
        "Cromia minerale, lamiera ondulata colorata e cielo a bassa saturazione coerenti con il centro di Reykjavík in primavera."
    },
    {
      city: "Tropea",
      district: "Centro storico",
      country: "Italia",
      coordinates: { lat: 38.6776, lng: 15.8978 },
      confidence: 0.81,
      reasoning:
        "Tufo, balaustre sul mare e tipologia di facciate calabresi indicano la rupe di Tropea con luce zenitale estiva."
    },
    {
      city: "Kyoto",
      district: "Gion",
      country: "Giappone",
      coordinates: { lat: 35.0036, lng: 135.7778 },
      confidence: 0.74,
      reasoning:
        "Legno scuro, lanterne washi e ciottolato pulito riconducono al distretto di Gion in primavera inoltrata."
    },
    {
      city: "Copenhagen",
      district: "Nyhavn",
      country: "Danimarca",
      coordinates: { lat: 55.6797, lng: 12.5908 },
      confidence: 0.83,
      reasoning:
        "Facciate cromatiche allineate sul canale e luce nordica diffusa coerenti con Nyhavn fuori dai mesi estivi."
    },
    {
      city: "Marrakech",
      district: "Medina",
      country: "Marocco",
      coordinates: { lat: 31.6295, lng: -7.9811 },
      confidence: 0.79,
      reasoning:
        "Ocra terracotta dominante, archi a sesto acuto e tessuti colorati appesi indicano la Medina di Marrakech."
    }
  ];
  return samples[seed % samples.length];
}

function hashStrings(items: string[]): number {
  let h = 0;
  for (const s of items.join("|")) h = (h * 31 + s.charCodeAt(0)) | 0;
  return Math.abs(h);
}
