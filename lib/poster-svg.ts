import type { FullInterpretation, Street } from "./types";

/**
 * Pure SVG renderer for the editorial poster.
 *
 * Layout philosophy:
 *  - Vertical portrait, ratio 2:3 (matches A2/A3 print sizes).
 *  - Lower-third composition: map sits in the upper 60%, typography
 *    block in the lower 30%, with a 10% breath of negative space.
 *  - One single accent element is allowed (water polyline or a thin
 *    diagonal axis), never both.
 *  - All strokes are vector. No raster, no gradients, no drop shadows.
 *
 * The function is intentionally framework-free: it returns a string
 * that can be inlined in React, written to disk, or rasterized server-side
 * with sharp/resvg.
 */
export function renderPosterSvg(full: FullInterpretation, format: "vertical-portrait" | "square" = "vertical-portrait"): {
  svg: string;
  width: number;
  height: number;
} {
  const W = 800;
  const H = format === "vertical-portrait" ? 1200 : 800;

  const { map, art, type, mood, place } = full;
  const stroke = (tier: Street["type"]) =>
    tier === "primary"
      ? art.strokeWeight.primary
      : tier === "secondary"
      ? art.strokeWeight.secondary
      : art.strokeWeight.tertiary;

  // Map area: upper 60% with 10% horizontal margin
  const mapMargin = W * 0.12;
  const mapBox = {
    x: mapMargin,
    y: H * 0.10,
    w: W - mapMargin * 2,
    h: H * 0.46
  };

  const toX = (nx: number) => mapBox.x + nx * mapBox.w;
  const toY = (ny: number) => mapBox.y + ny * mapBox.h;

  const streetPaths = map.streets
    .map((s) => {
      const d = s.coords
        .map((c, i) => `${i === 0 ? "M" : "L"}${toX(c[0]).toFixed(2)} ${toY(c[1]).toFixed(2)}`)
        .join(" ");
      const opacity =
        s.type === "primary" ? 0.92 : s.type === "secondary" ? 0.78 : s.type === "tertiary" ? 0.62 : 0.48;
      return `<path d="${d}" fill="none" stroke="${art.inkColor}" stroke-width="${stroke(s.type)}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
    })
    .join("\n");

  const waterPath =
    map.water && map.water.length > 0
      ? `<path d="${map.water[0].coords.map((c, i) => `${i === 0 ? "M" : "L"}${toX(c[0]).toFixed(2)} ${toY(c[1]).toFixed(2)}`).join(" ")} Z" fill="${art.accentColor}" opacity="0.18"/>`
      : "";

  // Frame: thin inner rule, editorial
  const frameInset = 36;
  const frame = `<rect x="${frameInset}" y="${frameInset}" width="${W - frameInset * 2}" height="${H - frameInset * 2}" fill="none" stroke="${art.inkColor}" stroke-width="0.6" opacity="0.18"/>`;

  // Top metadata strip
  const topMeta = `
    <g font-family="${type.family.mono}" fill="${art.inkColor}" font-size="11" letter-spacing="2.2">
      <text x="${mapBox.x}" y="${H * 0.07}" opacity="0.6">EMOZIONI IN MAPPA · STUDIO</text>
      <text x="${W - mapBox.x}" y="${H * 0.07}" text-anchor="end" opacity="0.6">N° I / ${new Date().getFullYear()}</text>
    </g>
  `;

  // Palette strip — 5 small squares, bottom right of map
  const paletteY = mapBox.y + mapBox.h + 22;
  const paletteX = W - mapMargin - mood.palette.length * 16;
  const paletteStrip = mood.palette
    .map((c, i) => `<rect x="${paletteX + i * 16}" y="${paletteY}" width="12" height="4" fill="${c.hex}"/>`)
    .join("");

  // Atmosphere words — bottom left of map, mono
  const moodWords = `
    <g font-family="${type.family.mono}" fill="${art.inkColor}" font-size="10" letter-spacing="2.8" opacity="0.7">
      <text x="${mapBox.x}" y="${paletteY + 4}">${mood.atmosphere
    .map((w) => w.toUpperCase())
    .join("   ·   ")}</text>
    </g>
  `;

  // Title block — centered, lower third
  const titleY = H * 0.74;
  const titleBlock = `
    <g text-anchor="middle">
      <text x="${W / 2}" y="${titleY}"
            font-family="${type.family.display}"
            font-size="${type.scale.titlePt}"
            fill="${art.inkColor}"
            font-weight="500"
            letter-spacing="-1.4">
        ${escapeXml(type.title)}
      </text>
      <text x="${W / 2}" y="${titleY + 34}"
            font-family="${type.family.display}"
            font-style="italic"
            font-size="${type.scale.subtitlePt}"
            fill="${art.inkColor}"
            opacity="0.75">
        ${escapeXml(type.subtitle)}
      </text>
      <line x1="${W / 2 - 28}" y1="${titleY + 56}" x2="${W / 2 + 28}" y2="${titleY + 56}"
            stroke="${art.inkColor}" stroke-width="0.6" opacity="0.5"/>
      <text x="${W / 2}" y="${titleY + 76}"
            font-family="${type.family.mono}"
            font-size="${type.scale.coordPt}"
            letter-spacing="3"
            fill="${art.inkColor}"
            opacity="0.7">
        ${escapeXml(type.coordinates.toUpperCase())}
      </text>
    </g>
  `;

  // Bottom block — country + edition
  const bottomBlock = `
    <g font-family="${type.family.mono}" font-size="9" letter-spacing="2.4" fill="${art.inkColor}" opacity="0.55">
      <text x="${mapBox.x}" y="${H - 56}">${escapeXml(place.country.toUpperCase())}${
    place.district ? "  ·  " + escapeXml(place.district.toUpperCase()) : ""
  }</text>
      <text x="${W - mapBox.x}" y="${H - 56}" text-anchor="end">${escapeXml((type.smallcaps ?? "").toUpperCase())}</text>
    </g>
  `;

  // Optional grain — extremely subtle paper texture for warmth
  const grain =
    art.graininess > 0.4
      ? `<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${Math.floor(
          place.coordinates.lat * 1000
        )}"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.04 0"/></filter>
        <rect width="${W}" height="${H}" filter="url(#paper)" opacity="${art.graininess * 0.5}"/>`
      : "";

  return {
    width: W,
    height: H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${art.background}"/>
      ${grain}
      ${frame}
      ${topMeta}
      ${waterPath}
      ${streetPaths}
      ${paletteStrip}
      ${moodWords}
      ${titleBlock}
      ${bottomBlock}
    </svg>`
  };
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
