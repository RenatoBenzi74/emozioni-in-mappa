import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Emozioni in Mappa — Mappe del modo in cui hai vissuto un luogo",
  description:
    "Carica le tue fotografie. Riceverai una mappa artistica che traduce in cartografia il tuo modo di aver vissuto un luogo.",
  metadataBase: new URL("https://emozioniinmappa.app")
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="font-sans antialiased min-h-screen bg-paper-50 text-ink-900">
        <div className="mx-auto max-w-[1280px] px-8 py-10">
          <Header />
          <main className="mt-16">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

function Header() {
  return (
    <header className="flex items-baseline justify-between editorial-rule pb-6">
      <a href="/" className="font-display text-2xl tracking-editorial">
        Emozioni in Mappa
      </a>
      <nav className="flex gap-8 text-xs uppercase tracking-wide text-ink-500">
        <a href="/" className="hover:text-ink-900 transition">Manifesto</a>
        <a href="/upload" className="hover:text-ink-900 transition">Crea la tua mappa</a>
        <a href="/#galleria" className="hover:text-ink-900 transition">Galleria</a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-32 pt-10 editorial-rule flex items-center justify-between text-xs tracking-wide text-ink-500">
      <span className="font-mono">© Emozioni in Mappa — Studio di cartografia emozionale contemporanea</span>
      <span className="ticker">N · 41.9028  E · 12.4964</span>
    </footer>
  );
}
