# AWS Services Used

This file tracks every AWS service used in this project and explains why it's used.
Update this file whenever a new service is added or removed.

## Active (Deployed)

| Service | Role | Why it's used |
|---|---|---|
| **AWS Amplify Hosting** | Build & Deploy | Automatically builds and hosts the static Vite React app from Git commits. Provides a global CDN-backed HTTPS endpoint, CI/CD pipeline, and branch previews with zero server management. Configured via `amplify.yml`. |
| **Amazon CloudFront** | CDN (automatic) | Amplify Hosting creates and manages a CloudFront distribution automatically. All static assets (`JS`, `CSS`, `JSON` data files) and the `index.html` SPA entry point are served from CloudFront edge locations globally, giving low-latency delivery across India. |

---

## Planned (not deployed yet)

The following backend infrastructure is specified in `backend/template.yaml` for reproducible deployment via AWS SAM, and currently runs locally via `backend/local_server.py` with `MOCK_BEDROCK=true`:

| Service | Role | Why it's planned |
|---|---|---|
| **Amazon Bedrock (Amazon Nova Lite)** | AI Inference (`us.amazon.nova-lite-v1:0`) | Powers photo classification of river pollution (froth, algae, sewage, dead fish) and generates polite, bilingual citizen observation reports for KSPCB. |
| **AWS Lambda** | Serverless Compute (Python 3.12) | Runs backend handlers (`/analyze-photo`, `/draft-complaint`) securely on AWS without exposing AWS credentials to the front end or repository. |
| **Amazon API Gateway** | HTTP API (v2) | Exposes clean, managed REST endpoints with CORS enforcement and built-in rate-limiting/throttling (5 req/s, burst 10) to guard against unexpected usage. |
| **Amazon CloudWatch** | Observability & Logging | Collects Lambda execution logs and performance metrics while securely omitting raw image bytes from log streams. |
| **AWS IAM** | Least-Privilege Access Control | Grants Lambda execution role minimal permissions strictly scoped to `bedrock:InvokeModel` on the Nova Lite model and inference profile ARNs. |

---

## Notes

- The front-end application remains fully static on AWS Amplify Hosting.
- The AI features can run completely locally with zero AWS cost by starting `python backend/local_server.py` (which defaults to `MOCK_BEDROCK=true`).
- When ready to deploy the live serverless backend, run `sam build && sam deploy --guided` from the `backend/` directory.
