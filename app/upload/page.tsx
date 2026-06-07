"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SUGGESTIONS = ["Lisbona", "Tropea", "Genova", "Barcellona", "Venezia", "Napoli", "Kyoto", "Copenhagen", "Marrakech", "Londra", "Parigi", "Reykjavík"];

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [place, setPlace] = useState("");

  const minFilesOk = files.length >= 3;
  const placeOk = place.trim().length >= 2;
  const ready = minFilesOk && placeOk;

  const onPick = (list: FileList | null) => {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((prev) => [...prev, ...arr].slice(0, 12));
  };

  const begin = async () => {
    if (!ready) return;
    const meta = files.map((f) => ({ name: f.name, size: f.size }));
    sessionStorage.setItem("eim:files", JSON.stringify(meta));
    sessionStorage.setItem("eim:place", place.trim());
    router.push("/analyze");
  };

  return (
    <div className="grid grid-cols-12 gap-8 slow-fade">
      <aside className="col-span-12 md:col-span-4 space-y-6">
        <p className="font-mono text-xs uppercase tracking-wide text-ink-500">i. Carica</p>
        <h2 className="font-display text-4xl leading-tight">
          Tre fotografie<br />
          <span className="italic font-light">scattate da te.</span>
        </h2>
        <p className="text-ink-700 leading-relaxed">
          Non servono persone, non servono pose, non servono foto perfette.
          Servono fotografie che ricordino come hai <em>guardato</em> quel luogo.
        </p>
        <ul className="text-sm text-ink-500 space-y-2 mt-6 font-mono">
          <li>· Dettagli, ombre, superfici.</li>
          <li>· Strade, finestre, materiali.</li>
          <li>· Cielo, mare, luce d'ora bassa.</li>
        </ul>
      </aside>

      <section className="col-span-12 md:col-span-8 space-y-8">
        {/* Place input — explicit declaration */}
        <div className="space-y-3">
          <label htmlFor="place" className="block">
            <span className="font-mono text-[10px] tracking-wide uppercase text-ink-500">
              Di quale luogo si tratta?
            </span>
            <input
              id="place"
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Es: Genova, Barcellona, Alfama, Brera…"
              className="mt-2 block w-full bg-transparent border-0 border-b border-ink-300 focus:border-ink-900 px-0 py-3 text-3xl font-display tracking-tight text-ink-900 placeholder:text-ink-300 focus:outline-none transition-colors duration-500 ease-soft"
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPlace(s)}
                className={`text-xs uppercase tracking-wide px-3 py-1 border transition-colors duration-300 ${
                  place === s ? "border-ink-900 bg-ink-900 text-paper-50" : "border-ink-100 text-ink-500 hover:border-ink-700 hover:text-ink-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Upload zone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            onPick(e.dataTransfer.files);
          }}
          className={`block border ${drag ? "border-ink-900" : "border-ink-100"} aspect-[3/2] transition-colors duration-500 ease-soft cursor-pointer`}
        >
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onPick(e.target.files)} />
          <div className="h-full w-full flex flex-col items-center justify-center text-center px-12">
            <p className="font-display text-3xl">Trascina qui le tue fotografie</p>
            <p className="mt-3 text-ink-500 text-sm">o clicca per selezionarle. Minimo 3, massimo 12.</p>
            <p className="mt-12 font-mono text-xs tracking-wide text-ink-500">
              {files.length} / 12 — formato consigliato: JPEG, HEIC, PNG
            </p>
          </div>
        </label>

        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {files.map((f, i) => (
              <Thumb key={i} file={f} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between editorial-rule pt-6">
          <p className="text-xs text-ink-500 font-mono">
            {!placeOk
              ? "Manca il nome del luogo."
              : !minFilesOk
              ? `Servono ancora ${3 - files.length} foto.`
              : `${place} — pronto per l'interpretazione.`}
          </p>
          <button
            disabled={!ready}
            onClick={begin}
            className={`inline-flex items-center gap-3 px-6 py-3 text-sm uppercase tracking-editorial border transition-colors duration-700 ease-soft ${
              ready ? "border-ink-900 hover:bg-ink-900 hover:text-paper-50" : "border-ink-100 text-ink-300 cursor-not-allowed"
            }`}
          >
            Inizia interpretazione
            <span aria-hidden>→</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function Thumb({ file }: { file: File }) {
  const url = URL.createObjectURL(file);
  return (
    <div className="aspect-square overflow-hidden bg-paper-100">
      <img src={url} alt="" className="w-full h-full object-cover" />
    </div>
  );
}
