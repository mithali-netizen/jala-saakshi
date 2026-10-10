import { useEffect, useState, type ReactNode } from "react";
import "./figma.css";
import { APP_NAME, DEMO_CASE_PREFIX } from "../brand";
import { DEMO_WATCHED_LAKES, DEMO_WATCHLIST_RISK, WATCHED_LAKES_LABEL } from "../demo/watchlist";
import { useData } from "../context/DataContext";
import { AUTHORITIES, addReport, readPhoto, useReports, type CitizenReport } from "../services/reportStore";
import { complaintMailto } from "../services/complaint";
import { daysSince, formatDay, todayISO } from "../utils/dates";
import type { Lake } from "../services/lakes";

/** A report being filled in. Lives above the screens so Review can see what Report collected. */
export interface Draft {
  lake: Lake | null;
  issues: string[];
  note: string;
  photo: string | null;
  date: string;
}

export const emptyDraft = (): Draft => ({ lake: null, issues: [], note: "", photo: null, date: todayISO() });

/** Shown wherever a report is created or listed. There is no server behind any of it. */
function PrototypeNote({ children }: { children?: ReactNode }) {
  return <div className="proto-note"><Icon name="shield" /><p>{children ?? <><strong>Prototype.</strong> Reports are saved in this browser only. Nothing is sent to any authority until you send it yourself.</>}</p></div>;
}

type Screen =
  | "home"
  | "map"
  | "lake"
  | "report"
  | "review"
  | "tracking"
  | "authority"
  | "incident";

type IconName =
  | "home"
  | "map"
  | "plus"
  | "bell"
  | "file"
  | "arrow"
  | "chevron"
  | "shield"
  | "location"
  | "clock"
  | "camera"
  | "sparkle"
  | "check"
  | "water"
  | "rain"
  | "users"
  | "satellite"
  | "search"
  | "filter"
  | "menu"
  | "close";

const LAKE_IMAGE = "/images/lake.jpg";

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5M9 21v-7h6v7" /></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" /><path d="M9 3v15M15 6v15" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" /></>,
    file: <><path d="M6 3h8l4 4v14H6Z" /><path d="M14 3v5h5M9 13h6M9 17h5" /></>,
    arrow: <><path d="m9 18 6-6-6-6" /></>,
    chevron: <><path d="m15 18-6-6 6-6" /></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-5" /></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    camera: <><path d="M4 7h4l2-3h4l2 3h4v12H4Z" /><circle cx="12" cy="13" r="4" /></>,
    sparkle: <><path d="m12 3 1.4 4.1L17 9l-3.6 1.9L12 15l-1.4-4.1L7 9l3.6-1.9ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8Z" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    water: <><path d="M12 3S5 11 5 16a7 7 0 0 0 14 0c0-5-7-13-7-13Z" /><path d="M8.5 17.5c1.2 1.5 3.6 2 5.5.8" /></>,
    rain: <><path d="M7 16H5a4 4 0 1 1 1.4-7.7A6 6 0 0 1 18 10h.5a3.5 3.5 0 1 1 0 7H17" /><path d="m9 18-1 3m5-3-1 3m5-3-1 3" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20c0-4 2-7 6-7s6 3 6 7M16 5a3 3 0 0 1 0 6M17 13c3 0 4 3 4 6" /></>,
    satellite: <><path d="m5 5 14 14M9 3l4 4-4 4-4-4Zm6 10 4 4-4 4-4-4Z" /><path d="M3 14a7 7 0 0 0 7 7M3 10a3 3 0 0 1 3-3" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    filter: <><path d="M4 6h16M7 12h10M10 18h4" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  };
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Button({
  children,
  onClick,
  variant = "primary",
  className = "",
  icon,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  icon?: IconName;
}) {
  return <button type="button" onClick={onClick} className={`btn btn-${variant} ${className}`}>{icon && <Icon name={icon} />}{children}</button>;
}

