# Jala Saakshi · ಜಲ ಸಾಕ್ಷಿ
### *The Water’s Witness — Citizen Science, Satellite Surveillance & Environmental Accountability for Bengaluru’s Lakes and Rivers*

[![Built on AWS](https://img.shields.io/badge/AWS-Serverless%20%7C%20Bedrock%20Nova%20Lite-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com)
[![Amplify Hosting](https://img.shields.io/badge/Deploy-AWS%20Amplify%20%2B%20CloudFront-ED592F?logo=aws-amplify&logoColor=white)](https://aws.amazon.com/amplify/)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20Leaflet-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Python 3.12](https://img.shields.io/badge/Backend-Python%203.12%20Lambda%20%2B%20SAM-3776AB?logo=python&logoColor=white)](https://python.org)
[![Kannada & English](https://img.shields.io/badge/Language-ಕನ್ನಡ%20%7C%20English-007ACC)](#)

> **AWS Environmental Hackathon Submission**  
> **Team:** Sreeya Chand, Mithali Netizen, Prapti  
> **Live Demo:** [Hosted on AWS Amplify & CloudFront](#)  
> *"How do people see what's happening to the water around them, and hold someone to it?"*

---

## 📑 Table of Contents
1. [The Story: Why We Built Jala Saakshi](#-the-story-why-we-built-jala-saakshi)
2. [The Problem Statement & Environmental Crisis](#-the-problem-statement--environmental-crisis)
3. [Who It Is Built For: Two Distinct User Groups](#-who-it-is-built-for-two-distinct-user-groups)
4. [Key Features & Visual Tour (Screenshots)](#-key-features--visual-tour)
   - [Citizen Experience: Mobile App & Kannada Voice](#1-citizen-experience-mobile-app--kannada-voice)
   - [Authority & Civic Bodies Experience: Web Portal & Dashboard](#2-authority--civic-bodies-experience-web-portal--dashboard)
   - [Discovering Lakes Near You](#3-discovering-lakes-near-you)
5. [The Data Provenance](#-the-data-provenance)
6. [Architecture & System Design](#-architecture--system-design)
7. [AWS Services Implementation (Judging Criteria)](#-aws-services-implementation-judging-criteria)
8. [Quick Start & Local Development](#-quick-start--local-development)
9. [Project Team & Attributions](#-project-team--attributions)

---

## 🌊 The Story: Why We Built Jala Saakshi

We are three university students in Bengaluru — Sreeya, Mithali, and Prapti.

It began with a simple question we asked ourselves:
> *"Do you know what's in the lake nearest to your house?"*

Most people in Bengaluru don't. We didn't either.

When we opened the Karnataka State Pollution Control Board (KSPCB) monthly monitoring archives for our own neighbourhoods, we discovered something shocking:
- In a typical 3-kilometre radius containing 7 water bodies, **not a single one appeared in the Board’s monthly reports**.
- Across Bengaluru, of the 131 lakes the Board *did* test in July 2026: **zero fell into Class A (drinking), Class B (outdoor bathing), or Class C (drinking after treatment)**.
- **70 out of 131 lakes (over 53%) came back Class E.** In the Board's own official glossary, *Class E* means:  
  *“Irrigation, industrial cooling, and controlled waste disposal.”*  
  That is the official designation for the water bodies right next to schools, apartments, parks, and playgrounds.
- A further **206 of the 342 mapped water bodies** in Bengaluru had **no test reading recorded at all**.

<div align="center">
  <img src="docs/screenshots/web-landing.png" width="800" alt="Jala Saakshi Landing Page — 131 Lakes Tested, 70 Came Back Class E" />
  <p><em>Jala Saakshi Landing Page: Highlighting the July 2026 KSPCB lake report data alongside the Doddagubbi fish kill crisis.</em></p>
</div>

### The Breaking Point: Doddagubbi Lake
On **October 1, 2026**, thousands of dead fish floated to the surface of **Doddagubbi Lake** in northeastern Bengaluru, suffocated by untreated sewage and leachate following rains. 

This was not an anomaly:
- The **National Green Tribunal (NGT)** documented **61 separate fish kill incidents** in Bengaluru lakes between 2017 and 2023.
- In **100% of cases**, water quality investigations concluded that **untreated sewage ingress was the primary cause**.
- Four of the repeat-offender lakes (*Bhattarahalli, Munnekolala, Chelekere, Iblur*) **already have their own sewage treatment plants (STPs)** that were either bypassed, failing, or overwhelmed.
- The NGT issued formal notices to **five separate agencies** (BBMP, KSPCB, CPCB, Fisheries Department, and the District Commissioner) — yet citizens remained locked out of the loop, unable to report what they saw or track whether anyone ever answered.

**Jala Saakshi (ಜಲ ಸಾಕ್ಷಿ — "The Water's Witness")** was born to bridge this divide.

---

## 🚨 The Problem Statement & Environmental Crisis

### The Core Problem Statement
> **How can ordinary citizens witness and document what is happening to their local water bodies, translate technical chemical data into actionable evidence, and hold responsible civic authorities accountable?**

### The Ecological Impact
1. **Severe Dissolved Oxygen Depletion:** Untreated domestic sewage contains high organic loads. As aerobic bacteria decompose the organic matter, they consume all available dissolved oxygen (DO), driving levels below 2.0 mg/L (normal aquatic life requires > 4.0 mg/L), resulting in mass fish asphyxiation.
2. **Toxic Chemical Frothing:** Excessive household detergents containing synthetic surfactants flow directly into stormwater drains and lakes, generating massive flammable chemical froth plumes (as seen historically at Bellandur and Varthur).
3. **Pathogen Infiltration:** Coliform bacteria counts regularly exceed 100x the permissible limits, contaminating groundwater recharge aquifers and borewells upon which surrounding residential communities depend.
4. **Information Asymmetry & Language Barrier:** Official water quality reports are published as obscure scanned PDFs with merged table cells in bureaucratic terminology. Working-class lakeside residents and sanitation workers lack an accessible interface in **Kannada (ಕನ್ನಡ)** to report violations in real-time.

---

## 👥 Who It Is Built For: Two Distinct User Groups

Jala Saakshi connects two sides of the environmental accountability equation:

```
┌──────────────────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│           GROUP 1: CITIZENS & WALKERS         │       │          GROUP 2: CIVIC AUTHORITIES          │
│          (Mobile Web App · Bilingual)        │       │         (Web Dashboard & Triage Queue)       │
├──────────────────────────────────────────────┤       ├──────────────────────────────────────────────┤
│ • Lakeside residents & morning walkers       │       │ • KSPCB & CPCB Environmental Officers        │
│ • Resident Welfare Associations (RWAs)       │       │ • BBMP Lakes Division Engineers              │
│ • Student citizen scientists & activists     │       │ • Fisheries Department & District Admin      │
├──────────────────────────────────────────────┤       ├──────────────────────────────────────────────┤
│ 📱 Native Kannada & English mobile UI        │       │ 💻 High-density desktop geospatial dashboard │
│ 🎙️ Kannada voice reporting via browser STT   │       │ ⏱️ Automated 7-day accountability clock      │
│ 📸 Photo upload with Bedrock AI vision       │       │ 🗺️ River monitoring points vs. lake gap layer│
│ ✉️ 1-click evidence-backed complaint drafting│       │ 🔍 Incident triage queue with image proofs   │
└──────────────────────────────────────────────┘       └──────────────────────────────────────────────┘
```

---

## 📸 Key Features & Visual Tour

### 1. Citizen Experience: Mobile App & Kannada Voice
Designed specifically for mobile devices with high-contrast, tactile UI and **full bilingual support (ಕನ್ನಡ & English)**. A citizen at the lake can report pollution in seconds without typing.

<table align="center">
  <tr>
    <td align="center" width="25%">
      <img src="docs/screenshots/app-home-kn.png" width="220" alt="App Home - Kannada" /><br />
      <b>1. Home Screen (ಕನ್ನಡ)</b><br />
      <em>Recent alerts, nearby lakes & quick report button</em>
    </td>
    <td align="center" width="25%">
      <img src="docs/screenshots/app-report-kn.png" width="220" alt="Report Form - Kannada" /><br />
      <b>2. Report Form</b><br />
      <em>Photo upload, GPS fix, and multi-issue tags</em>
    </td>
    <td align="center" width="25%">
      <img src="docs/screenshots/app-report-voice-kn.png" width="220" alt="Voice Input - Kannada" /><br />
      <b>3. Kannada Voice Input</b><br />
      <em>Dictate observations naturally in Kannada</em>
    </td>
    <td align="center" width="25%">
      <img src="docs/screenshots/app-map-kn.png" width="220" alt="Lake Map - Kannada" /><br />
      <b>4. Lake Map (ಕನ್ನಡ)</b><br />
      <em>All 342 Bengaluru lakes with official classifications</em>
    </td>
  </tr>
</table>

#### 🎙️ How Voice Input Works:
- Integrates the browser's speech recognition engine configured for **`kn-IN`** (Kannada) and **`en-IN`** (Indian English).
- Live audio is transcribed into an editable observation field, allowing residents to speak naturally without wrestling with phonetic keyboards.
- Architected for seamless drop-in replacement by **Amazon Transcribe** for high-accuracy server-side audio processing.

<table align="center">
  <tr>
    <td align="center" width="33%">
      <img src="docs/screenshots/app-home-en.png" width="220" alt="App Home - English" /><br />
      <b>English Interface</b><br />
      <em>1-tap toggle between Kannada & English</em>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/app-report-voice-en.png" width="220" alt="Voice Input - English" /><br />
      <b>English Voice Dictation</b><br />
      <em>Instant speech-to-text input</em>
    </td>
    <td align="center" width="33%">
      <img src="docs/screenshots/app-map-en.png" width="220" alt="Map View - English" /><br />
      <b>Lake Status Overview</b><br />
      <em>Status markers color-coded & lettered</em>
    </td>
  </tr>
</table>

---

### 2. Authority & Civic Bodies Experience: Web Portal & Dashboard

#### 🏢 Authority Triage Portal (`#/authority`)
Civic authorities (BBMP, KSPCB, Fisheries) access an operational triage queue tracking every citizen-reported incident.
- **Automated Accountability Clock:** Tracks how many days an incident has sat without official acknowledgment (highlighting overdue cases > 7 days).
- **Incident Categorization:** Surface froth, sewage inflow, chemical discharge, or fish kill.
- **Evidence Verification:** Compares the citizen's photo against historical water quality readings and satellite frames.

<div align="center">
  <img src="docs/screenshots/web-authority-portal.png" width="800" alt="Jala Saakshi Authority Portal — Incident Triage Queue" />
  <p><em>Authority Portal: Incident overview, risk ranking, response clock, and mapped citizen reports.</em></p>
</div>

#### 🗺️ Geospatial Water Quality Dashboard (`#/dashboard`)
A full desktop research interface displaying **8 years of water quality data across Karnataka**:
- **Timeline Scrubber:** Step through 30 monthly monitoring cycles from 2018 to August 2026.
- **Color-Blind Accessible Scale:** Points are lettered (`A`, `B`, `C`, `D`, `E`) and styled with distinct high-contrast hues.
- **The "Lake Gap Layer":** Overlays all 342 OpenStreetMap lake boundaries over KSPCB's river stations, visually highlighting unmonitored water bodies.

<div align="center">
  <img src="docs/screenshots/web-dashboard.png" width="800" alt="Water Quality Explorer Dashboard" />
  <p><em>Geospatial Explorer: 73 active monitoring points, river polylines, CPCB classifications, and worst-performing stations.</em></p>
</div>

---

### 3. Discovering Lakes Near You (`#/near-me`)
Citizens can enter their location or grant browser geolocation to see what the state knows about their immediate surroundings:
1. Identifies every water body within a **3 km radius**.
2. Displays the nearest tested lake's Dissolved Oxygen (DO), Biochemical Oxygen Demand (BOD), and fecal coliform levels.
3. Translates technical metrics into plain language (e.g., *"Safe for fish"*, *"Severe sewage contamination"*).
4. Clearly flags water bodies that have **zero official monitoring**.

<div align="center">
  <img src="docs/screenshots/web-landing-evidence.png" width="800" alt="Evidence Layer — Monitoring Points & Lake Gap" />
  <p><em>The Evidence Layer: Interactive gap analysis between government monitoring points and actual urban lakes.</em></p>
</div>

---

## 📊 The Data Provenance

To build Jala Saakshi, we excavated and standardized fragmented public data that was previously locked away:

| Dataset | Volume & Scope | Source | Processing Method |
| :--- | :--- | :--- | :--- |
| **Karnataka River Monitoring Reports** | **1,183 readings**, 160 stations, 28 rivers (2018–2026) | KSPCB Monthly PRS Water Quality Reports | Extracted from 30 complex PDFs with merged cells using `pdfplumber` pipeline. |
| **Bengaluru Lakes Monitoring** | **131 lakes tested** (July 2026) | KSPCB Bengaluru Lake Health Reports | Parsed into structured JSON (`lakes-2026-07.json`). |
| **Bengaluru Lake Polygons** | **342 named water bodies** | OpenStreetMap (OSM) Overpass API | Converted to GeoJSON (`all-lakes.geojson`) and matched via custom spatial point-in-polygon algorithm (`scripts/match-lakes.mjs`). |
| **National River Network** | **23,826 river line features** | India-WRIS / National River Network | Optimized GeoJSON coordinates to 5 decimal places (~1m accuracy), reduced from 54 MB to 5.5 MB. |
| **Sentinel-2 L2A Satellite Imagery** | 5-day revisit multispectral tiles | **AWS Open Data Registry** (`s3://sentinel-cogs`) | 10m true-colour spatial resolution capturing surface algae and water extents. |

---

## 🏗️ Architecture & System Design

Jala Saakshi uses a **serverless, data-first architecture** designed to be low-cost, infinitely scalable, and robust.

<div align="center">
  <img src="docs/screenshots/architecture.png" width="820" alt="Jala Saakshi AWS Architecture Diagram" />
  <p><em>System Architecture: Static asset delivery, serverless AI pipelines, and bilingual frontend clients.</em></p>
</div>

```mermaid
flowchart TD
    subgraph DataSources["A · DATA SOURCES"]
        PDF["KSPCB Monthly PDFs<br/>(30 reports · 2018-2026)"]
        OSM["OpenStreetMap<br/>(342 lake polygons)"]
        S2["Sentinel-2 L2A<br/>(AWS Open Data Registry)"]
        OM["Open-Meteo<br/>(Daily rainfall API)"]
    end

    subgraph Storage["B · INGESTION & STORAGE"]
        PIPE["Python Extraction Pipeline<br/>(pdfplumber · 1,183 readings)"]
        S3["Amazon S3<br/>(readings.json · GeoJSON · satellite tiles)"]
    end

    subgraph Backend["C · SERVERLESS BACKEND (SAM)"]
        APIGW["Amazon API Gateway (HTTP API v2)<br/>CORS & Rate Limiting (5 req/s)"]
        LAMBDA["AWS Lambda (Python 3.12)<br/>analyze_photo · draft_complaint"]
        BEDROCK["Amazon Bedrock (Amazon Nova Lite)<br/>Multimodal Vision & Bilingual Generation"]
        TRANSCRIBE["Amazon Transcribe (Planned)<br/>Kannada STT Audio Processing"]
    end

    subgraph Delivery["D · DEPLOYMENT & DELIVERY"]
        GIT["GitHub main<br/>(Automated CI/CD)"]
        AMPLIFY["AWS Amplify Hosting<br/>(Static build & preview branches)"]
        CF["Amazon CloudFront<br/>(Global Edge CDN)"]
    end

    subgraph Clients["E · PEOPLE & SURFACES"]
        MOBILE["Citizen Mobile App<br/>(Photo + Voice + GPS · ಕನ್ನಡ/English)"]
        PORTAL["Authority Triage Portal<br/>(Incident queue & 7-day clock)"]
        DASH["Geospatial Dashboard<br/>(River & Lake Water Quality)"]
    end

    PDF --> PIPE
    PIPE --> S3
    OSM --> S3
    S2 --> S3
    S3 -.-> LAMBDA
    
    MOBILE -->|Upload photo & note| APIGW
    APIGW --> LAMBDA
    LAMBDA --> BEDROCK
    LAMBDA -.-> TRANSCRIBE
    
    GIT --> AMPLIFY
    AMPLIFY --> CF
    CF --> MOBILE
    CF --> PORTAL
    CF --> DASH
```

---

## ☁️ AWS Services Implementation (Judging Criteria)

Every AWS service is thoughtfully chosen to adhere to the AWS Well-Architected Framework:

| Service | Architecture Layer | Current Status | Why & How It Is Used |
| :--- | :--- | :---: | :--- |
| **AWS Amplify Hosting** | CI/CD & Static Delivery | `DEPLOYED` | Connects directly to Git `main`. Builds the Vite React SPA and automates SSL certificates, custom branch previews, and edge cache invalidation. |
| **Amazon CloudFront** | Content Delivery Network | `DEPLOYED` | Fronts Amplify Hosting to serve static JavaScript bundles, CSS, and multi-megabyte GeoJSON datasets across edge locations with sub-50ms latency in India. |
| **Amazon Bedrock** | Generative AI & Vision | `DESIGNED` | Utilizes **Amazon Nova Lite (`us.amazon.nova-lite-v1:0`)**: <br/>1. **Multimodal classification (`POST /analyze-photo`):** Detects surface froth, sewage outfalls, algal blooms, or fish mortality with severity scores (1–5).<br/>2. **Formal letter generation (`POST /draft-complaint`):** Synthesizes citizen observations with historical chemical readings to draft formal complaints in English, Kannada, and Hindi. |
| **AWS Lambda** | Serverless Compute | `DESIGNED` | Runs Python 3.12 handlers behind API Gateway. Completely decouples AI inferencing from client-side code so zero AWS credentials reach the browser. |
| **Amazon API Gateway** | Managed REST Interface | `DESIGNED` | HTTP API (v2) configured with strict CORS whitelist for the Amplify domain, payload size limits (rejects > 6MB), and throttling (5 requests/sec, burst 10) to eliminate DDoS risks. |
| **Amazon S3** | Object Storage | `DESIGNED` | Stores immutable extracted datasets (`readings.json`, `lakes-2026-07.json`), GeoJSON river networks, and cached satellite imagery. Enables runtime swapping via `VITE_DATA_URL`. |
| **AWS Open Data Registry** | Geospatial Data Source | `INTEGRATED` | Consumes public **Sentinel-2 L2A Cloud-Optimized GeoTIFFs (COGs)** directly from `s3://sentinel-cogs` without incurring licensing or egress storage fees. |
| **Amazon CloudWatch** | Monitoring & Logging | `DESIGNED` | Captures Lambda latency, invocation rates, and error traces while sanitizing base64 image payloads from log streams to protect privacy. |
| **AWS IAM** | Security & Access Control | `DESIGNED` | Implements strict least-privilege roles for Lambda execution, scoped specifically to `bedrock:InvokeModel` on the Nova Lite inference profile. |
| **Amazon Transcribe** | Speech-to-Text | `PLANNED` | Architectural next step to supplement the browser's Web Speech API with managed server-side Kannada transcription for low-end Android smartphones. |
| **Amazon Cognito** | Authentication | `PLANNED` | Planned RBAC module to secure the **Authority Triage Portal** for verified municipal and environmental officers. |

---

## 💻 Quick Start & Local Development

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **npm** ≥ 9

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/mithali-netizen/tiramisu.git
cd tiramisu
npm install
```

### 2. Run the Frontend
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser:
- `http://localhost:5173/#/` — Landing Page & Doddagubbi Crisis
- `http://localhost:5173/#/app` — Citizen Mobile App (Kannada/English)
- `http://localhost:5173/#/near-me` — 3km Lake Discovery Flow
- `http://localhost:5173/#/dashboard` — Water Quality Explorer
- `http://localhost:5173/#/authority` — Authority Triage Portal

### 3. Run the AI Backend (Zero AWS Cost)
The backend includes a zero-dependency local server with a built-in Bedrock mock mode:
```bash
# In another terminal window:
python backend/local_server.py
```
- Starts on `http://localhost:8787` with `MOCK_BEDROCK=true`.
- Allows testing `/analyze-photo` and `/draft-complaint` without AWS credentials.
- To connect to live Amazon Bedrock, set `MOCK_BEDROCK=false` and provide AWS credentials.

### 4. Run Unit Tests
```bash
# Run backend test suite (10 unit tests for input validation, Bedrock parsing & fallback)
python -m pytest backend/tests/ -v

# Run frontend linter
npm run lint
```

### 5. Production AWS SAM Deployment
When ready to deploy the serverless backend to AWS:
```bash
cd backend
sam build
sam deploy --guided
```

---

## 👩‍💻 Project Team & Attributions

Created with ❤️ for Bengaluru's lakes by:
- **Sreeya Chand** — Frontend Architecture, Geospatial Visualizations & Story Design
- **Mithali Netizen** — Data Pipeline Engineering, KSPCB PDF Extraction & Spatial Matching
- **Prapti** — Backend SAM Architecture, Bedrock Prompt Engineering & UX Design

### Official Data Citations
- **Water Quality Data:** Karnataka State Pollution Control Board (KSPCB) Monthly Monitoring Reports (2018–2026).
- **Fish Kill Statistics:** National Green Tribunal (NGT) Suo Motu Proceedings, as cited in *Deccan Herald* (June 2024).
- **Incident Coverage:** *Bangalore Mirror / Deccan Herald* reports on Doddagubbi Lake (October 2026).
- **Basemaps & Boundaries:** OpenStreetMap contributors & India-WRIS.

---

<div align="center">
  <b>Jala Saakshi · ಜಲ ಸಾಕ್ಷಿ</b><br/>
  <i>Every lake deserves a witness.</i>
</div>
