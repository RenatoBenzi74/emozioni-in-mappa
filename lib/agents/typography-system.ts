import type { PlaceIdentity, VisualMood, Typography } from "../types";

/**
 * AGENT 05 — TYPOGRAPHY SYSTEM
 *
 * Production prompt (Claude, completion mode):
 * ---------------------------------------------------------------
 * Sei un tipografo editoriale. Componi i blocchi testuali di un
 * poster artistico minimalista, in italiano, basandoti su un
 * PlaceIdentity e un VisualMood.
 *
 * Regole:
 *   • Il titolo è il nome della città. Niente capslock automatico.
 *     Se la città ha un nome composto, mantienilo intero.
 *   • Il sottotitolo è UNA FRASE SOBRIA che evoca l'atmosfera del
 *     mood senza descriverla esplicitamente. Massimo 6 parole.
 *     Esempi tonali:
 *       — "una luce bassa sul fiume"
 *       — "ottobre, un silenzio minerale"
 *       — "vento di tramontana, ore tarde"
 *     Mai aggettivi banali (bellissimo, magnifico).
 *   • Le coordinate vanno formattate con simbolo gradi e N/S/E/W.
 *   • Smallcaps: una riga di edizione + data (mese + anno, senza
 *     giorno preciso) — il tono è quello di una stampa numerata.
 *
 * Restituisci JSON conforme a Typography. Niente testo libero.
 * ---------------------------------------------------------------
 */
export async function composeTypography(place: PlaceIdentity, mood: VisualMood): Promise<Typography> {
  const subtitleMap: Record<string, string> = {
    rarefatto: "una luce bassa, un respiro",
    caldo: "ore tarde, pietra che restituisce",
    freddo: "un silenzio minerale",
    silenzioso: "passi misurati, niente vento",
    vibrante: "luce alta, ombre nette",
    nostalgico: "un pomeriggio che non finisce",
    nordico: "cielo a bassa saturazione",
    mediterraneo: "salsedine al limite della voce",
    intimo: "stanze piccole, finestre socchiuse",
    organico: "muri che la pioggia ha tenuto",
    geometrico: "facciate in ordine, mai uguali",
    delicato: "una mattina lenta",
    urbano: "ritmo basso, traffico altrove",
    industriale: "ruggine, vetro, una vetrina",
    arioso: "un'aria che ha viaggiato",
    minerale: "roccia, sale, niente di più",
    luce: "una luce che non commenta"
  };

  const subtitle = subtitleMap[mood.atmosphere[0]] ?? "un giorno che resta";
  const coordinates = formatCoord(place.coordinates.lat, place.coordinates.lng);
  const today = new Date();
  const months = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const smallcaps = `Edizione I — ${months[today.getMonth()]} ${today.getFullYear()}`;

  return {
    title: place.city,
    subtitle,
    coordinates,
    smallcaps,
    family: { display: "Cormorant Garamond", mono: "JetBrains Mono" },
    scale: { titlePt: 96, subtitlePt: 18, coordPt: 9 }
  };
}

function formatCoord(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(4)}° ${ns} / ${Math.abs(lng).toFixed(4)}° ${ew}`;
}