function Card({ children, className = "", onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return <div className={`card ${onClick ? "card-clickable" : ""} ${className}`} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>{children}</div>;
}

function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "high" | "elevated" | "low" | "neutral" | "teal" | "blue" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function DemoTag() {
  return <span className="demo-tag">DEMO DATA</span>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="logo-wrap"><span className="logo-mark"><Icon name="water" className="size-5" /></span>{!compact && <span className="logo-text">{APP_NAME}</span>}</div>;
}

function MobileHeader({ title, onBack, action }: { title?: string; onBack?: () => void; action?: ReactNode }) {
  return <header className="mobile-header">
    {onBack ? <button className="icon-btn" onClick={onBack} aria-label="Go back"><Icon name="chevron" /></button> : <Logo />}
    {title && <div className="header-title">{title}</div>}
    <div className="header-action">{action}</div>
  </header>;
}

const navItems: { screen: Screen; label: string; icon: IconName }[] = [
  { screen: "home", label: "Home", icon: "home" },
  { screen: "map", label: "Map", icon: "map" },
  { screen: "report", label: "Report", icon: "plus" },
  { screen: "home", label: "Alerts", icon: "bell" },
  { screen: "tracking", label: "My Reports", icon: "file" },
];

function BottomNav({ active, navigate }: { active: Screen; navigate: (screen: Screen) => void }) {
  return <nav className="bottom-nav" aria-label="Primary navigation">{navItems.map((item, index) =>
    <button key={`${item.label}-${index}`} type="button" className={`nav-item ${active === item.screen ? "active" : ""} ${item.screen === "report" ? "report-nav" : ""}`} onClick={() => navigate(item.screen)}>
      <span className="nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span>
    </button>
  )}</nav>;
}

function MobileFrame({ children, active, navigate }: { children: ReactNode; active?: Screen; navigate: (screen: Screen) => void }) {
  return <main className="app-stage"><div className="phone-shell"><div className="phone-content">{children}</div>{active && <BottomNav active={active} navigate={navigate} />}</div></main>;
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-title"><div>{children}</div>{action}</div>;
}

function HomeScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  return <MobileFrame active="home" navigate={navigate}>
    <div className="home-top">
      <MobileHeader action={<button className="avatar" onClick={() => navigate("authority")} aria-label="Open authority dashboard">AK</button>} />
      <div className="greeting"><p>Good morning, Ananya</p><h1>How are our lakes today?</h1></div>
    </div>
    <div className="screen-body overlap">
      <Card className="health-card">
        <div><p className="eyebrow light">Bengaluru lake health</p><div className="big-stat">{DEMO_WATCHED_LAKES} <span>{WATCHED_LAKES_LABEL}</span></div></div>
        <div className="health-dots"><span className="dot high" />{DEMO_WATCHLIST_RISK.high} High <span className="dot elevated" />{DEMO_WATCHLIST_RISK.elevated} Elevated <span className="dot low" />{DEMO_WATCHLIST_RISK.low} Low</div>
        <p className="coverage-note">No lake appears in KSPCB's <strong>monthly river reports</strong>. This watchlist is our own.</p>
        <DemoTag />
      </Card>
      <SectionTitle action={<button className="text-button" onClick={() => navigate("map")}>View map <Icon name="arrow" className="size-4" /></button>}>Lake needing attention</SectionTitle>
      <Card className="featured-card" onClick={() => navigate("lake")}>
        <div className="lake-photo"><img src={LAKE_IMAGE} alt="Urban lake surrounded by trees and buildings" /><div className="photo-overlay"><Badge tone="high">High risk</Badge><DemoTag /></div></div>
        <div className="featured-content"><div><h2>Bellandur Lake</h2><p>Possible froth and sewage inflow reported</p></div><Icon name="arrow" /></div>
        <div className="source-line"><Icon name="clock" className="size-4" /> Updated 18 min ago · Citizen reports</div>
      </Card>
      <SectionTitle>Nearby alerts</SectionTitle>
      <div className="alert-list">
        <Card className="alert-row" onClick={() => navigate("lake")}><span className="alert-icon elevated"><Icon name="water" /></span><div><h3>Varthur Lake</h3><p>Elevated algae observation</p></div><span className="time">1h</span></Card>
        <Card className="alert-row"><span className="alert-icon low"><Icon name="rain" /></span><div><h3>Agara Lake</h3><p>Rainfall context updated</p></div><span className="time">3h</span></Card>
      </div>
      <Button className="full sticky-cta" icon="camera" onClick={() => navigate("report")}>Report pollution</Button>
    </div>
  </MobileFrame>;
}

function MapCanvas({ selected = true, compact = false }: { selected?: boolean; compact?: boolean }) {
  return <div className={`map-canvas ${compact ? "map-compact" : ""}`}>
    <div className="road road-a" /><div className="road road-b" /><div className="road road-c" />
    <div className="water-shape water-a" /><div className="water-shape water-b" /><div className="water-shape water-c" />
    <span className="map-label label-a">Mahadevapura</span><span className="map-label label-b">HSR Layout</span><span className="map-label label-c">Whitefield</span>
    <span className="risk-marker high marker-a"><Icon name="water" className="size-4" /></span>
    <span className="risk-marker elevated marker-b"><Icon name="water" className="size-4" /></span>
    <span className="risk-marker low marker-c"><Icon name="water" className="size-4" /></span>
    <span className="risk-marker elevated marker-d"><Icon name="water" className="size-4" /></span>
    {selected && <span className="marker-pulse" />}
  </div>;
}

function MapScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const [filter, setFilter] = useState("All");
  return <MobileFrame active="map" navigate={navigate}>
    <div className="map-screen">
      <div className="map-header"><Logo /><button className="icon-btn" aria-label="Search map"><Icon name="search" /></button></div>
      <div className="filter-pills">{["All", "High", "Elevated", "Low"].map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <div className="map-area">
        <MapCanvas />
        <button className="locate-btn" aria-label="Use current location"><Icon name="location" /></button>
      </div>
      <div className="map-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title"><div><div className="eyebrow">Selected lake</div><h1>Bellandur Lake</h1></div><Badge tone="high">High risk</Badge></div>
        <p className="muted">Possible pollution indicators from multiple demo sources.</p>
        <div className="source-line"><Icon name="clock" className="size-4" /> Updated 18 min ago · Demo data</div>
        <Button className="full" onClick={() => navigate("lake")}>View lake details <Icon name="arrow" /></Button>
      </div>
    </div>
  </MobileFrame>;
}

function SourceCard({ icon, title, text, meta, tone = "neutral" }: { icon: IconName; title: string; text: string; meta: string; tone?: "neutral" | "high" | "elevated" | "low" }) {
  return <Card className="source-card"><span className={`source-icon ${tone}`}><Icon name={icon} /></span><div><div className="source-card-top"><h3>{title}</h3><DemoTag /></div><p>{text}</p><span className="source-meta">{meta}</span></div></Card>;
}

function TrendChart() {
  return <Card className="chart-card"><div className="chart-head"><div><h3>Risk trend</h3><p>Composite demo indicator · 30 days</p></div><Badge tone="elevated">Rising</Badge></div>
    <div className="chart"><div className="grid-line g1" /><div className="grid-line g2" /><div className="grid-line g3" /><svg viewBox="0 0 320 100" preserveAspectRatio="none" aria-label="Risk trend rising over 30 days"><defs><linearGradient id="area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity=".25" /><stop offset="100%" stopColor="#0f766e" stopOpacity="0" /></linearGradient></defs><path d="M0 85 C35 78 48 81 70 67 S110 72 132 58 S170 63 190 46 S225 52 244 34 S282 36 320 15 V100 H0Z" fill="url(#area)" /><path d="M0 85 C35 78 48 81 70 67 S110 72 132 58 S170 63 190 46 S225 52 244 34 S282 36 320 15" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" /></svg></div>
    <div className="chart-labels"><span>30 days ago</span><span>Today</span></div>
  </Card>;
}

function LakeDetailsScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  return <MobileFrame navigate={navigate}>
    <MobileHeader title="Lake details" onBack={() => navigate("home")} action={<Badge tone="neutral">DEMO</Badge>} />
    <div className="details-hero"><img src={LAKE_IMAGE} alt="Bellandur Lake demo imagery" /></div>
    <div className="screen-body details-body">
      <div className="hero-copy"><Badge tone="high">High risk</Badge><h1>Bellandur Lake</h1><p><Icon name="location" className="size-4" /> Bengaluru East</p></div>
      <Card className="risk-summary"><div className="risk-gauge"><span>78</span><small>/100</small></div><div><div className="eyebrow">Current risk summary</div><h2>Needs attention</h2><p>Based on available demo signals, not an official assessment.</p></div></Card>
      <SectionTitle>Evidence overview</SectionTitle>
      <div className="source-list">
        <SourceCard icon="water" title="Water quality" text="Data unavailable" meta="Government readings · No recent data" />
        <SourceCard icon="satellite" title="Satellite observation" text="Possible surface discoloration detected" meta="Simulated output · Today, 08:30" tone="elevated" />
        <SourceCard icon="rain" title="Rainfall context" text="Light rainfall in the last 24 hours" meta="Demo weather feed · Today, 09:00" tone="low" />
        <SourceCard icon="users" title="Citizen reports" text="6 similar observations nearby" meta="User-submitted claims · Last 48 hours" tone="high" />
      </div>
      <SectionTitle>Historical context</SectionTitle><TrendChart />
      <SectionTitle>Recent incidents</SectionTitle>
      <Card className="incident-row"><span className="incident-date">18<span>JUN</span></span><div><h3>Froth near eastern inlet</h3><p>Citizen-submitted · Awaiting review</p></div><Badge tone="elevated">Open</Badge></Card>
      <Button className="full" icon="camera" onClick={() => navigate("report")}>Report an observation</Button>
      <p className="photo-credit">Lake photo by Harsh Khandelwal on Unsplash</p>
    </div>
  </MobileFrame>;
}

