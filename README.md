# Emozioni in Mappa — MVP

> Non creiamo la mappa della città. Creiamo la mappa del modo in cui l'hai vissuta.

Prototipo Next.js dell'app **Emozioni in Mappa**: trasforma fotografie reali
di un luogo in una mappa artistica emozionale, minimalista e stampabile.

## Avvio locale

```bash
npm install
npm run dev
```

Apri `http://localhost:3000`.

## Flusso

1. **Landing** (`/`) — manifesto editoriale + galleria di tre interpretazioni esempio.
2. **Upload** (`/upload`) — drag&drop di minimo 3 fotografie (no persone richieste).
3. **Analyze** (`/analyze`) — sequenza contemplativa di 5 step. Chiama `/api/interpret`.
4. **Result** (`/result`) — poster SVG generato + palette + atmosfera + download SVG.

## Architettura multi-agente

Ogni agente è isolato in `lib/agents/`. Ogni file contiene **in JSDoc il
prompt di produzione** pronto per essere collegato a Claude / GPT-4o:

| # | Agente | File | Responsabilità |
|---|--------|------|----------------|
| 01 | Place Detector | `place-detector.ts` | EXIF + visione → città, quartiere, coordinate |
| 02 | Visual Mood Analyzer | `visual-mood-analyzer.ts` | Palette + temperatura + atmosfera |
| 03 | Map Engine | `map-engine.ts` | OSM/Overpass → rete urbana semplificata |
| 04 | Art Direction Engine | `art-direction-engine.ts` | Composizione, stroke, spazio negativo |
| 05 | Typography System | `typography-system.ts` | Titolo, sottotitolo, coordinate, edizione |
| 06 | Generative Output | `generative-output-engine.ts` | SVG finale + varianti |

L'orchestratore è in `app/api/interpret/route.ts`. In questa versione gli agenti
restituiscono **dati deterministici** (presets per Lisbona, Reykjavík, Tropea,
Kyoto, Copenhagen, Marrakech) per dimostrare la pipeline senza chiamare modelli
esterni. La firma I/O di ogni agente è già quella che userà la versione live.

## Sostituire i mock con AI reale

1. `place-detector.ts` → chiamata a **Claude Vision** o **GPT-4o** con il
   prompt nel JSDoc, allegando immagini + EXIF.
2. `visual-mood-analyzer.ts` → combinazione di **node-vibrant** (palette
   numerica) + Claude / GPT-4o (interpretazione atmosfera).
3. `map-engine.ts` → query **Overpass API** sulla bbox derivata da coordinate.
4. `art-direction-engine.ts` → puro deterministic mapping (può rimanere così)
   o Claude con structured output.
5. `typography-system.ts` → Claude completion con prompt nel JSDoc.
6. `generative-output-engine.ts` → SVG già pronto in `lib/poster-svg.ts`.
   Aggiungere `sharp` o `@resvg/resvg-js` per export PNG/JPG/PDF.

## Filosofia di prodotto

- **Less is more**: la mappa è il soggetto. Nessuna illustrazione, nessuna icona, nessuno skyline.
- **L'emozione è nello stile**, mai nel testo. Nessuna parola tipo "magico", "epico", "indimenticabile".
- **L'esperienza è lenta e contemplativa**: il caricamento è parte del prodotto.
- **Vocabolario controllato** per l'atmosfera: 17 parole curate, mai categorie banali.

## Stack

- Next.js 14 (App Router, RSC)
- TypeScript strict
- Tailwind CSS (palette editoriale custom)
- SVG vector rendering puro (no Canvas)
- Pronto per: Mapbox/Overpass, Vercel deploy, Supabase per gallery utenti

## Roadmap

- [ ] Sostituire i mock con chiamate Claude/GPT-4o reali
- [ ] Integrare Overpass per mappe geografiche autentiche
- [ ] Aggiungere export PNG/JPG/PDF via sharp/resvg
- [ ] Galleria pubblica opt-in (Supabase)
- [ ] Stampa fine-art on-demand (integrazione Gelato / Printful)
- [ ] Varianti: quadrato social, wallpaper 4K, A2/A3 print-ready

## Licenza

Tutti i diritti riservati. Concept e identità "Emozioni in Mappa".
