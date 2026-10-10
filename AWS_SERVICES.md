# AWS Services Used

This file tracks every AWS service used in this project and explains why it's used.
Update this file whenever a new service is added or removed.

| Service | Role | Why it's used |
|---|---|---|
| **AWS Amplify Hosting** | Build & Deploy | Automatically builds and hosts the static Vite React app from Git commits. Provides a global CDN-backed HTTPS endpoint, CI/CD pipeline, and branch previews with zero server management. Configured via `amplify.yml`. |
| **Amazon CloudFront** | CDN (automatic) | Amplify Hosting creates and manages a CloudFront distribution automatically. All static assets (`JS`, `CSS`, `JSON` data files) and the `index.html` SPA entry point are served from CloudFront edge locations globally, giving low-latency delivery across India. |

---

## Notes

- No API keys, Lambda functions, or backend services are currently required. The app is fully static.
- The `public/data/readings.json` file is served directly as a static asset from CloudFront.
- To add a backend (e.g., Lambda + API Gateway for real-time CPCB data), add a new row for each service.
- SPA routing (React Router, if added later) is handled via the custom rewrite rule in `amplify.yml` and the `public/_redirects` pattern.