const issues = ["Dead fish", "Froth", "Sewage inflow", "Algae", "Foul smell", "Floating waste", "Illegal dumping", "Other"];

function LakePicker({ value, onPick }: { value: Lake | null; onPick: (l: Lake) => void }) {
  const { lakes } = useData();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = (lakes ?? [])
    .filter((l) => l.name.toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, 8);

  if (!lakes) return <div className="field compact">Loading lakes…</div>;

  return <div className="lake-picker">
    <div className="field">
      <Icon name="location" />
      <input
        type="text"
        value={open ? query : (value?.name ?? query)}
        placeholder={`Search ${lakes.length} Bengaluru lakes`}
        onFocus={() => { setOpen(true); setQuery(""); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        aria-label="Choose a lake"
      />
    </div>
    {open && <ul className="lake-options">
      {matches.length === 0 && <li className="empty">No lake matches “{query}”</li>}
      {matches.map((l) => <li key={l.id}>
        <button type="button" onClick={() => { onPick(l); setOpen(false); setQuery(""); }}>
          {l.name}<small>no reading in KSPCB&rsquo;s monthly river reports</small>
        </button>
      </li>)}
    </ul>}
  </div>;
}

function ReportScreen({ navigate, draft, setDraft }: { navigate: (screen: Screen) => void; draft: Draft; setDraft: (d: Draft) => void }) {
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggleIssue = (issue: string) => setDraft({
    ...draft,
    issues: draft.issues.includes(issue) ? draft.issues.filter((i) => i !== issue) : [...draft.issues, issue],
  });

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setPhotoError(null);
    try {
      setDraft({ ...draft, photo: await readPhoto(file) });
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : "Could not read that photo.");
    } finally {
      setBusy(false);
    }
  };

  const ready = !!draft.lake && draft.issues.length > 0;

  return <MobileFrame active="report" navigate={navigate}>
    <MobileHeader title="Report a problem" onBack={() => navigate("home")} />
    <div className="screen-body form-screen">
      <div className="intro-copy"><h1>What did you notice?</h1><p>Your report is saved in this browser and used to draft a complaint you send yourself.</p></div>

      <label className="photo-upload" htmlFor="report-photo">
        {draft.photo
          ? <img className="photo-preview" src={draft.photo} alt="The photo you attached" />
          : <><span><Icon name="camera" className="size-7" /></span><strong>{busy ? "Reading photo…" : "Add a photo"}</strong><small>Camera on a phone, file picker on a computer</small></>}
      </label>
      <input id="report-photo" className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={onPhoto} />
      {draft.photo && <button type="button" className="text-button" onClick={() => setDraft({ ...draft, photo: null })}>Remove photo</button>}
      {photoError && <p className="field-error">{photoError}</p>}

      <div className="field-group"><label>Lake</label><LakePicker value={draft.lake} onPick={(l) => setDraft({ ...draft, lake: l })} /></div>

      <div className="field-group">
        <label>What did you see? <span>Choose all that apply</span></label>
        <div className="issue-grid">{issues.map((issue) => <button type="button" key={issue} className={draft.issues.includes(issue) ? "selected" : ""} onClick={() => toggleIssue(issue)}>{issue}</button>)}</div>
      </div>

      <div className="field-group">
        <label htmlFor="report-date">Date observed</label>
        <input id="report-date" className="field compact" type="date" value={draft.date} max={todayISO()} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
      </div>

      <div className="field-group">
        <label htmlFor="description">Description <span>Optional</span></label>
        <textarea id="description" placeholder="Add a short note about what you saw" rows={3} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
      </div>

      <PrototypeNote />
      <Button className="full" onClick={() => ready && navigate("review")}>
        {ready ? <>Review report <Icon name="arrow" /></> : "Choose a lake and what you saw"}
      </Button>
    </div>
  </MobileFrame>;
}

