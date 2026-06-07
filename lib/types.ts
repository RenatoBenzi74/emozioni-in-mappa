// Shared type system for Emozioni in Mappa
// The vocabulary is part of the brand — these names appear in UI and prompts.

export type AtmosphereWord =
  | "delicato"
  | "urbano"
  | "rarefatto"
  | "caldo"
  | "freddo"
  | "silenzioso"
  | "vibrante"
  | "geometrico"
  | "organico"
  | "nostalgico"
  | "mediterraneo"
  | "nordico"
  | "industriale"
  | "intimo"
  | "arioso"
  | "minerale"
  | "luce";

export interface PaletteColor {
  hex: string;
  role: "background" | "ink" | "accent" | "highlight" | "shadow";
  weight: number; // 0..1, proportional area in the source images
}

export interface PlaceIdentity {
  city: string;
  district?: string;
  country: string;
  coordinates: { lat: number; lng: number };
  confidence: number; // 0..1
  reasoning: string;
}

export interface VisualMood {
  palette: PaletteColor[];
  temperature: "calda" | "fredda" | "neutra";
  luminosity: number;          // 0..1
  contrast: number;            // 0..1
  saturation: number;          // 0..1
  density: "rarefatta" | "media" | "densa";
  rhythm: "regolare" | "spezzato" | "fluido";
  atmosphere: AtmosphereWord[]; // 2–4 words, never more
}

export type Precision = "essenziale" | "standard" | "cartografica";

export interface MapData {
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  zoom: number;
  precision: Precision;
  source: "osm" | "procedural";
  // Coordinates use [lng, lat] in geographic space (WGS84).
  streets: Street[];
  water: Polygon[];           // areal water (lakes, sea)
  waterways: Street[];        // linear water (rivers, canals)
}

export interface Street {
  type: "primary" | "secondary" | "tertiary" | "residential" | "pedestrian";
  coords: Array<[number, number]>; // [lng, lat]
}

export interface Polygon {
  coords: Array<[number, number]>; // [lng, lat]
}

export interface ArtDirection {
  layout: "vertical-portrait" | "square" | "wallpaper";
  composition: "centered" | "lower-third" | "rule-of-thirds";
  background: string;        // hex
  inkColor: string;          // hex
  accentColor: string;       // hex
  highlightColor: string;    // hex
  strokeWeight: { primary: number; secondary: number; tertiary: number };
  negativeSpaceRatio: number; // 0..1, target
  graininess: number;        // 0..1, soft paper texture
}

export interface Typography {
  title: string;             // e.g. "Lisbona"
  subtitle: string;          // e.g. "Aprile, una luce bassa"
  coordinates: string;       // e.g. "38.7223° N / 9.1393° W"
  smallcaps?: string;        // e.g. "Edizione I — 24 aprile 2026"
  family: { display: string; mono: string };
  scale: { titlePt: number; subtitlePt: number; coordPt: number };
}

export interface PosterOutput {
  svg: string;
  width: number;
  height: number;
  format: "vertical-portrait" | "square" | "wallpaper";
}

export interface FullInterpretation {
  place: PlaceIdentity;
  mood: VisualMood;
  map: MapData;
  art: ArtDirection;
  type: Typography;
}
