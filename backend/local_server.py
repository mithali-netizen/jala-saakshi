#!/usr/bin/env python3
"""
local_server.py
Zero-dependency local HTTP server for local frontend development and testing.
Runs on http://localhost:8787 and forwards POST /analyze-photo and POST /draft-complaint
directly to the respective AWS Lambda handler functions with CORS support for local Vite development.

Usage:
  python backend/local_server.py
  (Set MOCK_BEDROCK=false to run against real Bedrock if AWS credentials exist)
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

# Set default mock mode for zero-cost local dev if not specified
if "MOCK_BEDROCK" not in os.environ:
    os.environ["MOCK_BEDROCK"] = "true"

# Ensure backend directory is in sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.src.analyze_photo import lambda_handler as analyze_photo_handler
from backend.src.draft_complaint import lambda_handler as draft_complaint_handler

HOST = os.environ.get("LOCAL_HOST", "127.0.0.1")
PORT = int(os.environ.get("LOCAL_PORT", "8787"))
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.environ.get(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174",
    ).split(",")
    if origin.strip()
}

class LocalApiHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS, GET")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Amz-Date, X-Api-Key")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        """Health check endpoint."""
        parsed_url = urlparse(self.path)
        if parsed_url.path == "/health" or parsed_url.path == "/":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "status": "healthy",
                "mock_bedrock": os.environ.get("MOCK_BEDROCK", "true"),
                "endpoints": ["/analyze-photo", "/draft-complaint"]
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        # Read body
        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            content_length = 0

        raw_bytes = self.rfile.read(content_length) if content_length > 0 else b""
        body_str = raw_bytes.decode("utf-8", errors="replace")

        # Mock API Gateway HTTP proxy event
        event = {
            "version": "2.0",
            "routeKey": f"POST {path}",
            "rawPath": path,
            "rawQueryString": parsed_url.query,
            "headers": dict(self.headers),
            "requestContext": {
                "http": {
                    "method": "POST",
                    "path": path,
                    "protocol": "HTTP/1.1",
                    "sourceIp": self.client_address[0]
                }
            },
            "body": body_str,
            "isBase64Encoded": False
        }

        # Dispatch to handlers
        if path == "/analyze-photo":
            res = analyze_photo_handler(event, None)
        elif path == "/draft-complaint":
            res = draft_complaint_handler(event, None)
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Path not found: {path}"}).encode("utf-8"))
            return

        status_code = res.get("statusCode", 200)
        self.send_response(status_code)
        self._send_cors_headers()
        
        # Add custom headers from handler
        for k, v in res.get("headers", {}).items():
            if k.lower() not in ("access-control-allow-origin", "access-control-allow-methods", "access-control-allow-headers"):
                self.send_header(k, v)
        self.end_headers()

        response_body = res.get("body", "{}")
        if isinstance(response_body, str):
            self.wfile.write(response_body.encode("utf-8"))
        else:
            self.wfile.write(json.dumps(response_body).encode("utf-8"))

def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, LocalApiHandler)
    mock_status = os.environ.get("MOCK_BEDROCK", "true")
    print(f"============================================================")
    print(f" KSPCB Pollution Reporting Backend Dev Server running on:")
    print(f" -> http://localhost:{PORT}")
    print(f" -> Mode: MOCK_BEDROCK={mock_status}")
    print(f" -> Endpoints: POST /analyze-photo, POST /draft-complaint")
    print(f" -> CORS enabled for: {', '.join(sorted(ALLOWED_ORIGINS))}")
    print(f"============================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local server...")
        httpd.server_close()

if __name__ == "__main__":
    run_server()