function ReviewScreen({ navigate, draft, setDraft }: { navigate: (screen: Screen) => void; draft: Draft; setDraft: (d: Draft) => void }) {
  const [warning, setWarning] = useState<string | null>(null);

  const submit = () => {
    if (!draft.lake) return navigate("report");
    const { warning: w } = addReport({
      lakeId: draft.lake.id,
      lakeName: draft.lake.name,
      lat: draft.lake.lat,
      lng: draft.lake.lng,
      issues: draft.issues,
      note: draft.note,
      photo: draft.photo,
      date: draft.date,
    });
    setWarning(w);
    setDraft(emptyDraft());
    navigate("tracking");
  };

  return <MobileFrame navigate={navigate}>
    <MobileHeader title="Review report" onBack={() => navigate("report")} />
    <div className="screen-body review-screen">
      <div className="intro-copy"><h1>Check before you submit</h1><p>This is what will be saved and used to draft your complaint.</p></div>

      {draft.photo
        ? <div className="evidence-photo"><img src={draft.photo} alt="The photo you attached" /><span className="image-label">YOUR PHOTO</span></div>
        : <div className="evidence-photo empty"><p>No photo attached</p></div>}

      <Card className="review-summary">
        <dl>
          <div><dt>Lake</dt><dd>{draft.lake?.name ?? "Not chosen"}</dd></div>
          <div><dt>What you saw</dt><dd>{draft.issues.length ? draft.issues.join(", ") : "Not chosen"}</dd></div>
          <div><dt>Date observed</dt><dd>{formatDay(draft.date)}</dd></div>
          {draft.note.trim() && <div><dt>Note</dt><dd>{draft.note.trim()}</dd></div>}
          <div><dt>Will be addressed to</dt><dd>{AUTHORITIES.join(", ")}</dd></div>
        </dl>
      </Card>

      <div className="review-disclaimer"><Icon name="shield" /><div><strong>No automatic classification</strong><p>Reading the photo automatically is not connected in this prototype. What you selected is what gets recorded.</p></div></div>

      {warning && <p className="field-error">{warning}</p>}
      <PrototypeNote />
      <Button className="full" onClick={submit}>Save report</Button>
    </div>
  </MobileFrame>;
}

const timeline = [
  { title: "Submitted", detail: "Report and photo received", time: "Today, 10:44 AM", done: true },
  { title: "Acknowledged", detail: "Demo intake acknowledged", time: "Today, 11:02 AM", done: true },
  { title: "Inspection recorded", detail: "Awaiting field review", time: "Pending", done: false },
  { title: "Resolution verified", detail: "Requires independent verification", time: "Pending", done: false },
];

function StatusTimeline({ compact = false }: { compact?: boolean }) {
  return <div className={`timeline ${compact ? "compact" : ""}`}>{timeline.map((item, i) => <div className={`timeline-item ${item.done ? "done" : ""}`} key={item.title}><div className="timeline-track"><span>{item.done ? <Icon name="check" className="size-3" /> : i + 1}</span></div><div><h3>{item.title}</h3><p>{item.detail}</p><small>{item.time}</small></div></div>)}</div>;
}

function StatusPill({ status }: { status: CitizenReport["status"] }) {
  const tone = status === "Action taken" ? "low" : status === "Acknowledged" ? "teal" : status === "Sent" ? "blue" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

function ReportCard({ report }: { report: CitizenReport }) {
  const { locations, stats } = useData();
  const days = daysSince(report.date);
  return <Card className="report-summary">
    <div className="report-summary-top">
      <div><div className="eyebrow">{report.id}</div><h1>{report.issues.join(", ") || "Report"}</h1></div>
      <StatusPill status={report.status} />
    </div>
    <div className="report-meta">
      <span><Icon name="location" className="size-4" /> {report.lakeName}</span>
      <span><Icon name="clock" className="size-4" /> {formatDay(report.date)} · {days} day{days === 1 ? "" : "s"} ago</span>
    </div>
    {report.note.trim() && <p className="report-note">{report.note.trim()}</p>}
    {report.photo && <div className="evidence-strip"><img src={report.photo} alt={`Photo attached to ${report.id}`} /><div><strong>1 photo attached</strong><span>Stored in this browser</span></div></div>}
    <a className="btn btn-primary full" href={complaintMailto(report, locations, stats)}>
      <Icon name="file" /> Open complaint in your email app
    </a>
    <p className="muted small">Addressed to {AUTHORITIES.join(", ")}. You review and send it; nothing is sent for you.</p>
  </Card>;
}

function TrackingScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const reports = useReports();
  return <MobileFrame active="tracking" navigate={navigate}>
    <MobileHeader title="My reports" onBack={() => navigate("home")} />
    <div className="screen-body tracking-screen">
      {reports.length === 0
        ? <div className="empty-state">
            <span><Icon name="file" className="size-7" /></span>
            <h2>No reports yet</h2>
            <p>Reports you make are saved in this browser and listed here.</p>
            <Button className="full" icon="camera" onClick={() => navigate("report")}>Report a problem</Button>
          </div>
        : <>
            <div className="report-tabs"><button className="active">All <span>{reports.length}</span></button></div>
            {reports.map((r) => <ReportCard key={r.id} report={r} />)}
            <div className="ack-note"><Icon name="bell" /><p><strong>Acknowledged would not mean resolved.</strong> No status here is set by an authority — this prototype has no connection to one.</p></div>
            <Button className="full" icon="camera" onClick={() => navigate("report")}>Report another problem</Button>
          </>}
      <PrototypeNote />
    </div>
  </MobileFrame>;
}

