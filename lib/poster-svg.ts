import type { FullInterpretation, Street, Polygon } from "./types";
import { voronoi, type Point } from "./voronoi";

/**
 * Real-map poster renderer.
 *
 * Visual idiom:
 *  - Cream background.
 *  - Real OSM data: streets (filtered by precision), water bodies, waterways.
 *  - Tessellation of palette-colored polygons covers the map crop. Cells
 *    are a Voronoi diagram seeded by REAL street intersections (denser
 *    intersections → smaller, more detailed cells; sparser → larger
 *    "open ground" cells). Where there are no intersections, fill with
 *    a jittered grid so the crop has full coverage.
 *  - Real streets are drawn on top as thin cream strokes — they "carve"
 *    the tessellation following the actual urban geometry.
 *  - Water (areal + linear) drawn on top in the brand blue, extending
 *    slightly beyond the crop where the river leaves the bbox.
 *  - Big serif uppercase title + italic subtitle + country + coords.
 */
export function renderPosterSvg(
  full: FullInterpretation,
  format: "vertical-portrait" | "square" = "vertical-portrait"
): { svg: string; width: number; height: number } {
  const W = 800;
  const H = format === "vertical-portrait" ? 1200 : 800;
  const { art, type, mood, place, map } = full;

  const mapMargin = W * 0.10;
  const mapBox = { x: mapMargin, y: H * 0.10, w: W - mapMargin * 2, h: H * 0.46 };

  // Mercator-ish projection inside the map crop
  const [minLng, minLat, maxLng, maxLat] = map.bbox;
  const proj = (lng: number, lat: number): Point => [
    mapBox.x + ((lng - minLng) / (maxLng - minLng)) * mapBox.w,
    mapBox.y + (1 - (lat - minLat) / (maxLat - minLat)) * mapBox.h
  ];
  const projCoord = (c: [number, number]): Point => proj(c[0], c[1]);

  // ─── Palette for cells ─────────────────────────────────────────────────
  const cellPalette = mood.palette
    .filter((c) => c.role !== "background")
    .map((c) => c.hex);
  if (cellPalette.length === 0) cellPalette.push(art.accentColor, art.highlightColor);

  // ─── Voronoi seeds: real street intersections + jittered fillers ──────
  const seed = Math.floor(Math.abs(place.coordinates.lat * 100000 + place.coordinates.lng * 100000));
  const rng = mulberry32(seed);

  const seeds = collectSeeds(map.streets.map((s) => s.coords.map(projCoord)), mapBox, rng, mood.density);

  // ─── Voronoi cells ─────────────────────────────────────────────────────
  const cells = voronoi(seeds, { bbox: [mapBox.x, mapBox.y, mapBox.x + mapBox.w, mapBox.y + mapBox.h] });
  const cellsSvg = cells
    .map((cell, idx) => {
      if (cell.length < 3) return "";
      const pts = cell.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      const fill = cellPalette[(idx + Math.floor(rng() * cellPalette.length)) % cellPalette.length];
      return `<polygon points="${pts}" fill="${fill}" stroke="${art.background}" stroke-width="1.8" stroke-linejoin="round"/>`;
    })
    .join("");

  // ─── Streets on top — thin cream strokes, REAL geometry ───────────────
  const streetsSvg = map.streets
    .map((s) => {
      const d = pathFromCoords(s.coords, projCoord);
      if (!d) return "";
      const w = s.type === "primary" ? 2.2 : s.type === "secondary" ? 1.5 : s.type === "tertiary" ? 1.0 : 0.6;
      return `<path d="${d}" fill="none" stroke="${art.background}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
    })
    .join("");

  // ─── Water on top — REAL polygons + waterway lines ────────────────────
  const riverColor = pickRiverColor(mood);
  const waterAreasSvg = map.water
    .map((p) => {
      if (p.coords.length < 3) return "";
      const pts = p.coords.map((c) => projCoord(c)).map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
      return `<polygon points="${pts}" fill="${riverColor}" opacity="0.95"/>`;
    })
    .join("");
  const waterwaysSvg = map.waterways
    .map((s) => {
      const d = pathFromCoords(s.coords, projCoord);
      if (!d) return "";
      return `<path d="${d}" fill="none" stroke="${riverColor}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`;
    })
    .join("");

  // ─── Top metadata strip ───────────────────────────────────────────────
  const sourceTag = map.source === "osm" ? "OSM · OPENSTREETMAP" : "STUDIO · PROCEDURAL";
  const topMeta = `
    <g font-family="JetBrains Mono, monospace" fill="${art.inkColor}" font-size="10" letter-spacing="2.2" opacity="0.5">
      <text x="${mapBox.x}" y="${H * 0.06}">EMOZIONI IN MAPPA · ${escapeXml(map.precision.toUpperCase())}</text>
      <text x="${W - mapBox.x}" y="${H * 0.06}" text-anchor="end">${sourceTag}</text>
    </g>
  `;

  // ─── Title block ──────────────────────────────────────────────────────
  const titleY = H * 0.78;
  const n = Math.max(type.title.length, 1);
  const targetTitleWidth = W * 0.72;
  const titleSize = Math.min(96, Math.max(54, 520 / Math.max(n, 4)));
  const titleBlock = `
    <g text-anchor="middle">
      <text x="${W / 2}" y="${titleY}"
            font-family="${type.family.display}"
            font-size="${titleSize}"
            fill="${art.inkColor}"
            font-weight="500"
            textLength="${targetTitleWidth}"
            lengthAdjust="spacing">
        ${escapeXml(type.title.toUpperCase())}
      </text>
      <text x="${W / 2}" y="${titleY + 50}"
            font-family="${type.family.display}"
            font-style="italic"
            font-size="22"
            fill="${art.inkColor}"
            opacity="0.72">
        ${escapeXml(type.subtitle)}
      </text>
      <text x="${W / 2}" y="${H - 90}"
            font-family="Inter, sans-serif"
            font-size="22"
            letter-spacing="2"
            fill="${art.inkColor}">
        ${escapeXml(place.country)}
      </text>
      <text x="${W / 2}" y="${H - 50}"
            font-family="${type.family.mono}"
            font-size="9"
            letter-spacing="3.2"
            fill="${art.inkColor}"
            opacity="0.55">
        ${escapeXml(type.coordinates.toUpperCase())}
      </text>
    </g>
  `;

  return {
    width: W,
    height: H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${art.background}"/>
      ${topMeta}
      <g>
        ${cellsSvg}
        ${streetsSvg}
        ${waterAreasSvg}
        ${waterwaysSvg}
      </g>
      ${titleBlock}
    </svg>`
  };
}

// ─── Seed collection: intersection-aware ─────────────────────────────────

function collectSeeds(
  projectedStreets: Point[][],
  mapBox: { x: number; y: number; w: number; h: number },
  rng: () => number,
  density: "rarefatta" | "media" | "densa"
): Point[] {
  // Real points come from EVERY street vertex — clipped to the map crop.
  // Down-sample so we don't get hundreds of seeds clustered on long roads.
  const minSep = density === "rarefatta" ? 40 : density === "densa" ? 18 : 28;
  const inside = (p: Point) =>
    p[0] >= mapBox.x && p[0] <= mapBox.x + mapBox.w &&
    p[1] >= mapBox.y && p[1] <= mapBox.y + mapBox.h;

  const seeds: Point[] = [];
  const accept = (p: Point) => {
    if (!inside(p)) return;
    for (const q of seeds) {
      const dx = p[0] - q[0];
      const dy = p[1] - q[1];
      if (dx * dx + dy * dy < minSep * minSep) return;
    }
    seeds.push(p);
  };

  for (const segs of projectedStreets) {
    for (const p of segs) accept(p);
  }

  // Fillers: if real streets sparse (especially at "essenziale" zoom), top
  // up with random points so cells cover the full crop. Always add a
  // baseline filling so we never end up with a single huge cell.
  const targetMin = density === "rarefatta" ? 30 : density === "densa" ? 100 : 60;
  let safety = 0;
  while (seeds.length < targetMin && safety++ < 5000) {
    accept([mapBox.x + rng() * mapBox.w, mapBox.y + rng() * mapBox.h]);
  }

  return seeds;
}

// ─── Path / color helpers ────────────────────────────────────────────────

function pathFromCoords(coords: Array<[number, number]>, proj: (c: [number, number]) => Point): string {
  if (!coords || coords.length < 2) return "";
  let d = "";
  for (let i = 0; i < coords.length; i++) {
    const p = proj(coords[i]);
    d += `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)} `;
  }
  return d.trim();
}

function pickRiverColor(mood: FullInterpretation["mood"]): string {
  return mood.temperature === "calda" ? "#7FB7C9" : "#8FC4D4";
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

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
