import os
import re
import json
import hashlib
from typing import Dict, Any, Tuple

# Configuration & Constants
REGION = os.environ.get("AWS_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0")

ALLOWED_ISSUES = [
    "dead_fish",
    "froth",
    "sewage_outfall",
    "algae",
    "other_pollution",
    "nothing_wrong"
]

FALLBACK_ANALYZE_RESULT = {
    "issue": "unclear",
    "severity": 0,
    "description": "Could not analyse this photo."
}

SUGGESTED_CC = [
    "Greater Bengaluru Authority (GBA)",
    "Minor Irrigation and Ground Water Development Department",
    "Department of Fisheries, Government of Karnataka"
]

ISSUE_NORMALIZATION = {
    "dead fish": "dead_fish",
    "deadfish": "dead_fish",
    "sewage": "sewage_outfall",
    "sewage outfall": "sewage_outfall",
    "sewage_outfall": "sewage_outfall",
    "froth": "froth",
    "foam": "froth",
    "algae": "algae",
    "algal bloom": "algae",
    "other pollution": "other_pollution",
    "other_pollution": "other_pollution",
    "pollution": "other_pollution",
    "nothing wrong": "nothing_wrong",
    "nothing_wrong": "nothing_wrong",
    "none": "nothing_wrong",
    "clear": "nothing_wrong"
}

def is_mock_enabled() -> bool:
    """Check if Bedrock mock mode is enabled."""
    val = os.environ.get("MOCK_BEDROCK", "false").strip().lower()
    return val in ("true", "1", "yes", "on")

def build_response(status_code: int, body: Dict[str, Any], origin: str = "*") -> Dict[str, Any]:
    """Build a standardized API Gateway HTTP response with CORS headers."""
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": origin if origin else "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key"
    }
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body)
    }

def clean_fenced_json(text: str) -> str:
    """Strip markdown code fences and locate the outer JSON object."""
    if not text:
        return ""
    cleaned = text.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    else:
        json_match = re.search(r"\{[\s\S]*\}", cleaned)
        if json_match:
            cleaned = json_match.group(0).strip()
    return cleaned

def parse_and_validate_photo_response(text: str) -> Dict[str, Any]:
    """
    Robustly parse photo classification reply from Bedrock.
    Validates issue against ALLOWED_ISSUES, clamps severity to 1-5,
    truncates description to 200 chars.
    """
    if not text or not text.strip():
        return FALLBACK_ANALYZE_RESULT

    cleaned_json = clean_fenced_json(text)
    try:
        data = json.loads(cleaned_json)
    except Exception:
        return FALLBACK_ANALYZE_RESULT

    if not isinstance(data, dict):
        return FALLBACK_ANALYZE_RESULT

    raw_issue = str(data.get("issue", "")).strip().lower()
    issue = ISSUE_NORMALIZATION.get(raw_issue, raw_issue)
    if issue not in ALLOWED_ISSUES:
        issue = "other_pollution" if "pollution" in raw_issue else "unclear"

    if issue == "unclear":
        return FALLBACK_ANALYZE_RESULT

    try:
        raw_sev = int(data.get("severity", 1))
        severity = max(1, min(5, raw_sev))
    except (ValueError, TypeError):
        severity = 1

    raw_desc = str(data.get("description", "")).strip()
    description = raw_desc[:200] if raw_desc else f"Observation classified as {issue}."

    return {
        "issue": issue,
        "severity": severity,
        "description": description
    }