function AuthorityShell({ children, active = "dashboard", navigate }: { children: ReactNode; active?: "dashboard" | "incidents"; navigate: (screen: Screen) => void }) {
  return <div className="authority-shell">
    <aside className="side-nav"><Logo /><div className="portal-label">Authority portal <DemoTag /></div>
      <nav><button className={active === "dashboard" ? "active" : ""} onClick={() => navigate("authority")}><Icon name="home" />Overview</button><button className={active === "incidents" ? "active" : ""} onClick={() => navigate("incident")}><Icon name="file" />Incidents <span>18</span></button><button><Icon name="map" />Lake network</button><button><Icon name="users" />Teams</button></nav>
      <div className="side-footer"><button onClick={() => navigate("home")}><Icon name="chevron" />Citizen app</button><button onClick={() => { window.location.hash = ""; }}><Icon name="map" />Water quality map</button><div className="authority-user"><span>RV</span><div><strong>R. Varma</strong><small>Demo reviewer</small></div></div></div>
    </aside>
    <div className="authority-main">{children}</div>
  </div>;
}

const incidents = [
  { id: `${DEMO_CASE_PREFIX}-1048`, title: "Surface froth", lake: "Bellandur Lake", level: "High", age: "18m", status: "Acknowledged" },
  { id: `${DEMO_CASE_PREFIX}-1047`, title: "Sewage inflow", lake: "Varthur Lake", level: "High", age: "42m", status: "New" },
  { id: `${DEMO_CASE_PREFIX}-1044`, title: "Algae observation", lake: "Kaikondrahalli", level: "Elevated", age: "2h", status: "Reviewing" },
  { id: `${DEMO_CASE_PREFIX}-1041`, title: "Floating waste", lake: "Agara Lake", level: "Low", age: "5h", status: "Assigned" },
];

