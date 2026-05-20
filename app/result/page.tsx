"use client";

import { useEffect, useState } from "react";
import type { FullInterpretation, PosterOutput } from "@/lib/types";

type Payload = { interpretation: FullInterpretation; poster: PosterOutput };

export default function ResultPage() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("eim:interpretation");
    if (raw) setData(JSON.parse(raw));
  }, []);

  if (!data) return <div className="py-20 text-center text-ink-500 font-mono text-sm">Carico interpretazione…</div>;

  const { interpretation, poster } = data;
  const { place, mood, type } = interpretation;

  const downloadSvg = () => {
    const blob = new Blob([poster.svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${place.city.toLowerCase()}-emozioni-in-mappa.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-12 gap-10 slow-fade">
      <aside className="col-span-12 md:col-span-4 space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">iii. Mappa</p>
          <h2 className="font-display text-5xl mt-3">{place.city}</h2>
          {place.district && <p className="font-display italic text-xl text-ink-700">{place.district}</p>}
        </div>

        <div>
          <p className="font-mono text-[10px] tracking-wide text-ink-500 uppercase mb-2">Atmosfera</p>
          <div className="flex flex-wrap gap-2">
            {mood.atmosphere.map((w) => (
              <span key={w} className="border border-ink-100 px-3 py-1 text-xs uppercase tracking-wide text-ink-700">
                {w}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] tracking-wide text-ink-500 uppercase mb-2">Palette estratta</p>
          <div className="flex gap-1.5">
            {mood.palette.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <span className="h-12 w-9" style={{ background: c.hex }} />
                <span className="font-mono text-[9px] text-ink-500">{c.hex}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <Spec label="Temperatura" value={mood.temperature} />
          <Spec label="Luminosità" value={mood.luminosity.toFixed(2)} />
          <Spec label="Contrasto" value={mood.contrast.toFixed(2)} />
          <Spec label="Saturazione" value={mood.saturation.toFixed(2)} />
          <Spec label="Densità" value={mood.density} />
          <Spec label="Ritmo" value={mood.rhythm} />
        </div>

        <div className="pt-4 editorial-rule" />

        <p className="text-sm text-ink-700 leading-relaxed italic font-display">
          “{type.subtitle}”
        </p>

        <div className="flex gap-3 pt-2">
          <button
            onClick={downloadSvg}
            className="border border-ink-900 px-5 py-2.5 text-xs uppercase tracking-editorial hover:bg-ink-900 hover:text-paper-50 transition-colors duration-700 ease-soft"
          >
            Scarica SVG
          </button>
          <a
            href="/upload"
            className="border border-ink-100 px-5 py-2.5 text-xs uppercase tracking-editorial text-ink-500 hover:border-ink-900 hover:text-ink-900 transition-colors duration-700 ease-soft"
          >
            Nuova mappa
          </a>
        </div>
      </aside>

      <section className="col-span-12 md:col-span-8 flex items-start justify-center">
        <div
          className="w-full max-w-[560px] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)]"
          dangerouslySetInnerHTML={{ __html: poster.svg }}
        />
      </section>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between text-xs font-mono">
      <span className="uppercase tracking-wide text-ink-500">{label}</span>
      <span className="text-ink-900">{value}</span>
    </div>
  );
}