def parse_and_validate_complaint_response(text: str, language: str) -> Dict[str, Any]:
    """
    Robustly parse complaint text reply from Bedrock.
    Returns { subjectEn, bodyEn, subjectKn, bodyKn, subjectHi, bodyHi, suggestedCc }.
    """
    cleaned_json = clean_fenced_json(text)
    data = {}
    try:
        parsed = json.loads(cleaned_json)
        if isinstance(parsed, dict):
            data = parsed
    except Exception:
        pass

    req_lang = (language or "en").lower()

    subject_en = str(data.get("subjectEn", "")).strip()
    body_en    = str(data.get("bodyEn",    "")).strip()
    subject_kn = str(data.get("subjectKn", "")).strip()
    body_kn    = str(data.get("bodyKn",    "")).strip()
    subject_hi = str(data.get("subjectHi", "")).strip()
    body_hi    = str(data.get("bodyHi",    "")).strip()

    # If JSON parse failed, fall back to raw text as English body
    if not body_en and req_lang in ("en", "both", "all") and text:
        body_en = text.strip()
        subject_en = "Citizen Observation Report: Water Quality Issue"

    # Blank out languages not requested
    if req_lang == "en":
        subject_kn = subject_hi = ""
        body_kn    = body_hi    = ""
    elif req_lang == "kn":
        subject_en = subject_hi = ""
        body_en    = body_hi    = ""
    elif req_lang == "hi":
        subject_en = subject_kn = ""
        body_en    = body_kn    = ""
    # 'both' / 'all' → return everything as-is

    return {
        "subjectEn": subject_en,
        "bodyEn":    body_en,
        "subjectKn": subject_kn,
        "bodyKn":    body_kn,
        "subjectHi": subject_hi,
        "bodyHi":    body_hi,
        "suggestedCc": SUGGESTED_CC
    }

