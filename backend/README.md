# KSPCB River Water Quality - AI Pollution Reporting Backend

Serverless backend for AI-assisted river pollution photo classification and citizen complaint generation using **Amazon Bedrock (Amazon Nova Lite)**, **AWS Lambda**, and **Amazon API Gateway**.

---

## Architecture Overview

```text
React Front End (Vite / AWS Amplify)
  │
  ▼
API Gateway (HTTP API v2)
  ├── POST /analyze-photo   ──► Lambda (analyze_photo.py)   ──► Bedrock Converse (Nova Lite Multimodal)
  └── POST /draft-complaint ──► Lambda (draft_complaint.py) ──► Bedrock Converse (Nova Lite Text)
```

- **Runtime**: Python 3.12
- **Bedrock Model**: `us.amazon.nova-lite-v1:0` (inference profile)
- **Region**: `us-east-1`
- **Zero-Cost Local Dev**: Fully supported via `MOCK_BEDROCK=true` without AWS credentials or Docker.

---

## Local Development (No AWS Deployment Required)

### 1. Run the Local Dev Server

Start the zero-dependency local dev server on `http://localhost:8787`:

```bash
# In project root:
python backend/local_server.py
```

By default, `MOCK_BEDROCK=true` is enabled, returning realistic canned AI responses locally without contacting AWS.

To run against **live Amazon Bedrock** (requires configured AWS credentials):
```bash
# Windows PowerShell:
$env:MOCK_BEDROCK="false"
python backend/local_server.py

# Linux / macOS:
MOCK_BEDROCK=false python backend/local_server.py
```

### 2. Run the Unit Test Suite

Run all unit tests using `pytest` (mocked boto3, no network calls):

```bash
python -m pytest backend/tests/ -v
```

All 10 unit test cases cover:
- Valid Bedrock response parsing
- Markdown code fence stripping (` ```json ... ``` `)
- Bad JSON fallback handling (`issue: "unclear"`, `severity: 0`)
- Oversized payload rejection (`HTTP 413`)
- Severity clamping (`1–5`)
- Missing field validation (`HTTP 400`)
- Both `/analyze-photo` and `/draft-complaint` handlers

---

## Testing with `curl`

### 1. Test Photo Analysis (`POST /analyze-photo`)

```bash
curl -X POST http://localhost:8787/analyze-photo \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "dGVzdC1pbWFnZS1ieXRlcw==",
    "mediaFormat": "jpeg",
    "lat": 12.1855,
    "lng": 77.1255
  }'
```

**Sample Response (`HTTP 200`)**:
```json
{
  "issue": "froth",
  "severity": 4,
  "description": "Noticeable layer of chemical/surfactant white foam and froth floating along the river channel."
}
```

### 2. Test Complaint Draft Generation (`POST /draft-complaint`)

```bash
curl -X POST http://localhost:8787/draft-complaint \
  -H "Content-Type: application/json" \
  -d '{
    "issue": "froth",
    "severity": 4,
    "description": "Thick foam layer accumulating near bridge piers.",
    "stationName": "Satyagala Bridge",
    "riverName": "Cauvery",
    "lat": 12.1855,
    "lng": 77.1255,
    "reportDate": "2026-10-10",
    "lastReading": {
      "month": "2026-08",
      "class": "D",
      "do": 3.2,
      "bod": 8.0,
      "total_coliform": 4500
    },
    "language": "both"
  }'
```

**Sample Response (`HTTP 200`)**:
```json
{
  "subjectEn": "Citizen Observation Report: Potential Froth near Satyagala Bridge (Cauvery)",
  "bodyEn": "To,\nThe Member Secretary / Environmental Officer,\nKarnataka State Pollution Control Board (KSPCB),\n...",
  "subjectKn": "ನಾಗರಿಕ ಗಮನ ವರದಿ: Satyagala Bridge ಬಳಿ Cauvery ನದಿಯಲ್ಲಿ ಕಂಡುಬಂದ ಸಂಭಾವ್ಯ ಮಾಲಿನ್ಯ",
  "bodyKn": "ಗೆ,\nಸದಸ್ಯ ಕಾರ್ಯದರ್ಶಿಗಳು / ಪರಿಸರ ಅಧಿಕಾರಿಗಳು,\nಕರ್ನಾಟಕ ರಾಜ್ಯ ಮಾಲಿನ್ಯ ನಿಯಂತ್ರಣ ಮಂಡಳಿ (KSPCB),\n...",
  "suggestedCc": [
    "Greater Bengaluru Authority (GBA)",
    "Minor Irrigation and Ground Water Development Department",
    "Department of Fisheries, Government of Karnataka"
  ]
}
```

---

## AWS Deployment (Ready for Future Deployment)

When you are ready to deploy to live AWS:

1. **Build SAM Artifacts**:
   ```bash
   cd backend
   sam build
   ```

2. **Deploy with Guided Setup**:
   ```bash
   sam deploy --guided
   ```
   During guided deployment:
   - Provide your hosted AWS Amplify front-end domain for `AmplifyDomain` (e.g. `https://main.d123456789.amplifyapp.com`) to lock down CORS.
   - Confirm AWS Region: `us-east-1`
   - Bedrock Model ID: `us.amazon.nova-lite-v1:0`

3. **Outputs**:
   SAM outputs the `HttpApiUrl`. Configure this URL in your front-end environment (`VITE_API_BASE_URL`).
