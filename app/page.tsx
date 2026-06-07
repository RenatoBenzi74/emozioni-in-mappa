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
          <SamplePoster place="Genova" coord="44.40 / 8.94" country="Italia" mood={["mediterraneo", "vibrante"]} palette={["#f4ebd7", "#d99970", "#c45c3a", "#3f6477", "#8a6f4e", "#1d1815"]} />
          <SamplePoster place="Londra" coord="51.50 / -0.12" country="Regno Unito" mood={["urbano", "vibrante"]} palette={["#f4ecd9", "#3a6c70", "#7b3a4f", "#d8542c", "#8b8aa5", "#1a1a1a"]} />
          <SamplePoster place="Tropea" coord="38.67 / 15.89" country="Italia" mood={["vibrante", "luce"]} palette={["#f5ecd9", "#e1b07a", "#2a78a6", "#a13a2e", "#7c6b5a", "#0f1d2a"]} />
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

function SamplePoster({ place, coord, mood, palette, country }: { place: string; coord: string; mood: string[]; palette: string[]; country?: string }) {
  // Mini tessellation preview — same idiom as the production poster
  const COLS = 5;
  const ROWS = 7;
  const seed = place.charCodeAt(0) * 31 + place.charCodeAt(1);
  const rng = (i: number) => {
    let x = Math.sin((seed + i) * 91.3458) * 43758.5453;
    return x - Math.floor(x);
  };
  const W = 200;
  const H = 300;
  const mapMargin = 20;
  const mapBox = { x: mapMargin, y: 40, w: W - mapMargin * 2, h: 160 };
  const cellW = mapBox.w / COLS;
  const cellH = mapBox.h / ROWS;
  const verts: number[][][] = [];
  for (let r = 0; r <= ROWS; r++) {
    verts[r] = [];
    for (let c = 0; c <= COLS; c++) {
      const onEdge = r === 0 || r === ROWS || c === 0 || c === COLS;
      const x = mapBox.x + c * cellW + (onEdge ? 0 : (rng(r * 11 + c) - 0.5) * cellW * 0.45);
      const y = mapBox.y + r * cellH + (onEdge ? 0 : (rng(r * 13 + c + 4) - 0.5) * cellH * 0.45);
      verts[r].push([x, y]);
    }
  }
  const fillCols = palette.slice(1); // skip background
  const cells: Array<{ points: string; fill: string }> = [];
  let i = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const pts = [verts[r][c], verts[r][c + 1], verts[r + 1][c + 1], verts[r + 1][c]];
      const points = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
      const fill = fillCols[(i + Math.floor(rng(i * 7) * fillCols.length)) % fillCols.length];
      cells.push({ points, fill });
      i++;
    }
  }
  // River curve
  const riverY = mapBox.y + mapBox.h * 0.55;
  const r1 = riverY + (rng(99) - 0.5) * 30;
  const r2 = riverY + (rng(98) - 0.5) * 30;
  const r3 = riverY + (rng(97) - 0.5) * 30;

  return (
    <figure className="space-y-3">
      <div className="aspect-[2/3] relative overflow-hidden" style={{ background: palette[0] }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full">
          {cells.map((c, k) => (
            <polygon key={k} points={c.points} fill={c.fill} stroke={palette[0]} strokeWidth="1.4" strokeLinejoin="round" />
          ))}
          <path
            d={`M${mapBox.x - 20} ${r1} C${mapBox.x + 40} ${r1 + 10}, ${mapBox.x + 100} ${r2 - 20}, ${mapBox.x + 130} ${r2} S${mapBox.x + mapBox.w + 20} ${r3}, ${mapBox.x + mapBox.w + 30} ${r3}`}
            fill="none"
            stroke="#88BFD0"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <text
            x={W / 2}
            y={H - 60}
            textAnchor="middle"
            fontFamily="'Cormorant Garamond', serif"
            fontSize="26"
            fill={palette[palette.length - 1]}
            letterSpacing="3"
            fontWeight="500"
          >
            {place.toUpperCase()}
          </text>
          {country && (
            <text
              x={W / 2}
              y={H - 35}
              textAnchor="middle"
              fontFamily="Inter, sans-serif"
              fontSize="8"
              fill={palette[palette.length - 1]}
              letterSpacing="1.5"
              opacity="0.7"
            >
              {country}
            </text>
          )}
        </svg>
      </div>
      <figcaption className="flex items-center justify-between text-xs uppercase tracking-wide text-ink-500">
        <span>{place}</span>
        <span className="italic font-display normal-case text-ink-700">{mood.join(" · ")}</span>
      </figcaption>
    </figure>
  );
}