def get_mock_photo_analysis(image_base64: str) -> Dict[str, Any]:
    """
    Analyse the actual image pixels (via PIL) to classify pollution type.
    Falls back to hash-based selection only if PIL is unavailable.
    """
    try:
        import base64 as _b64
        import io
        from PIL import Image

        # Strip data-URL prefix if present
        b64 = image_base64 or ""
        if "," in b64 and b64.startswith("data:"):
            b64 = b64.split(",", 1)[1]

        img_bytes = _b64.b64decode(b64)
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        # Downsample to 64x64 for fast analysis
        img = img.resize((64, 64), Image.LANCZOS)
        pixels = list(img.getdata())

        total = len(pixels)
        avg_r = sum(p[0] for p in pixels) / total
        avg_g = sum(p[1] for p in pixels) / total
        avg_b = sum(p[2] for p in pixels) / total
        avg_brightness = (avg_r + avg_g + avg_b) / 3

        # ---- Pixel buckets ----
        # Green-dominant (algae / bloom)
        green_px = sum(1 for p in pixels if p[1] > p[0] + 12 and p[1] > p[2] + 8)
        # Bright white (froth / foam)
        white_px = sum(1 for p in pixels if p[0] > 195 and p[1] > 195 and p[2] > 195)
        # Warm brownish-murky mid-tones (dead fish / sewage)
        brownish_px = sum(
            1 for p in pixels
            if p[0] > p[2] and (p[0] + p[1] + p[2]) > 150 and (p[0] + p[1] + p[2]) < 520
        )
        # Dark brown/grey (heavy sewage / turbid effluent)
        dark_brown_px = sum(
            1 for p in pixels
            if p[0] > p[2] + 15 and (p[0] + p[1] + p[2]) < 380
        )
        # Very dark overall (oil slick, severely polluted)
        dark_px = sum(1 for p in pixels if (p[0] + p[1] + p[2]) < 160)

        green_pct    = green_px    / total
        white_pct    = white_px    / total
        brownish_pct = brownish_px / total
        dark_brown_pct = dark_brown_px / total
        dark_pct     = dark_px     / total

        # ---- Classification (ordered by specificity) ----

        # Algal bloom: strongly green-dominant
        if green_pct > 0.20 or (avg_g > avg_r + 10 and avg_g > avg_b + 8 and green_pct > 0.10):
            sev = min(5, max(2, round(green_pct * 15) + 1))
            return {
                "issue": "algae",
                "severity": sev,
                "description": (
                    "Green algal bloom detected: dense greenish discolouration and surface scum "
                    "visible across significant portions of the water surface."
                )
            }

        # White froth / chemical foam
        if white_pct > 0.20:
            sev = min(5, max(3, round(white_pct * 12)))
            return {
                "issue": "froth",
                "severity": sev,
                "description": (
                    "Extensive white foam and chemical froth observed floating on the water surface, "
                    "indicative of surfactant or industrial effluent entry."
                )
            }

        # Heavy dark-brown turbid sewage — requires strong dark-warm signal AND low overall brightness.
        # Threshold 0.15 avoids false-positive on lit murky scenes (like dead-fish events at surface).
        sewage_signal = dark_brown_pct > 0.15 and avg_brightness < 115
        if sewage_signal or (avg_r > avg_b + 22 and avg_brightness < 108):
            sev = min(5, max(3, round(dark_brown_pct * 22) + 2))
            return {
                "issue": "sewage_outfall",
                "severity": sev,
                "description": (
                    "Brown/dark turbid effluent detected: discolouration consistent with sewage or "
                    "industrial discharge entering the water body."
                )
            }

        # Dead fish / aquatic mortality — warm brownish mid-tones dominate.
        # brownish_pct: pixels where R > B across mid-brightness range (150–520 sum) — key signal for
        # murky lit water with organic debris and fish-kill discolouration.
        if brownish_pct > 0.16:
            sev = min(5, max(3, round(brownish_pct * 10) + 1))
            return {
                "issue": "dead_fish",
                "severity": sev,
                "description": (
                    "Warm murky discolouration detected across the water surface — pixel analysis "
                    "is consistent with conditions associated with aquatic mortality or heavy organic loading."
                )
            }

        # Very dark / oil-slick
        if dark_pct > 0.35 and avg_brightness < 95:
            return {
                "issue": "other_pollution",
                "severity": 4,
                "description": (
                    "Severely dark water surface detected — possible oil sheen, heavy industrial "
                    "effluent, or extreme turbidity."
                )
            }

        # No single dominant signal
        return {
            "issue": "other_pollution",
            "severity": 2,
            "description": (
                "Abnormal water appearance detected but no single dominant pollution signature. "
                "Manual on-site inspection is recommended."
            )
        }

    except Exception as e:
        print(f"[MockAnalysis] PIL analysis failed ({e}), using hash fallback.")
        h = int(hashlib.md5((image_base64 or "").encode()).hexdigest(), 16) % 4
        mocks = [
            {
                "issue": "froth",
                "severity": 4,
                "description": "Noticeable layer of chemical/surfactant white foam and froth floating along the river channel."
            },
            {
                "issue": "algae",
                "severity": 3,
                "description": "Dense greenish algal accumulation and surface scum observed on the water surface."
            },
            {
                "issue": "sewage_outfall",
                "severity": 4,
                "description": "Discolored effluent discharge entering the water body with visible turbidity."
            },
            {
                "issue": "dead_fish",
                "severity": 4,
                "description": "Multiple dead fish observed floating on the surface, indicating potential contamination."
            }
        ]
        return mocks[h]


