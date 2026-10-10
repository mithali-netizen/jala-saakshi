import os
import sys
import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError

# Add parent path to import common
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
from backend.src.common import (
    REGION,
    MODEL_ID,
    parse_and_validate_photo_response
)

def analyze_photo(image_path: str) -> dict:
    """
    Reads local image and calls Bedrock Converse API with Amazon Nova Lite.
    Uses shared parse_and_validate_photo_response from backend.src.common.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found at: {image_path}")

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print(f"Connecting to Amazon Bedrock Runtime ({REGION}) with model: {MODEL_ID}...")
    client = boto3.client("bedrock-runtime", region_name=REGION)

    prompt = (
        "Does this lake photo show dead fish, froth, sewage, algae, or nothing wrong? "
        "Classify what the photo shows as exactly one of: "
        "[\"dead_fish\", \"froth\", \"sewage_outfall\", \"algae\", \"other_pollution\", \"nothing_wrong\"]. "
        "Provide severity as an integer from 1 to 5, and a one-line plain-English description. "
        "Reply as JSON only: {\"issue\": \"...\", \"severity\": 1-5, \"description\": \"...\"}"
    )

    messages = [
        {
            "role": "user",
            "content": [
                {
                    "image": {
                        "format": "jpeg",
                        "source": {
                            "bytes": image_bytes
                        }
                    }
                },
                {
                    "text": prompt
                }
            ]
        }
    ]

    try:
        response = client.converse(
            modelId=MODEL_ID,
            messages=messages,
            inferenceConfig={
                "maxTokens": 300,
                "temperature": 0.1,
                "topP": 0.9
            }
        )
    except (ClientError, BotoCoreError) as err:
        print(f"\n[Bedrock Error] Call to Bedrock converse failed: {err}", file=sys.stderr)
        raise

    output_message = response.get("output", {}).get("message", {})
    content_blocks = output_message.get("content", [])
    response_text = ""
    for block in content_blocks:
        if "text" in block:
            response_text += block["text"]

    print("\nRaw model response:")
    print(response_text)

    parsed = parse_and_validate_photo_response(response_text)
    return parsed

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(script_dir, "Fish-kills-800px.jpg"),
        os.path.join(os.getcwd(), "Fish-kills-800px.jpg"),
        os.path.join(script_dir, "test.jpg"),
        os.path.join(os.getcwd(), "test.jpg"),
        os.path.join(script_dir, "test.jpeg"),
        os.path.join(os.getcwd(), "backend", "scripts", "test.jpg")
    ]
    
    test_image = None
    for cand in candidates:
        if os.path.isfile(cand):
            test_image = cand
            break

    if not test_image:
        print("Error: Could not locate 'test.jpg'. Please place a test image in backend/scripts/test.jpg", file=sys.stderr)
        sys.exit(1)

    print(f"Reading test image from: {test_image} ({os.path.getsize(test_image)} bytes)")
    
    try:
        result = analyze_photo(test_image)
        print("\n=== Parsed JSON Output ===")
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"\nFailed to execute Bedrock converse test: {e}", file=sys.stderr)
        session = boto3.Session()
        creds = session.get_credentials()
        if not creds:
            print("\nNote: No AWS credentials detected. To run this script against live AWS Bedrock, set:")
            print("  - AWS_ACCESS_KEY_ID")
            print("  - AWS_SECRET_ACCESS_KEY")
            print("  - AWS_DEFAULT_REGION (or us-east-1)")
            print("or configure using `aws configure`.")

if __name__ == "__main__":
    main()
