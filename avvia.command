#!/bin/bash
# Avvio dev server di Emozioni in Mappa
# Doppio-click su questo file per partire.

set -e
cd "$(dirname "$0")"

echo ""
echo "  ── EMOZIONI IN MAPPA ──"
echo ""

# Verifica Node
if ! command -v node >/dev/null 2>&1; then
  echo "  Node.js non è installato sul tuo Mac."
  echo "  Scaricalo da: https://nodejs.org   (consigliata versione LTS)"
  echo ""
  echo "  Una volta installato, rilancia questo file."
  echo ""
  read -p "  Premi INVIO per chiudere..." _
  exit 1
fi

echo "  Node $(node --version) trovato."

# Installa dipendenze solo se mancano
if [ ! -d "node_modules" ]; then
  echo ""
  echo "  Prima esecuzione: installo le dipendenze (può richiedere 1-2 minuti)…"
  echo ""
  npm install --no-audit --no-fund
fi

echo ""
echo "  Avvio il server… apri il browser su http://localhost:3000"
echo "  Per fermare il server, premi CTRL+C in questa finestra."
echo ""

# Apre il browser dopo 4 secondi (in background)
(sleep 4 && open http://localhost:3000) &

npm run dev