def get_mock_complaint(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a formal, polite template complaint in English, Kannada, and Hindi."""
    station  = payload.get("stationName", "Monitoring Station")
    river    = payload.get("riverName", "River")
    issue    = payload.get("issue", "water quality observation")
    severity = payload.get("severity", 3)
    desc     = payload.get("description", "Unusual discoloration observed.")
    rep_date = payload.get("reportDate", "Recent Observation")
    lat      = payload.get("lat")
    lng      = payload.get("lng")
    reading  = payload.get("lastReading") or {}
    lang     = (payload.get("language") or "en").lower()

    coords_str = f"Coordinates: {lat:.5f}, {lng:.5f}" if (lat is not None and lng is not None) else "Coordinates: Available upon request"
    reading_str = ""
    if reading:
        r_parts = []
        if reading.get("month"):           r_parts.append(f"Month: {reading['month']}")
        if reading.get("class"):           r_parts.append(f"CPCB Class: {reading['class']}")
        if reading.get("do") is not None:  r_parts.append(f"DO: {reading['do']} mg/L")
        if reading.get("bod") is not None: r_parts.append(f"BOD: {reading['bod']} mg/L")
        if reading.get("total_coliform") is not None:
            r_parts.append(f"Total Coliform: {reading['total_coliform']} MPN/100ml")
        if r_parts:
            reading_str = "\nLatest Official Monitoring Record:\n- " + "\n- ".join(r_parts) + "\n"

    issue_title = issue.replace("_", " ").title()

    # ---- English ----
    subject_en = f"Citizen Observation Report: Potential {issue_title} near {station} ({river})"
    body_en = (
        f"To,\n"
        f"The Member Secretary / Environmental Officer,\n"
        f"Karnataka State Pollution Control Board (KSPCB),\n"
        f"Bengaluru, Karnataka.\n\n"
        f"Subject: Citizen Observation Report: Potential {issue_title} near {station}\n\n"
        f"Respected Sir/Madam,\n\n"
        f"I am writing as a concerned citizen to submit a factual observation of potential water contamination "
        f"observed near {station} along {river}.\n\n"
        f"Observation Details:\n"
        f"- Observation Date: {rep_date}\n"
        f"- Location: {station}, {river}\n"
        f"- {coords_str}\n"
        f"- Observed Issue: {issue_title} (Severity Assessment: {severity}/5)\n"
        f"- Field Description: {desc}\n"
        f"{reading_str}\n"
        f"Disclaimer: The initial image analysis was AI-assisted and remains unverified by chemical sampling. "
        f"This report does not attribute responsibility to any entity or individual, but is submitted solely to "
        f"facilitate timely verification and inspection by KSPCB field officers.\n\n"
        f"We kindly request the competent authority to inspect the site and initiate appropriate sampling if warranted.\n\n"
        f"Thank you for your service.\n\n"
        f"Yours sincerely,\n"
        f"Concerned Citizen / River Basin Resident"
    )

    # ---- Kannada ----
    subject_kn = f"ನಾಗರಿಕ ಗಮನ ವರದಿ: {station} ಬಳಿ {river} ನದಿಯಲ್ಲಿ ಕಂಡುಬಂದ ಸಂಭಾವ್ಯ ಮಾಲಿನ್ಯ"
    body_kn = (
        f"ಗೆ,\n"
        f"ಸದಸ್ಯ ಕಾರ್ಯದರ್ಶಿಗಳು / ಪರಿಸರ ಅಧಿಕಾರಿಗಳು,\n"
        f"ಕರ್ನಾಟಕ ರಾಜ್ಯ ಮಾಲಿನ್ಯ ನಿಯಂತ್ರಣ ಮಂಡಳಿ (KSPCB),\n"
        f"ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ.\n\n"
        f"ವಿಷಯ: {station} ಬಳಿ {river} ನದಿಯಲ್ಲಿ ಕಂಡುಬಂದ ನೀರಿನ ಗುಣಮಟ್ಟದ ಕುರಿತು ನಾಗರಿಕ ಗಮನ ವರದಿ.\n\n"
        f"ಮಾನ್ಯರೇ,\n\n"
        f"{river} ನದಿಯ ವ್ಯಾಪ್ತಿಯ {station} ಬಳಿ ಗಮನಿಸಿದ ನೀರಿನ ಗುಣಮಟ್ಟದ ಬದಲಾವಣೆಯ ಬಗ್ಗೆ ತಮ್ಮ ಗಮನಕ್ಕೆ ತರಲು "
        f"ಈ ವರದಿಯನ್ನು ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ.\n\n"
        f"ವಿವರಗಳು:\n"
        f"- ದಿನಾಂಕ: {rep_date}\n"
        f"- ಸ್ಥಳ: {station}, {river}\n"
        f"- {coords_str}\n"
        f"- ಗಮನಿಸಲಾದ ಸಮಸ್ಯೆ: {issue.replace('_', ' ')} (ತೀವ್ರತೆ: {severity}/5)\n"
        f"- ವಿವರಣೆ: {desc}\n\n"
        f"ಗಮನಿಸಿ: ಈ ವಿಶ್ಲೇಷಣೆಯು AI-ಆಧಾರಿತ ಅಂದಾಜಾಗಿದ್ದು, ಪ್ರಯೋಗಾಲಯ ಪರಿಶೀಲನೆಗೆ ಒಳಪಟ್ಟಿಲ್ಲ.\n\n"
        f"ದಯವಿಟ್ಟು ಸಂಬಂಧಪಟ್ಟ ಅಧಿಕಾರಿಗಳು ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸಿ ಸೂಕ್ತ ಕ್ರಮ ಕೈಗೊಳ್ಳಬೇಕಾಗಿ ವಿನಂತಿ.\n\n"
        f"ಧನ್ಯವಾದಗಳೊಂದಿಗೆ,\n"
        f"ಜಾಗೃತ ನಾಗರಿಕರು"
    )

    # ---- Hindi ----
    subject_hi = f"नागरिक अवलोकन रिपोर्ट: {station} के पास {river} नदी में संभावित प्रदूषण"
    body_hi = (
        f"सेवा में,\n"
        f"सदस्य सचिव / पर्यावरण अधिकारी,\n"
        f"कर्नाटक राज्य प्रदूषण नियंत्रण बोर्ड (KSPCB),\n"
        f"बेंगलुरु, कर्नाटक।\n\n"
        f"विषय: {station} के पास {river} नदी में जल गुणवत्ता संबंधी नागरिक अवलोकन रिपोर्ट।\n\n"
        f"महोदय/महोदया,\n\n"
        f"मैं एक जागरूक नागरिक के रूप में {river} नदी के {station} स्थान के पास संभावित जल प्रदूषण की "
        f"सूचना आपके संज्ञान में लाना चाहता/चाहती हूँ।\n\n"
        f"अवलोकन विवरण:\n"
        f"- अवलोकन तिथि: {rep_date}\n"
        f"- स्थान: {station}, {river}\n"
        f"- {coords_str}\n"
        f"- देखी गई समस्या: {issue.replace('_', ' ')} (गंभीरता स्तर: {severity}/5)\n"
        f"- विवरण: {desc}\n"
        f"{reading_str}\n"
        f"अस्वीकरण: यह प्रारंभिक छवि विश्लेषण कंप्यूटर-सहायता प्राप्त है और रासायनिक नमूना परीक्षण "
        f"द्वारा सत्यापित नहीं है। यह रिपोर्ट किसी व्यक्ति या संस्था पर दोषारोपण नहीं करती, बल्कि "
        f"KSPCB अधिकारियों द्वारा शीघ्र जांच हेतु प्रस्तुत की गई है।\n\n"
        f"कृपया संबंधित अधिकारी स्थल निरीक्षण कर उचित कार्रवाई करें।\n\n"
        f"धन्यवाद,\n"
        f"जागरूक नागरिक / नदी बेसिन निवासी"
    )

    # Blank out languages not requested
    if lang == "en":
        subject_kn = body_kn = subject_hi = body_hi = ""
    elif lang == "kn":
        subject_en = body_en = subject_hi = body_hi = ""
    elif lang == "hi":
        subject_en = body_en = subject_kn = body_kn = ""
    # 'both' / 'all' → return all three

    return {
        "subjectEn": subject_en,
        "bodyEn":    body_en,
        "subjectKn": subject_kn,
        "bodyKn":    body_kn,
        "subjectHi": subject_hi,
        "bodyHi":    body_hi,
        "suggestedCc": SUGGESTED_CC
    }