function AuthorityDashboard({ navigate }: { navigate: (screen: Screen) => void }) {
  const live = useReports();
  return <AuthorityShell navigate={navigate}>
    <header className="desktop-header"><div><p>Wednesday, 18 June</p><h1>Incident overview</h1></div><div className="desktop-actions"><div className="search-field"><Icon name="search" /><span>Search incidents or lakes</span><kbd>⌘ K</kbd></div><button className="icon-btn"><Icon name="bell" /></button></div></header>
    <div className="authority-content">
      <div className="notice-bar"><Icon name="shield" /><span>This workspace uses simulated incidents and statuses for demonstration only.</span><DemoTag /></div>
      <div className="metrics">
        <Card><span className="metric-icon red"><Icon name="file" /></span><div><p>Open incidents</p><strong>{18 + live.length}</strong><small>{live.length} from this browser · 18 seeded</small></div></Card>
        <Card><span className="metric-icon amber"><Icon name="bell" /></span><div><p>High-risk cases</p><strong>6</strong><small>2 unreviewed</small></div></Card>
        <Card><span className="metric-icon blue"><Icon name="check" /></span><div><p>Acknowledged</p><strong>9</strong><small>50% of open</small></div></Card>
        <Card><span className="metric-icon green"><Icon name="shield" /></span><div><p>Verified resolutions</p><strong>12</strong><small>Last 30 days</small></div></Card>
      </div>
      <div className="dashboard-grid">
        <Card className="authority-map-card"><div className="panel-head"><div><h2>Lake risk map</h2><p>{DEMO_WATCHED_LAKES} {WATCHED_LAKES_LABEL} · Demo data · none in KSPCB's monthly river reports</p></div><Button variant="secondary" icon="filter">Filters</Button></div><MapCanvas compact /><div className="map-legend"><span><i className="dot high" />High {DEMO_WATCHLIST_RISK.high}</span><span><i className="dot elevated" />Elevated {DEMO_WATCHLIST_RISK.elevated}</span><span><i className="dot low" />Low {DEMO_WATCHLIST_RISK.low}</span><button>View full map <Icon name="arrow" className="size-4" /></button></div></Card>
        <Card className="priority-card"><div className="panel-head"><div><h2>Priority case</h2><p>Highest current demo signal</p></div><Badge tone="high">High risk</Badge></div><div className="priority-image"><img src={LAKE_IMAGE} alt="Bellandur Lake" /><span>USER-SUBMITTED</span></div><h3>Possible surface froth</h3><p className="priority-location"><Icon name="location" className="size-4" /> Bellandur Lake · Eastern inlet</p><div className="freshness"><span><Icon name="users" />6 citizen reports</span><span><Icon name="clock" />18m old</span></div><Button className="full" onClick={() => navigate("incident")}>Open case <Icon name="arrow" /></Button></Card>
      </div>
      <Card className="queue-card"><div className="panel-head"><div><h2>Incident queue</h2><p>{live.length > 0 ? `${live.length} citizen report${live.length === 1 ? "" : "s"} from this browser, then seeded cases` : "Seeded cases · no citizen reports in this browser yet"}</p></div><div className="panel-actions"><Button variant="secondary" icon="filter">All statuses</Button><Button variant="secondary">Newest first</Button></div></div>
        <div className="incident-table"><div className="table-row table-head"><span>Incident</span><span>Lake</span><span>Risk</span><span>Freshness</span><span>Status</span><span /></div>
          {live.map((r) => <div className="table-row" key={r.id}><span><strong>{r.issues.join(", ") || "Report"}</strong><small>{r.id} · Citizen report</small></span><span>{r.lakeName}</span><span><Badge tone="neutral">Not assessed</Badge></span><span>{daysSince(r.date)}d</span><span><StatusPill status={r.status} /></span><span>{r.photo ? <img className="queue-thumb" src={r.photo} alt="" /> : null}</span></div>)}
          {incidents.map((item) => <button className="table-row" key={item.id} onClick={() => navigate("incident")}><span><strong>{item.title}</strong><small>{item.id} · Demo</small></span><span>{item.lake}</span><span><Badge tone={item.level === "High" ? "high" : item.level === "Elevated" ? "elevated" : "low"}>{item.level}</Badge></span><span>{item.age}</span><span><Badge tone="blue">{item.status}</Badge></span><span><Icon name="arrow" /></span></button>)}</div>
      </Card>
    </div>
  </AuthorityShell>;
}

