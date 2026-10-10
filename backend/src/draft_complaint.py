import os
import sys
import json
import base64
from typing import Dict, Any

try:
    from common import (
        REGION,
        MODEL_ID,
        is_mock_enabled,
        build_response,
        parse_and_validate_complaint_response,
        get_mock_complaint
    )
except ImportError:
    from backend.src.common import (
        REGION,
        MODEL_ID,
        is_mock_enabled,
        build_response,
        parse_and_validate_complaint_response,
        get_mock_complaint
    )

def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    AWS Lambda handler for POST /draft-complaint
    Input: {
        issue: str,
        severity: int,
        description: str,
        stationName: str,
        riverName: str,
        lat?: float,
        lng?: float,
        reportDate: str,
        lastReading?: {month, class, do, bod, total_coliform} | null,
        language: "en"|"kn"|"both"
    }
    Output: { subjectEn: str, bodyEn: str, subjectKn: str, bodyKn: str, suggestedCc: list[str] }
    """
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod")
    if http_method == "OPTIONS":
        return build_response(200, {"status": "ok"})

    raw_body = event.get("body", "")
    if event.get("isBase64Encoded", False) and raw_body:
        try:
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        except Exception:
            return build_response(400, {"error": "Invalid base64 encoding in request body."})

    try:
        payload = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
        if not isinstance(payload, dict):
            return build_response(400, {"error": "Request body must be a JSON object."})
    except Exception:
        return build_response(400, {"error": "Malformed JSON in request body."})

    # Validate required fields
    required = ["issue", "stationName", "riverName"]
    missing = [f for f in required if not payload.get(f)]
    if missing:
        return build_response(400, {"error": f"Missing required fields: {', '.join(missing)}"})

    language = (payload.get("language") or "all").lower()
    if language not in ("en", "kn", "hi", "both", "all"):
        language = "all"

    print(f"[DraftComplaint] Request received for station={payload.get('stationName')}, river={payload.get('riverName')}, lang={language}")

    # Check for MOCK mode
    if is_mock_enabled():
        print("[DraftComplaint] MOCK_BEDROCK is active. Returning mock formal complaint.")
        mock_result = get_mock_complaint(payload)
        return build_response(200, mock_result)

    # Call Amazon Bedrock Converse API with Nova Lite (text-only)
    station = payload.get("stationName")
    river = payload.get("riverName")
    issue = payload.get("issue")
    severity = payload.get("severity", 3)
    desc = payload.get("description", "Potential water contamination observed.")
    rep_date = payload.get("reportDate", "Recent Observation")
    lat = payload.get("lat")
    lng = payload.get("lng")
    reading = payload.get("lastReading") or {}

    coords_str = f"Lat: {lat}, Lng: {lng}" if (lat is not None and lng is not None) else "Not specified"
    reading_info = ""
    if reading:
        r_list = [f"{k}: {v}" for k, v in reading.items() if v is not None]
        if r_list:
            reading_info = "Latest official KSPCB monitoring record for this station: " + ", ".join(r_list)

    prompt = f"""You are drafting a formal citizen observation report addressed to the Karnataka State Pollution Control Board (KSPCB).
CRITICAL RULES:
1. Address the complaint to: Karnataka State Pollution Control Board (KSPCB), Bengaluru, Karnataka.
2. Formal, respectful, polite citizen observation tone.
3. Must NOT claim or state as fact that any specific company, factory, or person caused the pollution.
4. Must NOT invent or fabricate any numbers or chemical metrics not present in the input.
5. Must explicitly state that the initial image analysis is AI-assisted and unverified by laboratory sampling.
6. Provide output in JSON format with exactly these keys:
   {{"subjectEn": "...", "bodyEn": "...", "subjectKn": "...", "bodyKn": "...", "subjectHi": "...", "bodyHi": "..."}}
   If language requested is 'en', leave non-English fields as empty strings.
   If language requested is 'kn', leave non-Kannada fields as empty strings.
   If language requested is 'hi', leave non-Hindi fields as empty strings.
   If 'both' or 'all', provide high quality English, natural Kannada, and formal Hindi versions.

INPUT DETAILS:
- Target River: {river}
- Monitoring Station: {station}
- Coordinates: {coords_str}
- Observation Date: {rep_date}
- Observed Issue: {issue} (Estimated severity: {severity}/5)
- Description: {desc}
- Official Baseline: {reading_info or "No baseline data available"}
- Requested Language: {language}

Output pure JSON only:"""

    try:
        import boto3
        client = boto3.client("bedrock-runtime", region_name=REGION)
        messages = [
            {
                "role": "user",
                "content": [{"text": prompt}]
            }
        ]

        response = client.converse(
            modelId=MODEL_ID,
            messages=messages,
            inferenceConfig={
                "maxTokens": 1000,
                "temperature": 0.2,
                "topP": 0.9
            }
        )

        content_blocks = response.get("output", {}).get("message", {}).get("content", [])
        response_text = "".join(b.get("text", "") for b in content_blocks if "text" in b)
        print(f"[DraftComplaint] Bedrock raw output length: {len(response_text)}")

        parsed = parse_and_validate_complaint_response(response_text, language)
        return build_response(200, parsed)

    except Exception as e:
        print(f"[DraftComplaint] Error calling Bedrock: {e}. Falling back to templated complaint.")
        # Fallback to templated complaint so user is never blocked
        fallback = get_mock_complaint(payload)
        return build_response(200, fallback)
