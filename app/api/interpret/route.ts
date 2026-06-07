import { NextResponse } from "next/server";
import { detectPlace } from "@/lib/agents/place-detector";
import { analyzeMood } from "@/lib/agents/visual-mood-analyzer";
import { buildMap } from "@/lib/agents/map-engine";
import { directArt } from "@/lib/agents/art-direction-engine";
import { composeTypography } from "@/lib/agents/typography-system";
import { generatePoster } from "@/lib/agents/generative-output-engine";
import type { FullInterpretation, Precision } from "@/lib/types";

/**
 * Orchestrator.
 *
 * Input:
 *   { files: [{ name, size }], place: string, precision: Precision }
 *
 * The map data is REAL OpenStreetMap (Overpass API). On failure the engine
 * falls back to a procedural map so the experience never breaks.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request) {
  const body = (await req.json()) as { files?: Array<{ name: string; size: number }>; place?: string; precision?: Precision };
  const names = (body.files ?? []).map((f) => f.name);
  const hint = (body.place ?? "").trim();
  const precision: Precision = (["essenziale", "standard", "cartografica"] as const).includes(body.precision as any)
    ? (body.precision as Precision)
    : "standard";

  const place = await detectPlace(names, hint);
  const mood = await analyzeMood(place);
  const map = await buildMap(place, mood, precision);
  const art = await directArt(mood);
  const type = await composeTypography(place, mood);

  const interpretation: FullInterpretation = { place, mood, map, art, type };
  const poster = await generatePoster(interpretation);

  return NextResponse.json({ interpretation, poster });
}
