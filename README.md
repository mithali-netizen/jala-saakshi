# India River Water Quality Explorer

A citizen-science web application that displays India's river water quality monitoring data on an interactive map, in plain language for ordinary people — not scientists.

Data is sourced from CPCB and State Pollution Control Board monthly monitoring reports. Readings are point-in-time samples.

> **Hackathon project**: AWS Environmental Hack. Data pipeline by a teammate; front-end by this repo.

---

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9

### Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The app fetches `/data/readings.json` at **runtime** via `fetch()`. You do not need to rebuild to update the data.

---

## Build for Production

```bash
npm run build
```

Output is in the `dist/` directory. Serve it from any static host.

```bash
# Preview the production build locally
npm run preview
```

---

## How to Swap in the Real Data File

The app uses a runtime `fetch()` so the data file can be replaced without any code changes:

### Option 1 — Replace the static file directly

Simply overwrite `public/data/readings.json` with your teammate's exported file:

```bash
cp /path/to/real_readings.json public/data/readings.json
```

Then redeploy (push to Git / re-run `npm run build`). The file is served as a static asset by CloudFront.

### Option 2 — Point to a different URL (without touching the file)

Set the `VITE_DATA_URL` environment variable in your Amplify Console environment variables (or a local `.env.local` file):

```env
VITE_DATA_URL=https://your-s3-bucket.s3.amazonaws.com/readings.json
```

Similarly for the river GeoJSON polyline:

```env
VITE_GEOJSON_URL=https://your-s3-bucket.s3.amazonaws.com/river.geojson
```

No code changes needed.

> **Sample vs. real data:** The repo ships with `public/data/readings.sample.json` (illustrative fake data, clearly named). The active runtime file is `public/data/readings.json`, which is a copy of the sample. Replace it with real CPCB/NWMP data at any time.

---

## Data Contract

The app loads `/data/readings.json` — an array of flat rows:

| Field | Type | Notes |
|---|---|---|
| `station_name` | string | Display name |
| `station_code` | string | Unique ID |
| `river` | string | River name |
| `month` | string | `"YYYY-MM"` format |
| `class` | `"A"` \| `"B"` \| `"C"` \| `"D"` \| `"E"` \| `null` | CPCB Designated Best-Use class |
| `do` | number \| null | Dissolved Oxygen, mg/L |
| `bod` | number \| null | BOD, mg/L |
| `total_coliform` | number \| null | MPN/100ml |
| `fecal_coliform` | number \| null | MPN/100ml |
| `lat` | number | Latitude (WGS84) |
| `lng` | number | Longitude (WGS84) |
| `river_order` | integer (optional) | 1 = most upstream |
| `status` | `"ok"` \| `"no_access"` \| `"missing"` (optional) | Sampling status |
| `note` | string (optional) | Free-text sampling note |

`null` = value missing or not measured. `status: "no_access"` = station was not sampled that month.

---

## Project Structure

```
evslake/
├── public/
│   └── data/
│       ├── readings.json           # Active runtime data (swap this!)
│       ├── readings.sample.json    # Illustrative sample (do not delete)
│       └── river.geojson           # River polyline (replace with WRIS geometry)
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   └── RiverMap.tsx        # Leaflet map, markers, polyline, legend
│   │   ├── StationPanel/
│   │   │   ├── StationPanel.tsx    # Station detail panel (click-through)
│   │   │   └── TrendChart.tsx      # 8-month Recharts trend chart
│   │   └── Timeline/
│   │       └── MonthSelector.tsx   # Month slider & pill buttons
│   ├── hooks/
│   │   └── useReadings.ts          # All data fetching lives here
│   ├── types/
│   │   └── waterData.ts            # TypeScript data contract types
│   ├── utils/
│   │   └── waterQuality.ts         # Class → color/letter visual config
│   ├── App.tsx                     # Root layout
│   ├── config.ts                   # Data URLs, complaint URL, authority names
│   ├── plainLanguage.ts            # ALL citizen-facing copy & thresholds
│   └── index.css                   # Global styles + Tailwind + Leaflet CSS
├── amplify.yml                     # AWS Amplify build config
├── AWS_SERVICES.md                 # AWS services log
└── vite.config.ts
```

---

## Deploy to AWS Amplify Hosting

1. Push this repository to GitHub (or CodeCommit).
2. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
3. Click **New app → Host web app** and connect your Git repository.
4. Amplify automatically detects `amplify.yml` — no manual build settings needed.
5. Click **Save and deploy**.

Amplify will run `npm ci`, then `npm run build`, and publish the `dist/` directory to a globally distributed CloudFront endpoint.

### SPA Routing

Amplify uses the custom rewrite rule in `amplify.yml` to redirect all unmatched paths back to `index.html`, making client-side navigation work correctly on direct URL access or page refresh.

### Environment Variables (Optional)

Set in **Amplify Console → App settings → Environment variables**:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_DATA_URL` | `/data/readings.json` | Override data endpoint (e.g., S3 URL) |
| `VITE_GEOJSON_URL` | `/data/river.geojson` | Override GeoJSON river polyline URL |

---

## Editing Plain-Language Copy & Thresholds

All citizen-facing text and water quality threshold interpretations are in one file:

**[`src/plainLanguage.ts`](src/plainLanguage.ts)**

Exported functions you can edit:
- `classMeaning(class)` — what the water class means (drinking, bathing, fish, irrigation)
- `bodMeaning(bod, upstreamBod)` — waste level in plain words with upstream comparison
- `doMeaning(do)` — oxygen level and fish health
- `coliformMeaning(coliform)` — bacteria/germ risk
- `headline(reading, upstreamReading)` — one-sentence summary shown at the top
- `OFFICIAL_EXPLANATIONS` — the "What do these terms mean?" expander content

All thresholds are annotated with `// TODO: verify thresholds against CPCB designated-best-use table`.

---

## Editing the Complaint/Action Layer

Update **[`src/config.ts`](src/config.ts)** to configure:
- `COMPLAINT_URL` — the official portal URL opened when a citizen clicks "Report this pollution"
- `RESPONSIBLE_AUTHORITY` — the authority name, division, and contact info shown in the panel

---

## Replacing the River GeoJSON

Replace `public/data/river.geojson` with the India-WRIS geometry (or any valid GeoJSON `FeatureCollection` containing a `LineString` or `MultiLineString`). The map will automatically render it as a blue polyline. No code changes required.

---

## No API Keys Required

- Map tiles: [OpenStreetMap](https://www.openstreetmap.org/) — free, no key
- No backend, no database, no authentication
- No secrets in this repository
