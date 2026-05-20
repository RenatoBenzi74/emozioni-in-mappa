#!/bin/bash
# Pubblica Emozioni in Mappa su GitHub e apre Vercel per il deploy.
# Doppio-click su questo file.

set -e
cd "$(dirname "$0")"

echo ""
echo "  ── EMOZIONI IN MAPPA · PUBBLICAZIONE ──"
echo ""

# ─── Step 1: verifica git ────────────────────────────────────────────────
if ! command -v git >/dev/null 2>&1; then
  echo "  ⚠  Git non è installato. Apri Terminale, digita 'git' e segui"
  echo "     la richiesta di installazione degli Xcode Command Line Tools."
  echo ""
  read -p "  Premi INVIO per chiudere..." _
  exit 1
fi
echo "  Git $(git --version | awk '{print $3}') trovato."

# ─── Step 2: verifica/installa GitHub CLI ───────────────────────────────
if ! command -v gh >/dev/null 2>&1; then
  echo "  GitHub CLI non installato. Provo a installarlo..."
  if command -v brew >/dev/null 2>&1; then
    brew install gh
  else
    echo ""
    echo "  Homebrew non è installato. Scarico GitHub CLI standalone..."
    TMPDIR=$(mktemp -d)
    cd "$TMPDIR"
    ARCH=$(uname -m)
    if [ "$ARCH" = "arm64" ]; then GHARCH="macOS_arm64"; else GHARCH="macOS_amd64"; fi
    # Get latest release URL
    URL=$(curl -fsSL https://api.github.com/repos/cli/cli/releases/latest \
      | grep "browser_download_url.*${GHARCH}.zip" \
      | head -1 | cut -d'"' -f4)
    if [ -z "$URL" ]; then
      echo "  ⚠  Non riesco a scaricare gh. Installalo manualmente da: https://cli.github.com"
      exit 1
    fi
    curl -fsSL "$URL" -o gh.zip
    unzip -q gh.zip
    mkdir -p "$HOME/.local/bin"
    cp gh_*/bin/gh "$HOME/.local/bin/gh"
    chmod +x "$HOME/.local/bin/gh"
    export PATH="$HOME/.local/bin:$PATH"
    cd "$(dirname "$0")"
  fi
fi
echo "  GitHub CLI $(gh --version | head -1 | awk '{print $3}') trovato."

# ─── Step 3: inizializza repo se serve ─────────────────────────────────
if [ ! -d .git ]; then
  echo ""
  echo "  Inizializzo il repository git..."
  git init -b main >/dev/null
  cat > .gitignore <<'EOF'
node_modules/
.next/
out/
.env*
*.tsbuildinfo
.DS_Store
.vercel/
EOF
  git add .
  git -c user.email="studio@emozioniinmappa.local" \
      -c user.name="Studio Emozioni in Mappa" \
      commit -m "Initial commit: MVP Emozioni in Mappa" >/dev/null
  echo "  Commit iniziale creato."
else
  echo "  Repository git già presente."
  # Commit any uncommitted changes
  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add .
    git -c user.email="studio@emozioniinmappa.local" \
        -c user.name="Studio Emozioni in Mappa" \
        commit -m "Update" >/dev/null
    echo "  Commit di aggiornamento creato."
  fi
fi

# ─── Step 4: autenticazione GitHub ──────────────────────────────────────
if ! gh auth status >/dev/null 2>&1; then
  echo ""
  echo "  Ora apro il browser per l'autenticazione su GitHub."
  echo "  Quando ti viene chiesto un codice, lo trovi in questa finestra."
  echo ""
  read -p "  Premi INVIO per iniziare l'autenticazione..." _
  gh auth login --web --git-protocol https --hostname github.com
fi
GH_USER=$(gh api user --jq .login)
echo "  Autenticato come: $GH_USER"

# ─── Step 5: crea repo e push ──────────────────────────────────────────
echo ""
if gh repo view "$GH_USER/emozioni-in-mappa" >/dev/null 2>&1; then
  echo "  Repository esistente: $GH_USER/emozioni-in-mappa"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/$GH_USER/emozioni-in-mappa.git"
  fi
  echo "  Push degli aggiornamenti..."
  git push -u origin main
else
  echo "  Creo repository pubblico: $GH_USER/emozioni-in-mappa"
  gh repo create emozioni-in-mappa --public --source=. --remote=origin --push --description "Mappe artistiche emozionali generate da fotografie reali."
fi

# ─── Step 6: apri Vercel ────────────────────────────────────────────────
VERCEL_URL="https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2F${GH_USER}%2Femozioni-in-mappa&hasTrialAvailable=1&teamCreationOrigin=import-wizard&project-name=emozioni-in-mappa&framework=nextjs"
echo ""
echo "  ✓ Codice su GitHub: https://github.com/$GH_USER/emozioni-in-mappa"
echo ""
echo "  Apro Vercel per importare il progetto…"
echo "  Su Vercel: clicca 'Import' → 'Deploy'. In ~60 secondi sei online."
echo ""
open "$VERCEL_URL"

echo ""
read -p "  Premi INVIO per chiudere questa finestra..." _
