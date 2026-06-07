import { NextResponse } from "next/server";
import { detectPlace } from "@/lib/agents/place-detector";
import { analyzeMood } from "@/lib/agents/visual-mood-analyzer";
import { buildMap } from "@/lib/agents/map-engine";
import { directArt } from "@/lib/agents/art-direction-engine";
import { composeTypography } from "@/lib/agents/typography-system";
import { generatePoster } from "@/lib/agents/generative-output-engine";
import type { FullInterpretation } from "@/lib/types";

/**
 * Orchestrator.
 *
 * Input:
 *   { files: [{ name, size }], place: string }   // place = user-typed hint
 *
 * In produzione l'utente dichiara il luogo (campo "place"), e Place
 * Detector lo conferma/arricchisce usando anche le foto.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { files?: Array<{ name: string; size: number }>; place?: string };
  const names = (body.files ?? []).map((f) => f.name);
  const hint = (body.place ?? "").trim();

  const place = await detectPlace(names, hint);
  const mood = await analyzeMood(place);
  const map = await buildMap(place, mood);
  const art = await directArt(mood);
  const type = await composeTypography(place, mood);

  const interpretation: FullInterpretation = { place, mood, map, art, type };
  const poster = await generatePoster(interpretation);

  return NextResponse.json({ interpretation, poster });
}
