import { useEffect, useState } from "react";
import "./jala.css";
import Home from "./pages/Home";
import Tracker from "./pages/Tracker";
import Lake from "./pages/Lake";
import Explorer from "./pages/Explorer";

type Route = "home" | "lake" | "tracker" | "explorer";

const TABS: { id: Route; hash: string; label: string }[] = [
  { id: "home", hash: "#/", label: "The gap" },
  { id: "lake", hash: "#/lake", label: "Doddagubbi" },
  { id: "tracker", hash: "#/tracker", label: "Tracker" },
  { id: "explorer", hash: "#/explorer", label: "KSPCB explorer" },
];

function routeFromHash(): Route {
  const h = window.location.hash;
  if (h.startsWith("#/lake")) return "lake";
  if (h.startsWith("#/tracker")) return "tracker";
  if (h.startsWith("#/explorer")) return "explorer";
  return "home";
}

export default function JalaApp() {
  const [route, setRoute] = useState<Route>(routeFromHash);
  useEffect(() => {
    const on = () => {
      setRoute(routeFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-[1000] border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 sm:px-6">
          <a href="#/" className="flex items-center gap-2 no-underline">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm font-bold text-white">J</span>
            <span className="text-base font-bold tracking-tight text-ink">Jala Saakshi</span>
          </a>
          <nav aria-label="Sections" className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <a
                key={t.id}
                href={t.hash}
                aria-current={route === t.id ? "page" : undefined}
                className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold no-underline transition-colors ${
                  route === t.id ? "border-brand text-brand" : "border-transparent text-slate-600 hover:text-ink"
                } ${t.id === "explorer" ? "opacity-80" : ""}`}
              >
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {route === "home" && <Home />}
        {route === "tracker" && <Tracker />}
        {route === "lake" && <Lake />}
        {route === "explorer" && <Explorer />}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted sm:px-6">
        Source: KSPCB monthly water quality reports. Readings are point-in-time samples. Items marked Demo or News
        coverage are not part of that dataset.
      </footer>
    </div>
  );
}
