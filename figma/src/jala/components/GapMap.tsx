import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DODDAGUBBI } from "../services/readings";
import { facts, locations } from "../services/store";
import { formatMonth } from "../services/readings";

const KARNATAKA = L.latLngBounds(L.latLng(11.5, 74.0), L.latLng(18.5, 78.6));
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export default function GapMap({ onReady }: { onReady?: (api: { karnataka: () => void; bengaluru: () => void }) => void }) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { zoomSnap: 0.5, minZoom: 5, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Every KSPCB monitoring point in the dataset
    for (const l of locations) {
      const last = l.months[l.months.length - 1];
      L.circleMarker([l.lat, l.lng], {
        radius: 5,
        color: "#ffffff",
        weight: 1.5,
        fillColor: "#0f766e",
        fillOpacity: 0.95,
      })
        .bindTooltip(
          `<strong>${esc(l.name)}</strong><br/>${esc(l.river)} · last reading ${esc(formatMonth(last))}`,
          { direction: "top", offset: [0, -4] },
        )
        .addTo(map);
    }

    // Doddagubbi: outline, pin, and the distance to the nearest monitoring point
    const nearest = locations
      .map((l) => ({ l, d: Math.hypot(l.lat - DODDAGUBBI.lat, l.lng - DODDAGUBBI.lng) }))
      .sort((a, b) => a.d - b.d)[0].l;
    L.polyline(
      [
        [DODDAGUBBI.lat, DODDAGUBBI.lng],
        [nearest.lat, nearest.lng],
      ],
      { color: "#b91c1c", weight: 2, dashArray: "6 6", opacity: 0.85 },
    )
      .bindTooltip(`${facts.nearest.km.toFixed(1)} km to the nearest monitoring point`, { sticky: true })
      .addTo(map);
    L.polygon(DODDAGUBBI.outline, { color: "#b91c1c", weight: 2, fillColor: "#ef4444", fillOpacity: 0.35 }).addTo(map);
    L.marker([DODDAGUBBI.lat, DODDAGUBBI.lng], {
      icon: L.divIcon({
        className: "j-pin-wrap",
        html: `<div class="j-pin-dodda"><span></span>Doddagubbi Lake<small>not in KSPCB's monthly reports</small></div>`,
        iconSize: [0, 0],
      }),
      zIndexOffset: 1000,
    }).addTo(map);

    const karnataka = () => map.fitBounds(KARNATAKA, { padding: [8, 8] });
    const bengaluru = () =>
      map.fitBounds(
        L.latLngBounds([
          [DODDAGUBBI.lat, DODDAGUBBI.lng],
          ...locations
            .map((l) => ({ l, d: Math.hypot(l.lat - DODDAGUBBI.lat, l.lng - DODDAGUBBI.lng) }))
            .sort((a, b) => a.d - b.d)
            .slice(0, 4)
            .map((x) => [x.l.lat, x.l.lng] as [number, number]),
        ]),
        { padding: [48, 48], maxZoom: 11 },
      );
    karnataka();
    onReady?.({ karnataka, bengaluru });

    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(el.current);
    return () => {
      ro.disconnect();
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={el} className="h-[420px] w-full overflow-hidden rounded-xl bg-slate-100 sm:h-[480px]" role="img" aria-label="Map of KSPCB monitoring points in Karnataka and Doddagubbi Lake" />;
}
