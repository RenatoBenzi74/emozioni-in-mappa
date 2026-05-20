import type { PlaceIdentity, VisualMood, MapData, Street } from "../types";

/**
 * AGENT 03 — MAP ENGINE
 *
 * Production: query OpenStreetMap / Overpass / Mapbox with the
 * coordinates from Place Detector, then simplify with topojson.
 *
 * In produzione l'agente:
 *   1. Riceve coordinate e densità target dall'analisi mood.
 *      - Mood "rarefatto" → bbox più ampio (zoom 12-13)
 *      - Mood "intimo" → bbox stretto (zoom 15-16)
 *   2. Scarica via Overpass un set di way (primary, secondary,
 *      tertiary, residential, pedestrian) + waterway/water + parchi.
 *   3. Simplifica geometrie (Douglas-Peucker, tolleranza correlata
 *      al rhythm: "regolare" → bassa, "fluido" → media).
 *   4. Filtra strade per importanza: in densità "rarefatta" tiene
 *      solo primary+secondary; in "densa" tutto.
 *   5. Restituisce MapData già nello spazio normalizzato 0..1.
 *
 * Questo MVP genera una rete urbana procedurale deterministica
 * a partire dalle coordinate. La rete NON è geograficamente
 * accurata ma rispetta densità e ritmo richiesti dal mood.
 */
export async function buildMap(place: PlaceIdentity, mood: VisualMood): Promise<MapData> {
  const seed = Math.floor(Math.abs(place.coordinates.lat * 1000 + place.coordinates.lng * 1000));
  const rng = mulberry32(seed);

  const density = mood.density;
  const rhythm = mood.rhythm;

  // Translate mood → procedural parameters
  const streetCounts = { rarefatta: 14, media: 28, densa: 48 } as const;
  const target = streetCounts[density];

  const streets: Street[] = [];
  const tiers: Street["type"][] = ["primary", "secondary", "tertiary", "residential", "pedestrian"];

  for (let i = 0; i < target; i++) {
    const tier = tiers[Math.min(tiers.length - 1, Math.floor((i / target) * tiers.length))];
    streets.push(generateStreet(rng, rhythm, tier));
  }

  // Optional water vein for coastal places
  const coastalCities = new Set(["Lisbona", "Tropea", "Copenhagen", "Reykjavík"]);
  const water = coastalCities.has(place.city) ? [generateWater(rng)] : undefined;

  return {
    bbox: [
      place.coordinates.lng - 0.02,
      place.coordinates.lat - 0.02,
      place.coordinates.lng + 0.02,
      place.coordinates.lat + 0.02
    ],
    zoom: density === "rarefatta" ? 13 : density === "densa" ? 15 : 14,
    streets,
    water
  };
}

function generateStreet(rng: () => number, rhythm: VisualMood["rhythm"], tier: Street["type"]): Street {
  const segments = tier === "primary" || tier === "secondary" ? 5 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 4);
  const coords: Array<[number, number]> = [];
  let x = rng();
  let y = rng();
  let angle = rng() * Math.PI * 2;
  coords.push([x, y]);
  for (let i = 0; i < segments; i++) {
    const len = 0.06 + rng() * 0.18;
    const wobble = rhythm === "fluido" ? (rng() - 0.5) * 0.9 : rhythm === "spezzato" ? (rng() - 0.5) * 1.6 : (rng() - 0.5) * 0.25;
    angle += wobble;
    x += Math.cos(angle) * len;
    y += Math.sin(angle) * len;
    coords.push([Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]);
  }
  return { type: tier, coords };
}

function generateWater(rng: () => number) {
  const coords: Array<[number, number]> = [];
  const baseY = 0.78 + rng() * 0.12;
  for (let x = 0; x <= 1.001; x += 0.05) {
    coords.push([x, baseY + (rng() - 0.5) * 0.06]);
  }
  coords.push([1, 1], [0, 1]);
  return { coords };
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
