/**
 * OpenStreetMap tile stitcher.
 *
 * Given a bbox and zoom, computes the set of XYZ tiles that covers the bbox,
 * downloads each tile from a public tileserver (no API key needed), and
 * stitches them into a single PNG returned as a base64 data-URL.
 *
 * Tile servers tried in order. Each respects OSM/Stadia usage policy.
 * The standard OpenStreetMap renderer is rate-limited (max 2 req/sec
 * per IP, must send a User-Agent) and is the default. CartoDB Voyager
 * is used as a fallback because it allows higher rates and produces a
 * cleaner, more design-oriented look.
 */

import sharp from "sharp";

const TILE_SIZE = 256;

const TILE_SERVERS = [
  // Carto Voyager — clean, soft pastel cartography. Great for posters.
  {
    name: "carto-voyager",
    url: (z: number, x: number, y: number) => `https://basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`
  },
  // OSM Standard — colorful classic.
  {
    name: "osm",
    url: (z: number, x: number, y: number) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
  },
  // Carto Positron — very pale, almost monochrome.
  {
    name: "carto-positron",
    url: (z: number, x: number, y: number) => `https://basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`
  }
];

export interface StitchResult {
  /** PNG base64 data URL ready for <image href="..."> */
  dataUrl: string;
  /** Pixel size of the stitched image */
  width: number;
  height: number;
  /** Geographic bbox actually covered (may be slightly larger than requested due to tile alignment) */
  coveredBbox: [number, number, number, number];
  /** Which tile server actually served the tiles */
  server: string;
}

/**
 * Fetch and stitch tiles for the given bbox at the given zoom.
 * Returns a single PNG that exactly covers the requested bbox (cropped
 * to the requested area, not to tile boundaries).
 */
export async function stitchOsmMap(
  bbox: [number, number, number, number],
  zoom: number,
  fetchImpl: typeof fetch = fetch
): Promise<StitchResult | null> {
  const [minLng, minLat, maxLng, maxLat] = bbox;

  // Tile range for bbox
  const minTileX = Math.floor(lngToTileX(minLng, zoom));
  const maxTileX = Math.floor(lngToTileX(maxLng, zoom));
  const minTileY = Math.floor(latToTileY(maxLat, zoom));   // y is flipped
  const maxTileY = Math.floor(latToTileY(minLat, zoom));

  const cols = maxTileX - minTileX + 1;
  const rows = maxTileY - minTileY + 1;
  // Sanity guard: don't fetch huge stitch sizes
  if (cols * rows > 25) return null;

  const fullW = cols * TILE_SIZE;
  const fullH = rows * TILE_SIZE;

  for (const server of TILE_SERVERS) {
    try {
      // Sequential fetch with small delay to be polite (esp. OSM).
      const tiles: { tx: number; ty: number; buf: Buffer }[] = [];
      for (let tx = minTileX; tx <= maxTileX; tx++) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          const url = server.url(zoom, tx, ty);
          const res = await fetchImpl(url, {
            headers: {
              "user-agent": "EmozioniInMappa/1.0 (https://emozioniinmappa.app; studio@emozioniinmappa.local)",
              accept: "image/png,image/*"
            }
          });
          if (!res.ok) throw new Error(`Tile ${url} HTTP ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          tiles.push({ tx: tx - minTileX, ty: ty - minTileY, buf });
          await new Promise((r) => setTimeout(r, 60)); // be gentle
        }
      }

      // Composite tiles into a single canvas
      const composite = tiles.map((t) => ({
        input: t.buf,
        left: t.tx * TILE_SIZE,
        top: t.ty * TILE_SIZE
      }));
      const stitched = await sharp({
        create: { width: fullW, height: fullH, channels: 3, background: { r: 251, g: 250, b: 247 } }
      })
        .composite(composite)
        .png()
        .toBuffer();

      // Crop to exact bbox: figure out pixel offsets within the stitched image
      const lngToPx = (lng: number) => (lngToTileX(lng, zoom) - minTileX) * TILE_SIZE;
      const latToPx = (lat: number) => (latToTileY(lat, zoom) - minTileY) * TILE_SIZE;
      const cropLeft = Math.max(0, Math.round(lngToPx(minLng)));
      const cropRight = Math.min(fullW, Math.round(lngToPx(maxLng)));
      const cropTop = Math.max(0, Math.round(latToPx(maxLat)));
      const cropBottom = Math.min(fullH, Math.round(latToPx(minLat)));
      const cropW = Math.max(1, cropRight - cropLeft);
      const cropH = Math.max(1, cropBottom - cropTop);

      const cropped = await sharp(stitched)
        .extract({ left: cropLeft, top: cropTop, width: cropW, height: cropH })
        .png()
        .toBuffer();

      return {
        dataUrl: `data:image/png;base64,${cropped.toString("base64")}`,
        width: cropW,
        height: cropH,
        coveredBbox: bbox,
        server: server.name
      };
    } catch (err) {
      console.warn(`[tile-stitcher] ${server.name} failed:`, (err as Error).message);
      // try next server
    }
  }
  return null;
}

// ─── Mercator projection helpers ─────────────────────────────────────────

function lngToTileX(lng: number, zoom: number): number {
  return ((lng + 180) / 360) * Math.pow(2, zoom);
}

function latToTileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom);
}
