import os
import sys
import json
import base64
import pytest
from unittest.mock import patch, MagicMock

# Ensure backend root is on sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.src.analyze_photo import lambda_handler as analyze_photo_handler
from backend.src.draft_complaint import lambda_handler as draft_complaint_handler
from backend.src.common import FALLBACK_ANALYZE_RESULT

def create_mock_event(path: str, body: dict = None, raw_body_str: str = None) -> dict:
    """Helper to craft an API Gateway HTTP API v2 event."""
    if raw_body_str is not None:
        body_content = raw_body_str
    elif body is not None:
        body_content = json.dumps(body)
    else:
        body_content = ""

    return {
        "version": "2.0",
        "routeKey": f"POST {path}",
        "rawPath": path,
        "headers": {"content-type": "application/json"},
        "requestContext": {
            "http": {"method": "POST", "path": path}
        },
        "body": body_content,
        "isBase64Encoded": False
    }

# ─────────────────────────────────────────────────────────────────────────────
# 1. /analyze-photo Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_analyze_photo_mock_mode():
    """Verify mock mode returns canned result without AWS call."""
    with patch.dict(os.environ, {"MOCK_BEDROCK": "true"}):
        tiny_b64 = base64.b64encode(b"fake-image-bytes").decode("utf-8")
        event = create_mock_event("/analyze-photo", {
            "imageBase64": tiny_b64,
            "mediaFormat": "jpeg"
        })
        res = analyze_photo_handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])
        assert "issue" in data
        assert data["severity"] in (1, 2, 3, 4, 5)
        assert len(data["description"]) > 0

def test_analyze_photo_valid_bedrock_response():
    """Verify live flow with mocked boto3 converse returning valid JSON."""
    mock_boto_client = MagicMock()
    mock_boto_client.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {"text": json.dumps({"issue": "froth", "severity": 4, "description": "Thick foam layer."})}
                ]
            }
        }
    }

    with patch.dict(os.environ, {"MOCK_BEDROCK": "false"}), \
         patch("boto3.client", return_value=mock_boto_client):
        
        tiny_b64 = base64.b64encode(b"fake-image-data").decode("utf-8")
        event = create_mock_event("/analyze-photo", {
            "imageBase64": tiny_b64,
            "mediaFormat": "jpeg",
            "lat": 12.97,
            "lng": 77.59
        })
        res = analyze_photo_handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])
        assert data["issue"] == "froth"
        assert data["severity"] == 4
        assert data["description"] == "Thick foam layer."

def test_analyze_photo_fenced_json():
    """Verify handling of markdown code fences (```json ... ```)."""
    mock_boto_client = MagicMock()
    mock_boto_client.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {"text": "```json\n{\"issue\": \"algae\", \"severity\": 3, \"description\": \"Green algal scum.\"}\n```"}
                ]
            }
        }
    }

    with patch.dict(os.environ, {"MOCK_BEDROCK": "false"}), \
         patch("boto3.client", return_value=mock_boto_client):
        
        tiny_b64 = base64.b64encode(b"image").decode("utf-8")
        event = create_mock_event("/analyze-photo", {
            "imageBase64": tiny_b64,
            "mediaFormat": "png"
        })
        res = analyze_photo_handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])
        assert data["issue"] == "algae"
        assert data["severity"] == 3

def test_analyze_photo_bad_json_fallback():
    """Verify non-JSON response returns fallback with HTTP 200."""
    mock_boto_client = MagicMock()
    mock_boto_client.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {"text": "I see some water but I cannot determine the pollution."}
                ]
            }
        }
    }

    with patch.dict(os.environ, {"MOCK_BEDROCK": "false"}), \
         patch("boto3.client", return_value=mock_boto_client):
        
        tiny_b64 = base64.b64encode(b"image").decode("utf-8")
        event = create_mock_event("/analyze-photo", {
            "imageBase64": tiny_b64,
            "mediaFormat": "jpeg"
        })
        res = analyze_photo_handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])
        assert data == FALLBACK_ANALYZE_RESULT

def test_analyze_photo_oversized_payload_413():
    """Verify payload over ~4MB returns HTTP 413."""
    oversized_str = "x" * (4 * 1024 * 1024 + 100)
    event = create_mock_event("/analyze-photo", raw_body_str=oversized_str)
    res = analyze_photo_handler(event, None)
    assert res["statusCode"] == 413
    data = json.loads(res["body"])
    assert "exceeds maximum allowed size" in data["error"]

