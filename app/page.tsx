import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-32">
      <section className="grid grid-cols-12 gap-8 items-end slow-fade">
        <div className="col-span-12 md:col-span-8">
          <p className="text-xs uppercase tracking-wide text-ink-500 mb-6">
            Studio di cartografia emozionale — Edizione 2026
          </p>
          <h1 className="font-display text-[clamp(2.5rem,7vw,6rem)] leading-[0.95] tracking-tight">
            Non creiamo<br />
            <span className="italic font-light">la mappa della città.</span><br />
            Creiamo la mappa del modo<br />
            in cui <span className="italic font-light">l’hai vissuta.</span>
          </h1>
        </div>
        <div className="col-span-12 md:col-span-4 md:pl-8 border-l border-ink-100">
          <p className="text-base text-ink-700 leading-relaxed">
            Carichi almeno tre fotografie scattate da te.
            Noi leggiamo la luce, la palette, il ritmo visivo del luogo —
            e li traduciamo in una mappa artistica minimalista, stampabile,
            unica come la tua esperienza.
          </p>
          <Link
            href="/upload"
            className="mt-8 inline-flex items-center gap-3 border border-ink-900 px-6 py-3 text-sm uppercase tracking-editorial hover:bg-ink-900 hover:text-paper-50 transition-colors duration-700 ease-soft"
          >
            Inizia il rituale
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-8 editorial-rule pb-20">
        <div className="col-span-12 md:col-span-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">001 — Filosofia</p>
        </div>
        <div className="col-span-12 md:col-span-8 space-y-6 text-lg leading-relaxed text-ink-700">
          <p>
            Ogni viaggio lascia una mappa interiore che nessun atlante può registrare.
            Una temperatura cromatica, un ritmo di vuoti e pieni, una luce specifica
            che ricordi senza saperlo.
          </p>
          <p>
            <em>Emozioni in Mappa</em> trasforma le tue fotografie in cartografia
            d’autore: la geografia reale resta intatta, ma viene rivestita
            del linguaggio visivo che <em>tu</em> hai trovato in quel luogo.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-12 gap-8 editorial-rule pb-20">
        <div className="col-span-12 md:col-span-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">002 — Il processo</p>
        </div>
        <ol className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-10 text-sm leading-relaxed text-ink-700">
          <ProcessStep n="i." title="Carica" body="Almeno tre fotografie scattate realmente nel luogo. Dettagli, scorci, ombre, superfici — non servono persone, non servono foto perfette." />
          <ProcessStep n="ii." title="Interpreta" body="Sei agenti AI specializzati leggono il luogo, la palette, l’atmosfera. La città viene riconosciuta dai segnali visivi, non da un input testuale." />
          <ProcessStep n="iii." title="Componi" body="Una mappa vettoriale reale viene rivestita del tuo linguaggio cromatico e composta con tipografia editoriale. Stampa pronta." />
        </ol>
      </section>

      <section id="galleria" className="grid grid-cols-12 gap-8">
        <div className="col-span-12 md:col-span-4">
          <p className="font-mono text-xs uppercase tracking-wide text-ink-500">003 — Galleria</p>
          <p className="mt-4 text-ink-700 leading-relaxed">
            Tre esempi di interpretazione. Stessa città può generare mappe
            radicalmente diverse a seconda di chi l’ha vissuta.
          </p>
        </div>
        <div className="col-span-12 md:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <SamplePoster place="Lisbona" coord="38.71 / -9.14" mood={["rarefatto", "caldo", "mediterraneo"]} palette={["#e9d5b3", "#c8a87a", "#5d4a3a", "#1f1d1a"]} />
          <SamplePoster place="Reykjavík" coord="64.14 / -21.94" mood={["nordico", "rarefatto", "minerale"]} palette={["#dfe4e9", "#a9b6c2", "#3a4a59", "#0f1418"]} />
          <SamplePoster place="Tropea" coord="38.67 / 15.89" mood={["vibrante", "mediterraneo", "luce"]} palette={["#f5ecd9", "#e1b07a", "#2a78a6", "#0f1d2a"]} />
        </div>
      </section>
    </div>
  );
}

function ProcessStep({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <li>
      <p className="font-display italic text-2xl">{n}</p>
      <p className="mt-3 font-display text-xl">{title}</p>
      <p className="mt-3 text-ink-500">{body}</p>
    </li>
  );
}

function SamplePoster({ place, coord, mood, palette }: { place: string; coord: string; mood: string[]; palette: string[] }) {
  return (
    <figure className="space-y-3">
      <div className="aspect-[2/3] border border-ink-100 p-5 relative overflow-hidden" style={{ background: palette[0] }}>
        <div className="absolute inset-5 border" style={{ borderColor: palette[3] + "33" }} />
        <svg viewBox="0 0 200 300" className="absolute inset-0 w-full h-full">
          {/* Procedural mini map preview — distinct seed per place */}
          {Array.from({ length: 22 }).map((_, i) => {
            const seed = place.charCodeAt(0) + i;
            const x1 = (seed * 13) % 180 + 10;
            const y1 = (seed * 29) % 260 + 20;
            const x2 = (seed * 37) % 180 + 10;
            const y2 = (seed * 17) % 260 + 20;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={palette[2]} strokeWidth={0.6} opacity={0.55} />;
          })}
        </svg>
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between" style={{ color: palette[3] }}>
          <div>
            <p className="font-display text-2xl tracking-tight">{place}</p>
            <p className="font-mono text-[10px] tracking-wide mt-1">{coord}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {palette.map((c, i) => (
              <span key={i} className="w-4 h-1.5 block" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>
      <figcaption className="flex items-center justify-between text-xs uppercase tracking-wide text-ink-500">
        <span>{place}</span>
        <span className="italic font-display normal-case text-ink-700">{mood.join(" · ")}</span>
      </figcaption>
    </figure>
  );
}
