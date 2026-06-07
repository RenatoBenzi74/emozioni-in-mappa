import type { FullInterpretation } from "./types";

/**
 * Real-map poster renderer.
 *
 * Visual idiom:
 *  - Real OpenStreetMap raster tiles stitched together = the map area.
 *    This is downloaded server-side at request time; the geometry is
 *    authentic (real streets, real water, real urban shapes).
 *  - A palette-derived color wash recolors the tiles toward the user's
 *    photo atmosphere (SVG <filter feColorMatrix> + multiply blend).
 *  - Real waterways from Overpass are emphasized on top in the brand blue
 *    so the river / coast extends slightly beyond the crop.
 *  - Big serif uppercase title + italic subtitle + country + coords.
 *
 *  If the tile download fails the renderer falls back to a Voronoi-style
 *  tessellation seeded by real street intersections, so the poster is
 *  never broken.
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

  // Mercator-ish projection inside the map crop (Web Mercator)
  const [minLng, minLat, maxLng, maxLat] = map.bbox;
  const projY = (lat: number) => {
    const sinLat = Math.sin((lat * Math.PI) / 180);
    return 0.5 - 0.25 * Math.log((1 + sinLat) / (1 - sinLat)) / Math.PI;
  };
  const yMin = projY(maxLat);
  const yMax = projY(minLat);
  const proj = (lng: number, lat: number): [number, number] => [
    mapBox.x + ((lng - minLng) / (maxLng - minLng)) * mapBox.w,
    mapBox.y + ((projY(lat) - yMin) / (yMax - yMin)) * mapBox.h
  ];
  const projCoord = (c: [number, number]) => proj(c[0], c[1]);

  // ─── Palette wash filter from photo palette ───────────────────────────
  // Build a 4x4 color matrix that pushes the tile toward the dominant
  // palette: average of accent + highlight tinted on top of cream.
  const tintHex = mood.palette.find((p) => p.role === "shadow" || p.role === "accent")?.hex
    ?? mood.palette[mood.palette.length - 1].hex;
  const { r: tr, g: tg, b: tb } = hexToRgb(tintHex);
  const tintMatrix = `
    0.65 0.10 0.05 0 ${(tr / 255) * 0.10}
    0.08 0.65 0.05 0 ${(tg / 255) * 0.10}
    0.05 0.10 0.65 0 ${(tb / 255) * 0.10}
    0    0    0    1 0
  `.trim();

  const filterDef = `
    <defs>
      <filter id="paperize" color-interpolation-filters="sRGB">
        <!-- Slightly desaturate, warm toward the palette tint -->
        <feColorMatrix type="matrix" values="${tintMatrix}"/>
        <feComponentTransfer>
          <feFuncR type="linear" slope="1.05" intercept="0.03"/>
          <feFuncG type="linear" slope="1.03" intercept="0.04"/>
          <feFuncB type="linear" slope="0.95" intercept="0.05"/>
        </feComponentTransfer>
      </filter>
      <clipPath id="mapcrop">
        <rect x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.w}" height="${mapBox.h}"/>
      </clipPath>
    </defs>
  `;

  // ─── Map layer ────────────────────────────────────────────────────────
  let mapLayer = "";
  if (map.tileImage) {
    // Real OSM raster, paper-toned
    mapLayer = `
      <g clip-path="url(#mapcrop)">
        <image x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.w}" height="${mapBox.h}"
               preserveAspectRatio="xMidYMid slice"
               href="${map.tileImage.dataUrl}"
               filter="url(#paperize)"/>
      </g>
    `;
  } else {
    // Fallback: vector treatment (Voronoi-on-intersections)
    mapLayer = renderVectorFallback(map, mood, art, mapBox, projCoord, place);
  }

  // ─── Waterways on top — real rivers in the brand blue ─────────────────
  const riverColor = pickRiverColor(mood);
  const waterwaysSvg = map.waterways
    .map((s) => {
      const d = pathFromCoords(s.coords, projCoord);
      if (!d) return "";
      return `<path d="${d}" fill="none" stroke="${riverColor}" stroke-width="${map.tileImage ? 6 : 14}" stroke-linecap="round" stroke-linejoin="round" opacity="${map.tileImage ? 0.92 : 0.95}"/>`;
    })
    .join("");

  // ─── Top metadata strip ───────────────────────────────────────────────
  const sourceTag = map.tileImage
    ? `OSM · ${map.tileImage.server.toUpperCase()}`
    : map.source === "osm"
    ? "OSM · VECTOR"
    : "STUDIO · PROCEDURAL";
  const topMeta = `
    <g font-family="JetBrains Mono, monospace" fill="${art.inkColor}" font-size="10" letter-spacing="2.2" opacity="0.55">
      <text x="${mapBox.x}" y="${H * 0.06}">EMOZIONI IN MAPPA · ${escapeXml(map.precision.toUpperCase())}</text>
      <text x="${W - mapBox.x}" y="${H * 0.06}" text-anchor="end">${sourceTag}</text>
    </g>
  `;

  // ─── Thin frame around the map crop ──────────────────────────────────
  const frame = `<rect x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.w}" height="${mapBox.h}" fill="none" stroke="${art.inkColor}" stroke-width="0.6" opacity="0.4"/>`;

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
      ${filterDef}
      <rect width="${W}" height="${H}" fill="${art.background}"/>
      ${topMeta}
      ${mapLayer}
      <g clip-path="url(#mapcrop)">${waterwaysSvg}</g>
      ${frame}
      ${titleBlock}
    </svg>`
  };
}

// ─── Vector-only fallback (used if raster stitch failed) ─────────────────

function renderVectorFallback(
  map: FullInterpretation["map"],
  mood: FullInterpretation["mood"],
  art: FullInterpretation["art"],
  mapBox: { x: number; y: number; w: number; h: number },
  projCoord: (c: [number, number]) => [number, number],
  place: FullInterpretation["place"]
): string {
  // Simple darkest streets style: cream background, real streets in ink,
  // real water polygons in blue. Honest map look.
  const streetsSvg = map.streets
    .map((s) => {
      const d = pathFromCoords(s.coords, projCoord);
      if (!d) return "";
      const w = s.type === "primary" ? 3.4 : s.type === "secondary" ? 2.2 : s.type === "tertiary" ? 1.4 : 0.7;
      return `<path d="${d}" fill="none" stroke="${art.inkColor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>`;
    })
    .join("");
  const riverColor = pickRiverColor(mood);
  const waterSvg = map.water
    .map((p) => {
      if (p.coords.length < 3) return "";
      const pts = p.coords.map(projCoord).map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(" ");
      return `<polygon points="${pts}" fill="${riverColor}" opacity="0.95"/>`;
    })
    .join("");
  return `
    <g clip-path="url(#mapcrop)">
      <rect x="${mapBox.x}" y="${mapBox.y}" width="${mapBox.w}" height="${mapBox.h}" fill="#f1ebda"/>
      ${waterSvg}
      ${streetsSvg}
    </g>
  `;
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function pathFromCoords(
  coords: Array<[number, number]>,
  proj: (c: [number, number]) => [number, number]
): string {
  if (!coords || coords.length < 2) return "";
  let d = "";
  for (let i = 0; i < coords.length; i++) {
    const p = proj(coords[i]);
    d += `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)} `;
  }
  return d.trim();
}

function pickRiverColor(mood: FullInterpretation["mood"]): string {
  return mood.temperature === "calda" ? "#5A8FA8" : "#3F7B96";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