def test_analyze_photo_severity_clamping():
    """Verify severity is clamped to 1-5."""
    mock_boto_client = MagicMock()
    mock_boto_client.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {"text": json.dumps({"issue": "sewage_outfall", "severity": 99, "description": "High sewage"})}
                ]
            }
        }
    }

    with patch.dict(os.environ, {"MOCK_BEDROCK": "false"}), \
         patch("boto3.client", return_value=mock_boto_client):
        
        tiny_b64 = base64.b64encode(b"image").decode("utf-8")
        event = create_mock_event("/analyze-photo", {
            "imageBase64": tiny_b64,
            "mediaFormat": "jpeg"
        })
        res = analyze_photo_handler(event, None)
        data = json.loads(res["body"])
        assert data["severity"] == 5

def test_analyze_photo_missing_fields_400():
    """Verify missing imageBase64 or invalid mediaFormat returns HTTP 400."""
    event1 = create_mock_event("/analyze-photo", {"mediaFormat": "jpeg"})
    res1 = analyze_photo_handler(event1, None)
    assert res1["statusCode"] == 400

    event2 = create_mock_event("/analyze-photo", {"imageBase64": "abc", "mediaFormat": "gif"})
    res2 = analyze_photo_handler(event2, None)
    assert res2["statusCode"] == 400

# ─────────────────────────────────────────────────────────────────────────────
# 2. /draft-complaint Tests
# ─────────────────────────────────────────────────────────────────────────────

def test_draft_complaint_mock_mode():
    """Verify mock mode returns formatted complaint in both languages with KSPCB address."""
    with patch.dict(os.environ, {"MOCK_BEDROCK": "true"}):
        event = create_mock_event("/draft-complaint", {
            "issue": "froth",
            "severity": 4,
            "description": "White froth billowing near bridge",
            "stationName": "Satyagala Bridge",
            "riverName": "Cauvery",
            "lat": 12.1855,
            "lng": 77.1255,
            "reportDate": "2026-10-10",
            "lastReading": {"month": "2026-08", "class": "D", "do": 3.2, "bod": 8.0, "total_coliform": 4500},
            "language": "both"
        })
        res = draft_complaint_handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])
        assert "Karnataka State Pollution Control Board" in data["bodyEn"]
        assert "AI-assisted" in data["bodyEn"]
        assert "AI-ಆಧಾರಿತ" in data["bodyKn"]
        assert len(data["suggestedCc"]) >= 3
        assert "Greater Bengaluru Authority (GBA)" in data["suggestedCc"]

def test_draft_complaint_valid_bedrock_response():
    """Verify live text converse flow with mocked boto3."""
    mock_boto_client = MagicMock()
    mock_boto_client.converse.return_value = {
        "output": {
            "message": {
                "content": [
                    {"text": json.dumps({
                        "subjectEn": "Formal Citizen Report: Water Quality",
                        "bodyEn": "Respected KSPCB, observation report...",
                        "subjectKn": "ವರದಿ",
                        "bodyKn": "ವಿವರಣೆ..."
                    })}
                ]
            }
        }
    }

    with patch.dict(os.environ, {"MOCK_BEDROCK": "false"}), \
         patch("boto3.client", return_value=mock_boto_client):
        
        event = create_mock_event("/draft-complaint", {
            "issue": "algae",
            "severity": 3,
            "description": "Green surface scum",
            "stationName": "Thumbe Dam",
            "riverName": "Netravathi",
            "language": "both"
        })
        res = draft_complaint_handler(event, None)
        assert res["statusCode"] == 200
        data = json.loads(res["body"])
        assert data["subjectEn"] == "Formal Citizen Report: Water Quality"
        assert len(data["suggestedCc"]) == 3

def test_draft_complaint_missing_fields_400():
    """Verify missing required fields returns HTTP 400."""
    event = create_mock_event("/draft-complaint", {
        "issue": "froth"
        # missing stationName and riverName
    })
    res = draft_complaint_handler(event, None)
    assert res["statusCode"] == 400
    data = json.loads(res["body"])
    assert "Missing required fields" in data["error"]
