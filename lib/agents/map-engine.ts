import type { PlaceIdentity, VisualMood, MapData, Street, Polygon, Precision } from "../types";
import { stitchOsmMap } from "../tile-stitcher";

/**
 * AGENT 03 — MAP ENGINE
 *
 * Recupera dati cartografici REALI da OpenStreetMap via Overpass API.
 * Tre livelli di precisione (selezionati dall'utente nella pagina upload):
 *
 *   essenziale   → ~700m x 700m, solo arterie principali. Vista "manifesto".
 *   standard     → ~1.0km x 1.0km, primarie + secondarie + terziarie.
 *   cartografica → ~1.4km x 1.4km, fino alle residenziali. Trama densa.
 *
 * Se l'Overpass non risponde (rete assente, rate-limit) si scende a una
 * mappa procedurale deterministica, in modo che il prodotto non si
 * "rompa" mai. Questo fallback è anche utile in fase di sviluppo.
 *
 * Production prompt (Claude reasoning step prima della query OSM):
 * ----------------------------------------------------------------
 * Sei un editor cartografico. Decidi il piano di query per una mappa
 * artistica del luogo dato. Ricevi PlaceIdentity, VisualMood, Precision.
 * Restituisci JSON: bbox, zoom, layer da scaricare, simplification,
 * ragione breve. L'agente esecutore userà il piano per chiamare Overpass.
 * ----------------------------------------------------------------
 */

const PRECISION_CONFIG: Record<Precision, { halfSpanDeg: number; highways: string[]; zoom: number }> = {
  essenziale: {
    halfSpanDeg: 0.0045,            // ~500m N-S
    highways: ["motorway", "trunk", "primary", "secondary"],
    zoom: 13
  },
  standard: {
    halfSpanDeg: 0.0075,            // ~830m N-S
    highways: ["motorway", "trunk", "primary", "secondary", "tertiary"],
    zoom: 14
  },
  cartografica: {
    halfSpanDeg: 0.012,             // ~1330m N-S
    highways: ["motorway", "trunk", "primary", "secondary", "tertiary", "residential", "unclassified", "living_street"],
    zoom: 15
  }
};

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.fr/api/interpreter"
];

const OVERPASS_TIMEOUT_MS = 18_000;

