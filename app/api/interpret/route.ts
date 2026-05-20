import { NextResponse } from "next/server";
import { detectPlace } from "@/lib/agents/place-detector";
import { analyzeMood } from "@/lib/agents/visual-mood-analyzer";
import { buildMap } from "@/lib/agents/map-engine";
import { directArt } from "@/lib/agents/art-direction-engine";
import { composeTypography } from "@/lib/agents/typography-system";
import { generatePoster } from "@/lib/agents/generative-output-engine";
import type { FullInterpretation } from "@/lib/types";

/**
 * Orchestrator: the six agents run sequentially because each one
 * depends on the previous one's output. In production the place
 * detector and the mood analyzer can run in parallel — the rest
 * is strictly sequential.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { files: Array<{ name: string; size: number }> };
  const names = (body.files ?? []).map((f) => f.name);

  const place = await detectPlace(names);
  const mood = await analyzeMood(place);
  const map = await buildMap(place, mood);
  const art = await directArt(mood);
  const type = await composeTypography(place, mood);

  const interpretation: FullInterpretation = { place, mood, map, art, type };
  const poster = await generatePoster(interpretation);

  return NextResponse.json({ interpretation, poster });
}
