import os
import sys
import json
import base64
from typing import Dict, Any

# Support both AWS Lambda package root and local repository execution
try:
    from common import (
        REGION,
        MODEL_ID,
        is_mock_enabled,
        build_response,
        parse_and_validate_photo_response,
        get_mock_photo_analysis,
        FALLBACK_ANALYZE_RESULT
    )
except ImportError:
    from backend.src.common import (
        REGION,
        MODEL_ID,
        is_mock_enabled,
        build_response,
        parse_and_validate_photo_response,
        get_mock_photo_analysis,
        FALLBACK_ANALYZE_RESULT
    )

MAX_PAYLOAD_BYTES = 4 * 1024 * 1024  # 4 MB

def lambda_handler(event: Dict[str, Any], context: Any = None) -> Dict[str, Any]:
    """
    AWS Lambda handler for POST /analyze-photo
    Input: { imageBase64: str, mediaFormat: 'jpeg'|'png', lat?: float, lng?: float }
    Output: { issue: str, severity: int, description: str }
    """
    # Handle CORS preflight if routed here
    http_method = event.get("requestContext", {}).get("http", {}).get("method") or event.get("httpMethod")
    if http_method == "OPTIONS":
        return build_response(200, {"status": "ok"})

    raw_body = event.get("body", "")
    if event.get("isBase64Encoded", False) and raw_body:
        try:
            raw_body = base64.b64decode(raw_body).decode("utf-8")
        except Exception:
            return build_response(400, {"error": "Invalid base64 encoding in request body."})

    # Check payload size (reject payloads over ~4MB with HTTP 413)
    body_bytes_len = len(raw_body.encode("utf-8")) if isinstance(raw_body, str) else len(raw_body)
    if body_bytes_len > MAX_PAYLOAD_BYTES:
        return build_response(413, {
            "error": "Payload exceeds maximum allowed size of 4MB."
        })

    try:
        payload = json.loads(raw_body) if isinstance(raw_body, str) else raw_body
        if not isinstance(payload, dict):
            return build_response(400, {"error": "Request body must be a JSON object."})
    except Exception:
        return build_response(400, {"error": "Malformed JSON in request body."})

    image_b64 = payload.get("imageBase64", "")
    media_format = (payload.get("mediaFormat") or "").strip().lower()
    lat = payload.get("lat")
    lng = payload.get("lng")

    if not image_b64:
        return build_response(400, {"error": "Missing required field: imageBase64."})

    # Normalize format (jpeg / png)
    if media_format in ("jpg", "jpeg"):
        format_for_bedrock = "jpeg"
    elif media_format == "png":
        format_for_bedrock = "png"
    else:
        return build_response(400, {
            "error": "Invalid mediaFormat. Supported formats are 'jpeg' or 'png'."
        })

    # Decode base64 bytes to verify integrity & check size
    try:
        # Strip data URL prefix if sent from frontend (e.g. data:image/jpeg;base64,...)
        if "," in image_b64 and image_b64.startswith("data:"):
            image_b64 = image_b64.split(",", 1)[1]
        image_bytes = base64.b64decode(image_b64)
    except Exception:
        return build_response(400, {"error": "Invalid base64 image data."})

    if len(image_bytes) > MAX_PAYLOAD_BYTES:
        return build_response(413, {"error": "Decoded image exceeds maximum size of 4MB."})

    # CloudWatch logging without logging image bytes
    print(f"[AnalyzePhoto] Request received: format={format_for_bedrock}, bytes={len(image_bytes)}, lat={lat}, lng={lng}")

    # Check for MOCK mode
    if is_mock_enabled():
        print("[AnalyzePhoto] MOCK_BEDROCK is active. Returning mock photo analysis.")
        mock_result = get_mock_photo_analysis(image_b64)
        return build_response(200, mock_result)

    # Call Amazon Bedrock Converse API with Nova Lite
    prompt = (
        "Does this lake photo show dead fish, froth, sewage, algae, or nothing wrong? "
        "Classify what the photo shows as exactly one of: "
        "[\"dead_fish\", \"froth\", \"sewage_outfall\", \"algae\", \"other_pollution\", \"nothing_wrong\"]. "
        "Provide severity as an integer from 1 to 5, and a one-line plain-English description. "
        "Reply as JSON only: {\"issue\": \"...\", \"severity\": 1-5, \"description\": \"...\"}"
    )

    try:
        import boto3
        client = boto3.client("bedrock-runtime", region_name=REGION)
        messages = [
            {
                "role": "user",
                "content": [
                    {
                        "image": {
                            "format": format_for_bedrock,
                            "source": {"bytes": image_bytes}
                        }
                    },
                    {
                        "text": prompt
                    }
                ]
            }
        ]

        response = client.converse(
            modelId=MODEL_ID,
            messages=messages,
            inferenceConfig={
                "maxTokens": 300,
                "temperature": 0.1,
                "topP": 0.9
            }
        )

        content_blocks = response.get("output", {}).get("message", {}).get("content", [])
        response_text = "".join(b.get("text", "") for b in content_blocks if "text" in b)
        print(f"[AnalyzePhoto] Bedrock raw output length: {len(response_text)}")

        parsed = parse_and_validate_photo_response(response_text)
        return build_response(200, parsed)

    except Exception as e:
        print(f"[AnalyzePhoto] Error invoking Bedrock converse: {e}")
        # On parse or converse failure, return fallback with HTTP 200 as specified
        return build_response(200, FALLBACK_ANALYZE_RESULT)
