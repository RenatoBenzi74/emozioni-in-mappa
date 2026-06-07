import type { FullInterpretation } from "./types";

/**
 * Tessellation-style poster renderer.
 *
 * Visual idiom (matches reference posters in the brief):
 *  - Cream/paper background.
 *  - Map area is a tessellation of irregular polygons (jittered grid),
 *    each filled with a distinct color from the user's photo palette.
 *  - A river/coast crosses the map as a smooth blue curve that EXITS
 *    the map crop on both sides (extends onto the cream paper).
 *  - Big serif uppercase title (city) with generous letter-spacing.
 *  - Small sans subtitle (country).
 *  - Tiny mono baseline with coordinates.
 *
 * The renderer is pure SVG (no canvas, no raster) and deterministic
 * for a given place — so the same Genova always produces the same
 * tessellation, but with palette derived from THE USER'S photos.
 */
export function renderPosterSvg(
  full: FullInterpretation,
  format: "vertical-portrait" | "square" = "vertical-portrait"
): { svg: string; width: number; height: number } {
  const W = 800;
  const H = format === "vertical-portrait" ? 1200 : 800;

  const { art, type, mood, place } = full;

  // Deterministic RNG from place + photo seed → same input, same output
  const seed = Math.floor(
    Math.abs(place.coordinates.lat * 100000 + place.coordinates.lng * 100000) + place.city.charCodeAt(0) * 7919
  );
  const rng = mulberry32(seed);

  // Map area — vertical poster: map occupies upper ~50%
  const mapMargin = W * 0.10;
  const mapBox = {
    x: mapMargin,
    y: H * 0.10,
    w: W - mapMargin * 2,
    h: H * 0.46
  };

  // Build the cell palette from the user's photos
  // (background and pure ink are excluded — they are the paper + text colors)
  const cellPalette = mood.palette
    .filter((c) => c.role !== "background")
    .map((c) => c.hex);

  if (cellPalette.length === 0) cellPalette.push(art.accentColor, art.highlightColor);

  // 1. Tessellation
  const cells = generateJitteredCells(mapBox, rng, mood.density);
  const cellsSvg = cells
    .map((cell, idx) => {
      const points = cell.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      // Color cycles through the palette with a small chance of repeating
      const color = pickCellColor(cellPalette, idx, rng);
      return `<polygon points="${points}" fill="${color}" stroke="${art.background}" stroke-width="2.2" stroke-linejoin="round"/>`;
    })
    .join("");

  // 2. River / coast — extends BEYOND the map crop on both sides.
  // Default: include water for visual interest. The river-line works as
  // the Thames / Tago / Senna / coast / canal / passage / axis depending
  // on the city — it's the editorial element that "breaks" the tessellation.
  const landlockedHints = ["minerale", "industriale"];
  const explicitlyLandlocked =
    landlockedHints.every((w) => false) /* placeholder */ ||
    /^(Madrid|Milano|Bologna|Vienna|Berlino|Praga|Monaco|Torino)$/i.test(place.city.trim());
  const hasWater = !explicitlyLandlocked;

  let riverSvg = "";
  if (hasWater) {
    const riverPath = generateRiverPath(mapBox, rng);
    const riverColor = pickRiverColor(mood, cellPalette);
    riverSvg = `<path d="${riverPath}" fill="none" stroke="${riverColor}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.95"/>`;
  }

  // 3. Top metadata strip — discreet
  const topMeta = `
    <g font-family="${type.family.mono}" fill="${art.inkColor}" font-size="10" letter-spacing="2.2" opacity="0.5">
      <text x="${mapBox.x}" y="${H * 0.06}">EMOZIONI IN MAPPA · STUDIO</text>
      <text x="${W - mapBox.x}" y="${H * 0.06}" text-anchor="end">N° I / ${new Date().getFullYear()}</text>
    </g>
  `;

  // 4. Title block — BIG editorial uppercase title.
  // `textLength` + `lengthAdjust="spacing"` force-fits the text to exactly
  // the target width regardless of which font is loaded (avoids overflow
  // when Cormorant Garamond isn't available, e.g. server-side rasterization).
  // The font-size sets the visual weight; textLength sets the tracking.
  const titleY = H * 0.78;
  const n = Math.max(type.title.length, 1);
  const targetTitleWidth = W * 0.72;
  // Baseline size: short words → bigger, longer words → smaller.
  // Capped at 96 to keep proportion with the rest of the layout.
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
      ${cellsSvg}
      ${riverSvg}
      ${titleBlock}
    </svg>`
  };
}

// ─── Tessellation generator ────────────────────────────────────────────────

function generateJitteredCells(
  mapBox: { x: number; y: number; w: number; h: number },
  rng: () => number,
  density: "rarefatta" | "media" | "densa"
): Array<Array<[number, number]>> {
  const cols = density === "rarefatta" ? 5 : density === "densa" ? 9 : 7;
  const rows = Math.max(4, Math.round((cols * mapBox.h) / mapBox.w));
  const cellW = mapBox.w / cols;
  const cellH = mapBox.h / rows;
  // Jitter amount: ~30–40% of cell size → produces organic but readable cells
  const jx = cellW * 0.42;
  const jy = cellH * 0.42;

  // Build a grid of vertices, jittered on interior nodes
  const verts: Array<Array<[number, number]>> = [];
  for (let r = 0; r <= rows; r++) {
    verts[r] = [];
    for (let c = 0; c <= cols; c++) {
      const onEdge = r === 0 || r === rows || c === 0 || c === cols;
      const x = mapBox.x + c * cellW + (onEdge ? 0 : (rng() - 0.5) * jx);
      const y = mapBox.y + r * cellH + (onEdge ? 0 : (rng() - 0.5) * jy);
      verts[r].push([x, y]);
    }
  }

  // Each cell is a quadrilateral from 4 grid vertices
  const cells: Array<Array<[number, number]>> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push([verts[r][c], verts[r][c + 1], verts[r + 1][c + 1], verts[r + 1][c]]);
    }
  }
  return cells;
}

// ─── River path ───────────────────────────────────────────────────────────

function generateRiverPath(mapBox: { x: number; y: number; w: number; h: number }, rng: () => number): string {
  // Smooth Catmull-Rom curve from BEYOND the left edge to BEYOND the right edge.
  const baseY = mapBox.y + mapBox.h * (0.45 + (rng() - 0.5) * 0.25);
  const extend = mapBox.w * 0.16;
  const pts: Array<[number, number]> = [];
  pts.push([mapBox.x - extend, baseY + (rng() - 0.5) * 30]);
  const ctrl = 7;
  for (let i = 0; i <= ctrl; i++) {
    const x = mapBox.x + (i / ctrl) * mapBox.w;
    const y = baseY + (rng() - 0.5) * 110;
    pts.push([x, y]);
  }
  pts.push([mapBox.x + mapBox.w + extend, baseY + (rng() - 0.5) * 30]);
  return catmullRomPath(pts, 0.5);
}

function catmullRomPath(points: Array<[number, number]>, tension: number): string {
  if (points.length < 2) return "";
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + ((p2[0] - p0[0]) / 6) * tension;
    const c1y = p1[1] + ((p2[1] - p0[1]) / 6) * tension;
    const c2x = p2[0] - ((p3[0] - p1[0]) / 6) * tension;
    const c2y = p2[1] - ((p3[1] - p1[1]) / 6) * tension;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// ─── Color selection helpers ──────────────────────────────────────────────

function pickCellColor(palette: string[], idx: number, rng: () => number): string {
  // Cycle through palette with a slight stochastic variation to avoid
  // visible repeat patterns on the grid.
  const offset = Math.floor(rng() * palette.length);
  return palette[(idx + offset) % palette.length];
}

function pickRiverColor(mood: FullInterpretation["mood"], _cellPalette: string[]): string {
  // Fixed light steel-blue. The "water" is the brand-identity element
  // of the poster — it must ALWAYS contrast with the tessellation so that
  // the river/coast reads instantly. Slight warm vs cool variant.
  return mood.temperature === "calda" ? "#7FB7C9" : "#8FC4D4";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  };
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, "0")}${lg.toString(16).padStart(2, "0")}${lb.toString(16).padStart(2, "0")}`;
}

// ─── Utilities ────────────────────────────────────────────────────────────

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
