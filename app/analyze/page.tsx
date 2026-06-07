"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const STEPS = [
  "Stiamo leggendo i colori del tuo viaggio…",
  "Analizziamo il ritmo visivo del luogo…",
  "Cerchiamo le coordinate dello sguardo…",
  "La città sta prendendo forma…",
  "Componiamo la mappa del modo in cui l’hai vissuta…"
];

export default function AnalyzePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const meta = JSON.parse(sessionStorage.getItem("eim:files") || "[]");
      const place = sessionStorage.getItem("eim:place") || "";
      if (!Array.isArray(meta) || meta.length < 3 || place.length === 0) {
        router.replace("/upload");
        return;
      }
      // Slow, contemplative pacing — the experience is part of the product.
      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return;
        setStep(i);
        await new Promise((r) => setTimeout(r, 1100));
      }
      const res = await fetch("/api/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ files: meta, place })
      });
      const data = await res.json();
      if (cancelled) return;
      sessionStorage.setItem("eim:interpretation", JSON.stringify(data));
      router.replace("/result");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-[60vh] grid place-items-center text-center slow-fade">
      <div className="max-w-xl space-y-8">
        <p className="font-mono text-xs tracking-wide text-ink-500">02 / interpretazione</p>
        <h2 className="font-display text-3xl md:text-4xl leading-snug breathe">
          <span key={step} className="slow-fade inline-block">{STEPS[step]}</span>
        </h2>
        <div className="flex justify-center gap-2 pt-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-px transition-all duration-700 ease-soft ${
                i <= step ? "bg-ink-900 w-12" : "bg-ink-100 w-8"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
