import { useData } from "../../context/DataContext";
import { useEffect, useMemo, useState } from "react";
import type { Stats } from "../../services/stats";
import { Card, SourceTag } from "./ui";
import { COMPLAINT_EMAIL, COMPLAINT_PHONES, RESPONSIBLE_AUTHORITY } from "../../config";
import { DODDAGUBBI, FIRST_DEAD_FISH } from "../../services/doddagubbi";
import { formatDay } from "../../utils/dates";
import { formatMonth } from "../../utils/months";
import { getRainfall, type RainResult } from "../../services/rainfall";

const SUBJECT = `Request to check water quality at ${DODDAGUBBI.name}, Bengaluru (fish deaths reported from ${formatDay(FIRST_DEAD_FISH)})`;

const KSPCB_FULL_NAME = `${RESPONSIBLE_AUTHORITY.name}, ${RESPONSIBLE_AUTHORITY.division}`;

function compose(rain: RainResult | null, stats: Stats): string {
  const today = formatDay(new Date().toISOString().slice(0, 10));
  const day = (d: string) => rain?.days.find((x) => x.date === d);
  const a = day("2026-09-29");
  const b = day("2026-09-30");
  const lines = [
    `To: ${KSPCB_FULL_NAME}`,
    `Date: ${today}`,
    ``,
    `I am writing about ${DODDAGUBBI.name}, Bengaluru (${DODDAGUBBI.lat.toFixed(4)}°N, ${DODDAGUBBI.lng.toFixed(4)}°E).`,
    ``,
    `What has been reported (news coverage):`,
    `- Heavy rain on 30 September 2026.`,
    `- First dead fish seen on 1 October 2026, and thousands reported by 5 October 2026.`,
  ];
  if (a && b) {
    lines.push(
      `- Open-Meteo gridded rainfall for the lake's area: ${a.mm} mm on 29 September and ${b.mm} mm on 30 September 2026.`,
    );
  }
  lines.push(
    ``,
    `Readings:`,
    `- A July 2026 KSPCB reading quoted in news coverage: Class E, dissolved oxygen 3 mg/L, BOD 22 mg/L, coliform 5,400 MPN/100 ml. I have not seen the original report.`,
    `- These values are consistent with sewage and organic load. I am not suggesting a cause.`,
    ``,
    `Monitoring gap:`,
    `- ${DODDAGUBBI.name} does not appear among the ${stats.locations} monitoring points in KSPCB's monthly river reports (${formatMonth(stats.firstMonth)} to ${formatMonth(stats.lastMonth)}). The nearest point is ${stats.nearestToDoddagubbi.km.toFixed(1)} km away.`,
    ``,
    `Could you please:`,
    `1. Tell me whether this lake is monitored, and how often.`,
    `2. Share the latest readings for it.`,
    `3. Tell me what is being done about the fish deaths.`,
    ``,
    `Please acknowledge this message.`,
    ``,
    `[Your name]`,
    `[Your phone number]`,
  );
  return lines.join("\n");
}

export default function ComplaintCard() {
  const { stats } = useData();
  const [open, setOpen] = useState(false);
  const [rain, setRain] = useState<RainResult | null>(null);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  // Rainfall lines are optional: if the request fails, the message is composed without them.
  useEffect(() => {
    getRainfall().then(setRain).catch(() => setRain(null));
  }, []);
  const draft = useMemo(() => compose(rain, stats), [rain, stats]);
  useEffect(() => setText(draft), [draft]);

  const mailto = `mailto:${COMPLAINT_EMAIL}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(text)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${SUBJECT}\n\n${text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  };

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">Ask KSPCB</h2>
        <SourceTag>Goes to KSPCB's public email</SourceTag>
      </div>
      <p className="text-sm leading-relaxed text-slate-700">
        We write the message with the lake, the readings and the dates filled in. You read it, change anything you like, add
        your name, and send it from your own email app. Nothing is sent from this page.
      </p>
      {!open && (
        <button type="button" className="btn btn-primary mt-3" onClick={() => setOpen(true)}>
          Prepare a message to KSPCB
        </button>
      )}
      {open && (
        <div className="mt-4 space-y-3">
          <div className="text-xs text-muted">
            To: <b className="text-ink">{COMPLAINT_EMAIL}</b>
            <br />
            Subject: <b className="text-ink">{SUBJECT}</b>
          </div>
          <label className="block">
            <span className="sr-only">Message to KSPCB</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={20}
              className="w-full rounded-xl border border-line bg-white p-3 font-mono text-[13px] leading-relaxed text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <a href={mailto} className="btn btn-primary no-underline">Open in my email app</a>
            <button type="button" className="btn btn-secondary" onClick={copy}>
              {copied ? "Copied" : "Copy the message"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setText(draft)}>Reset text</button>
          </div>
          <p className="text-xs text-muted">
            Prefer to phone? KSPCB's control room lines: {COMPLAINT_PHONES.join(", ")}. Replace the bracketed lines with your own
            details before you send.
          </p>
        </div>
      )}
    </Card>
  );
}