function IncidentScreen({ navigate }: { navigate: (screen: Screen) => void }) {
  const [status, setStatus] = useState("Acknowledged");
  const [note, setNote] = useState("");
  return <AuthorityShell navigate={navigate} active="incidents">
    <header className="case-header"><button className="back-link" onClick={() => navigate("authority")}><Icon name="chevron" />Incident queue</button><div className="case-title-row"><div><div className="case-tags"><Badge tone="high">High risk</Badge><span>{DEMO_CASE_PREFIX}-1048 · DEMO DATA</span></div><h1>Possible surface froth at Bellandur Lake</h1><p><Icon name="location" className="size-4" /> Eastern inlet, Bellandur Lake <span /> Submitted today at 10:44 AM</p></div><div className="case-actions"><Button variant="secondary" onClick={() => setStatus("Reviewed")}><Icon name="check" />Mark reviewed</Button><Button onClick={() => setStatus("Inspection recorded")}>Record inspection</Button></div></div></header>
    <div className="case-content">
      <div className="case-main">
        <Card><div className="panel-head"><div><h2>Citizen-submitted evidence</h2><p>User claim · Not independently verified</p></div><Badge tone="neutral">1 photo</Badge></div><div className="evidence-layout"><img src={LAKE_IMAGE} alt="Citizen-submitted demo evidence" /><div><div className="quote">“White froth collecting near the inlet and a strong smell.”</div><dl><div><dt>Issue selected</dt><dd>Surface froth</dd></div><div><dt>Submitted by</dt><dd>Anonymous citizen</dd></div><div><dt>Location accuracy</dt><dd>Approx. 40 metres</dd></div></dl></div></div></Card>
        <Card className="verification-card"><div className="panel-head"><div><h2>Evidence assessment</h2><p>Claims, suggestions, and verified facts are separated</p></div></div>
          <div className="assessment-grid"><div><span className="assessment-label user"><Icon name="users" />USER CLAIM</span><h3>Surface froth and foul smell</h3><p>Reported by a citizen. Not yet confirmed by a reviewer.</p></div><div><span className="assessment-label ai"><Icon name="sparkle" />AI SUGGESTION</span><h3>Likely surface froth · 84%</h3><p>Visual classification only; does not prove contamination.</p></div><div><span className="assessment-label verified"><Icon name="shield" />VERIFIED DATA</span><h3>No recent water reading</h3><p>Government water-quality data is unavailable.</p></div></div>
        </Card>
        <Card><div className="panel-head"><div><h2>Related reports</h2><p>3 reports within 500 metres · Last 24 hours</p></div><Button variant="ghost">View all</Button></div><div className="related-list"><div><span className="mini-evidence"><img src={LAKE_IMAGE} alt="" /></span><strong>Froth near shoreline</strong><small>240m away · 32m ago</small><Badge tone="elevated">78% similar</Badge></div><div><span className="mini-evidence"><img src={LAKE_IMAGE} alt="" /></span><strong>Strong odour</strong><small>410m away · 3h ago</small><Badge tone="neutral">Related</Badge></div></div></Card>
        <Card><div className="panel-head"><div><h2>Incident history</h2><p>Demo status changes and notes</p></div></div><StatusTimeline compact /></Card>
      </div>
      <aside className="case-sidebar">
        <Card className="status-card"><div className="eyebrow">Current status</div><div className="current-status"><span className="status-dot" /><strong>{status}</strong></div><p>Acknowledgement confirms queue entry only; it does not indicate resolution.</p><div className="divider" /><label htmlFor="status">Update status</label><select id="status" value={status} onChange={(e) => setStatus(e.target.value)}><option>Acknowledged</option><option>Reviewed</option><option>Inspection recorded</option><option>Resolution verified</option></select><Button className="full" onClick={() => setStatus(status)}>Save demo update</Button></Card>
        <Card><h3>Add internal note</h3><p className="muted">Visible to demo response teams only.</p><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add observations or next steps..." rows={4} /><Button variant="secondary" className="full" onClick={() => setNote("")}>Add note</Button></Card>
        <Card className="source-freshness"><h3>Source freshness</h3><div><span><Icon name="users" />Citizen reports</span><strong>18m</strong></div><div><span><Icon name="satellite" />Satellite</span><strong>2h</strong></div><div><span><Icon name="water" />Water quality</span><strong className="unavailable">Unavailable</strong></div><div><span><Icon name="rain" />Rainfall</span><strong>1h</strong></div></Card>
        <Button variant="danger" className="full" onClick={() => setStatus("Resolution verified")}><Icon name="shield" />Record verified resolution</Button>
      </aside>
    </div>
  </AuthorityShell>;
}

const SCREEN_PATHS: Record<Screen, string> = {
  home: "#/app",
  map: "#/app/map",
  lake: "#/app/lake",
  report: "#/app/report",
  review: "#/app/review",
  tracking: "#/app/reports",
  authority: "#/authority",
  incident: "#/authority/incident",
};

function screenFromHash(hash: string): Screen {
  const path = hash.split("?")[0];
  const found = (Object.keys(SCREEN_PATHS) as Screen[]).find((key) => SCREEN_PATHS[key] === path);
  return found ?? (path.startsWith("#/authority") ? "authority" : "home");
}

/** ?lake=<osm id> from a lake panel on the dashboard. */
function lakeIdFromHash(hash: string): string | null {
  const q = hash.split("?")[1];
  return q ? new URLSearchParams(q).get("lake") : null;
}

export default function FigmaApp() {
  const [screen, setScreen] = useState<Screen>(() => screenFromHash(window.location.hash));
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const { lakes } = useData();

  useEffect(() => {
    const onHash = () => setScreen(screenFromHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Arriving from a lake panel on the dashboard: start the draft on that lake.
  const wantedLake = lakeIdFromHash(window.location.hash);
  useEffect(() => {
    if (!wantedLake || !lakes) return;
    const found = lakes.find((l) => l.id === wantedLake);
    if (found) setDraft((d) => (d.lake?.id === found.id ? d : { ...d, lake: found }));
  }, [wantedLake, lakes]);
  const navigate = (next: Screen) => {
    window.location.hash = SCREEN_PATHS[next];
    window.scrollTo({ top: 0 });
  };
  const screens: Record<Screen, ReactNode> = {
    home: <HomeScreen navigate={navigate} />,
    map: <MapScreen navigate={navigate} />,
    lake: <LakeDetailsScreen navigate={navigate} />,
    report: <ReportScreen navigate={navigate} draft={draft} setDraft={setDraft} />,
    review: <ReviewScreen navigate={navigate} draft={draft} setDraft={setDraft} />,
    tracking: <TrackingScreen navigate={navigate} />,
    authority: <AuthorityDashboard navigate={navigate} />,
    incident: <IncidentScreen navigate={navigate} />,
  };
  return screens[screen];
}