// In-memory cache keyed by city+precision (TTL: 1 hour)
const cache = new Map<string, { ts: number; data: MapData }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function buildMap(
  place: PlaceIdentity,
  mood: VisualMood,
  precision: Precision = "standard"
): Promise<MapData> {
  const cfg = PRECISION_CONFIG[precision];
  const { lat, lng } = place.coordinates;

  // Adjust longitude span for the latitude (Mercator-aware)
  const lngFactor = 1 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
  const halfLng = cfg.halfSpanDeg * lngFactor;
  const halfLat = cfg.halfSpanDeg;

  const bbox: [number, number, number, number] = [
    lng - halfLng, lat - halfLat, lng + halfLng, lat + halfLat
  ];

  const cacheKey = `${place.city.toLowerCase()}|${precision}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  let data: MapData;
  try {
    // Run Overpass (vectors) and tile stitcher (raster) in parallel
    const [osm, tileImage] = await Promise.all([
      queryOverpass(bbox, cfg).catch((err) => {
        console.warn("[map-engine] Overpass failed:", err?.message ?? err);
        return null;
      }),
      stitchOsmMap(bbox, cfg.zoom).catch((err) => {
        console.warn("[map-engine] tile stitch failed:", err?.message ?? err);
        return null;
      })
    ]);

    if (osm) {
      data = {
        bbox,
        zoom: cfg.zoom,
        precision,
        source: "osm",
        streets: osm.streets,
        water: osm.water,
        waterways: osm.waterways,
        tileImage: tileImage ?? undefined
      };
    } else {
      data = generateProceduralMap(bbox, cfg, precision, mood);
      if (tileImage) data.tileImage = tileImage;
    }
  } catch (err) {
    console.warn("[map-engine] unexpected error, using procedural fallback:", err);
    data = generateProceduralMap(bbox, cfg, precision, mood);
  }

  cache.set(cacheKey, { ts: Date.now(), data });
  return data;
}

// ─── Overpass query ────────────────────────────────────────────────────────

async function queryOverpass(
  bbox: [number, number, number, number],
  cfg: { halfSpanDeg: number; highways: string[]; zoom: number }
): Promise<{ streets: Street[]; water: Polygon[]; waterways: Street[] }> {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  const bboxStr = `${minLat},${minLng},${maxLat},${maxLng}`;
  const highwayRegex = `^(${cfg.highways.join("|")})$`;

  const q = `
[out:json][timeout:15];
(
  way["highway"~"${highwayRegex}"](${bboxStr});
  way["natural"="water"](${bboxStr});
  way["waterway"~"^(river|canal|stream)$"](${bboxStr});
  relation["natural"="water"](${bboxStr});
);
out geom;
`.trim();

  // Try endpoints in order
  let lastErr: any;
  for (const url of OVERPASS_ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), OVERPASS_TIMEOUT_MS);
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
      const json: any = await res.json();
      return parseOverpass(json);
    } catch (err) {
      lastErr = err;
      // try next endpoint
    }
  }
  throw lastErr;
}

function parseOverpass(json: any): { streets: Street[]; water: Polygon[]; waterways: Street[] } {
  const streets: Street[] = [];
  const water: Polygon[] = [];
  const waterways: Street[] = [];

  const elements = Array.isArray(json.elements) ? json.elements : [];

  for (const el of elements) {
    if (el.type === "way" && Array.isArray(el.geometry)) {
      const coords: Array<[number, number]> = el.geometry.map((g: any) => [g.lon, g.lat]);
      const tags = el.tags ?? {};
      if (tags.highway) {
        streets.push({ type: mapHighwayToTier(tags.highway), coords });
      } else if (tags.waterway && ["river", "canal", "stream"].includes(tags.waterway)) {
        waterways.push({ type: "primary", coords });
      } else if (tags.natural === "water") {
        water.push({ coords });
      }
    } else if (el.type === "relation" && Array.isArray(el.members)) {
      // Multipolygon water (e.g. coastline-bounded sea)
      for (const m of el.members) {
        if (m.role === "outer" && Array.isArray(m.geometry)) {
          const coords: Array<[number, number]> = m.geometry.map((g: any) => [g.lon, g.lat]);
          water.push({ coords });
        }
      }
    }
  }

  return { streets, water, waterways };
}

function mapHighwayToTier(highway: string): Street["type"] {
  if (["motorway", "trunk", "primary"].includes(highway)) return "primary";
  if (highway === "secondary") return "secondary";
  if (highway === "tertiary") return "tertiary";
  if (["motorway_link", "trunk_link", "primary_link", "secondary_link", "tertiary_link"].includes(highway)) return "secondary";
  if (["pedestrian", "footway", "path"].includes(highway)) return "pedestrian";
  return "residential";
}

// ─── Procedural fallback (when Overpass is unreachable) ───────────────────

function generateProceduralMap(
  bbox: [number, number, number, number],
  cfg: { halfSpanDeg: number; highways: string[]; zoom: number },
  precision: Precision,
  mood: VisualMood
): MapData {
  const seed = Math.floor((bbox[0] + 180) * 1000 + (bbox[1] + 90) * 1000);
  const rng = mulberry32(seed);
  const target = mood.density === "rarefatta" ? 16 : mood.density === "densa" ? 50 : 30;
  const streets: Street[] = [];
  const tiers: Street["type"][] = ["primary", "secondary", "tertiary", "residential"];
  for (let i = 0; i < target; i++) {
    const tier = tiers[Math.min(tiers.length - 1, Math.floor((i / target) * tiers.length))];
    streets.push(generateStreet(rng, bbox, tier));
  }
  const waterways: Street[] = [generateRiverProcedural(rng, bbox)];
  return { bbox, zoom: cfg.zoom, precision, source: "procedural", streets, water: [], waterways };
}

function generateStreet(rng: () => number, bbox: [number, number, number, number], tier: Street["type"]): Street {
  const segments = tier === "primary" || tier === "secondary" ? 6 : 4;
  const coords: Array<[number, number]> = [];
  let lng = bbox[0] + rng() * (bbox[2] - bbox[0]);
  let lat = bbox[1] + rng() * (bbox[3] - bbox[1]);
  let angle = rng() * Math.PI * 2;
  coords.push([lng, lat]);
  for (let i = 0; i < segments; i++) {
    const len = ((bbox[2] - bbox[0]) * (0.08 + rng() * 0.2));
    angle += (rng() - 0.5) * 0.6;
    lng += Math.cos(angle) * len;
    lat += Math.sin(angle) * len * 0.7;
    coords.push([Math.max(bbox[0], Math.min(bbox[2], lng)), Math.max(bbox[1], Math.min(bbox[3], lat))]);
  }
  return { type: tier, coords };
}

function generateRiverProcedural(rng: () => number, bbox: [number, number, number, number]): Street {
  const coords: Array<[number, number]> = [];
  const baseLat = bbox[1] + (bbox[3] - bbox[1]) * (0.4 + (rng() - 0.5) * 0.3);
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const lng = bbox[0] - (bbox[2] - bbox[0]) * 0.15 + (i / steps) * (bbox[2] - bbox[0]) * 1.3;
    const lat = baseLat + (rng() - 0.5) * (bbox[3] - bbox[1]) * 0.15;
    coords.push([lng, lat]);
  }
  return { type: "primary", coords };
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
