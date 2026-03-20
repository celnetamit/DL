from __future__ import annotations

import json
import os
import re
import socket
import time
from datetime import datetime, timezone
from ipaddress import ip_address
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="AI Content Engine", version="2.0.0")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
GEMINI_API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
)
MAX_SOURCE_BYTES = 1_000_000
MAX_REDIRECTS = 3
ALLOWED_CONTENT_TYPES = ("text/html", "text/plain", "application/xhtml+xml")
GEMINI_RETRY_DELAYS = (0.5, 1.5)


class GenerateMaterialRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    title: Optional[str] = None
    num_questions: int = 5


class Flashcard(BaseModel):
    term: str
    definition: str


class MaterialResponse(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    flashcards: List[Flashcard]
    provider: str = Field(default="gemini")
    model: str = Field(default=GEMINI_MODEL)
    prompt_version: str = Field(default="v2")
    generated_at: str


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-engine",
        "provider": "gemini",
        "model": GEMINI_MODEL,
        "configured": bool(GEMINI_API_KEY),
    }


@app.post("/api/v1/generate-course-material", response_model=MaterialResponse)
def generate_course_material(payload: GenerateMaterialRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="Gemini API is not configured")

    content = ""
    if payload.text:
        content = payload.text
    elif payload.url:
        content = scrape_url(payload.url)
    else:
        raise HTTPException(status_code=400, detail="url or text is required")

    cleaned = normalize_text(content)
    if not cleaned:
        raise HTTPException(status_code=422, detail="no usable content found")

    result = generate_with_gemini(cleaned, payload.title, payload.num_questions)
    return MaterialResponse(**result)


def scrape_url(url: str) -> str:
    resp = fetch_safe_url(url)
    soup = BeautifulSoup(resp, "html.parser")
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    return "\n".join(paragraphs)


def fetch_safe_url(url: str) -> str:
    current_url = validate_public_url(url)
    session = requests.Session()

    for _ in range(MAX_REDIRECTS + 1):
        try:
            response = session.get(
                current_url,
                timeout=15,
                allow_redirects=False,
                stream=True,
                headers={"User-Agent": "DigitalLibrary-AIEngine/1.0"},
            )
        except requests.RequestException as exc:
            raise HTTPException(status_code=422, detail=f"failed to fetch source url: {exc}") from exc

        if 300 <= response.status_code < 400:
            location = response.headers.get("Location", "").strip()
            if not location:
                raise HTTPException(status_code=422, detail="source url redirect did not include a location")
            current_url = validate_public_url(urljoin(current_url, location))
            continue

        if response.status_code >= 400:
            raise HTTPException(status_code=422, detail=f"source url returned status {response.status_code}")

        content_type = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
        if content_type and content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(status_code=422, detail="source url returned an unsupported content type")

        chunks: List[bytes] = []
        total = 0
        try:
            for chunk in response.iter_content(chunk_size=8192):
                if not chunk:
                    continue
                total += len(chunk)
                if total > MAX_SOURCE_BYTES:
                    raise HTTPException(status_code=422, detail="source url content is too large")
                chunks.append(chunk)
        finally:
            response.close()

        encoding = response.encoding or response.apparent_encoding or "utf-8"
        return b"".join(chunks).decode(encoding, errors="replace")

    raise HTTPException(status_code=422, detail="source url exceeded redirect limit")


def validate_public_url(raw_url: str) -> str:
    parsed = urlparse(raw_url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=422, detail="source url must use http or https")
    if not parsed.netloc or not parsed.hostname:
        raise HTTPException(status_code=422, detail="source url must include a valid hostname")
    if parsed.username or parsed.password:
        raise HTTPException(status_code=422, detail="source url must not include credentials")

    hostname = parsed.hostname.strip().lower()
    if hostname in {"localhost", "127.0.0.1", "::1"}:
        raise HTTPException(status_code=422, detail="source url host is not allowed")

    try:
        address_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(status_code=422, detail=f"source url hostname could not be resolved: {exc}") from exc

    for entry in address_info:
        resolved_ip = entry[4][0]
        ip_obj = ip_address(resolved_ip)
        if (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
        ):
            raise HTTPException(status_code=422, detail="source url resolves to a non-public network")

    return parsed.geturl()


def normalize_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def build_prompt(text: str, title: Optional[str], num_questions: int) -> str:
    requested_title = title or "Infer a concise educational title from the source text"
    return f"""
You are an educational content generator for a digital library platform.

Read the provided source text and produce structured study material.

Requirements:
- Return valid JSON only.
- Use this exact shape:
{{
  "title": "string",
  "summary": "string",
  "key_points": ["string"],
  "flashcards": [{{"term": "string", "definition": "string"}}]
}}
- "title" should be concise and learner-friendly.
- "summary" should be 2 to 4 sentences.
- "key_points" should contain 4 to 6 high-signal bullet points.
- "flashcards" should contain exactly {max(3, min(num_questions, 8))} items.
- Keep the output factual and based only on the source.
- Do not include markdown fences or commentary.

Preferred title instruction: {requested_title}

Source text:
{text[:18000]}
""".strip()


def generate_with_gemini(text: str, title: Optional[str], num_questions: int) -> dict:
    prompt = build_prompt(text, title, num_questions)
    response = post_to_gemini(prompt)

    payload = response.json()
    blocked_reason = extract_gemini_block_reason(payload)
    if blocked_reason:
        raise HTTPException(status_code=502, detail=blocked_reason)

    text_output = extract_gemini_text(payload)
    if not text_output:
        raise HTTPException(status_code=502, detail="Gemini returned no usable content")

    try:
        parsed = json.loads(strip_json_fence(text_output))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {exc}") from exc

    return validate_material_payload(parsed, num_questions)


def post_to_gemini(prompt: str) -> requests.Response:
    request_json = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json",
        },
    }

    last_error: Optional[Exception] = None
    attempt_count = len(GEMINI_RETRY_DELAYS) + 1
    for attempt in range(attempt_count):
        try:
            response = requests.post(
                GEMINI_API_URL,
                params={"key": GEMINI_API_KEY},
                json=request_json,
                timeout=45,
            )
        except requests.RequestException as exc:
            last_error = exc
            if attempt < len(GEMINI_RETRY_DELAYS):
                time.sleep(GEMINI_RETRY_DELAYS[attempt])
                continue
            raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

        if should_retry_gemini_response(response.status_code) and attempt < len(GEMINI_RETRY_DELAYS):
            time.sleep(GEMINI_RETRY_DELAYS[attempt])
            continue

        if response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=format_gemini_http_error(response),
            )

        return response

    raise HTTPException(status_code=502, detail=f"Gemini request failed: {last_error}")


def should_retry_gemini_response(status_code: int) -> bool:
    return status_code == 429 or 500 <= status_code < 600


def format_gemini_http_error(response: requests.Response) -> str:
    raw_text = response.text[:300]
    try:
        payload = response.json()
    except ValueError:
        return f"Gemini request failed with status {response.status_code}: {raw_text}"

    details: List[str] = []
    error = payload.get("error") or {}
    message = str(error.get("message") or "").strip()
    status = str(error.get("status") or "").strip()
    if status:
        details.append(status)
    if message:
        details.append(message)
    if not details and raw_text:
        details.append(raw_text)
    joined = ": ".join(details) if details else f"status {response.status_code}"
    return f"Gemini request failed with status {response.status_code}: {joined}"


def extract_gemini_block_reason(payload: dict) -> str:
    prompt_feedback = payload.get("promptFeedback") or {}
    block_reason = str(prompt_feedback.get("blockReason") or "").strip()
    if block_reason:
        return f"Gemini blocked the prompt: {block_reason}"

    candidates = payload.get("candidates") or []
    for candidate in candidates:
        finish_reason = str(candidate.get("finishReason") or "").strip()
        if finish_reason in {"SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT", "RECITATION", "SPII"}:
            return f"Gemini stopped generation due to {finish_reason.lower().replace('_', ' ')}"

        safety_ratings = candidate.get("safetyRatings") or []
        blocked_categories = []
        for rating in safety_ratings:
            if not isinstance(rating, dict):
                continue
            probability = str(rating.get("probability") or "").strip().upper()
            blocked = rating.get("blocked")
            if blocked or probability in {"HIGH", "MEDIUM", "MEDIUM_AND_ABOVE"}:
                category = str(rating.get("category") or "UNKNOWN").strip()
                blocked_categories.append(category)
        if blocked_categories:
            categories = ", ".join(blocked_categories[:3])
            return f"Gemini safety filters blocked or flagged the response: {categories}"

    return ""


def extract_gemini_text(payload: dict) -> str:
    candidates = payload.get("candidates") or []
    for candidate in candidates:
      content = candidate.get("content") or {}
      parts = content.get("parts") or []
      for part in parts:
          text = part.get("text")
          if text:
              return text
    return ""


def strip_json_fence(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    return cleaned


def validate_material_payload(payload: Dict[str, Any], num_questions: int) -> dict:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="Gemini returned an unexpected response shape")

    title = str(payload.get("title") or "").strip()
    summary = str(payload.get("summary") or "").strip()
    if not title:
        title = "AI Generated Lesson"
    if not summary:
        raise HTTPException(status_code=502, detail="Gemini returned no usable summary")

    key_points_raw = payload.get("key_points")
    if not isinstance(key_points_raw, list):
        key_points_raw = []
    key_points = [str(item).strip() for item in key_points_raw if str(item).strip()]
    if len(key_points) < 3:
        key_points = split_summary_into_key_points(summary)
    if len(key_points) < 3:
        raise HTTPException(status_code=502, detail="Gemini returned too few key points")
    key_points = key_points[:6]

    flashcards_raw = payload.get("flashcards")
    if not isinstance(flashcards_raw, list):
        flashcards_raw = []
    flashcards = normalize_flashcards(flashcards_raw)
    target_flashcards = max(3, min(num_questions, 8))
    if len(flashcards) < 2:
        flashcards = build_fallback_flashcards(title, key_points, summary, target_flashcards)
    if len(flashcards) < 2:
        raise HTTPException(status_code=502, detail="Gemini returned too few usable flashcards")
    flashcards = flashcards[:target_flashcards]

    return {
        "title": title,
        "summary": summary,
        "key_points": key_points,
        "flashcards": flashcards,
        "provider": "gemini",
        "model": GEMINI_MODEL,
        "prompt_version": "v2",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def split_summary_into_key_points(summary: str) -> List[str]:
    parts = re.split(r"(?<=[.!?])\s+", summary)
    normalized = [part.strip(" -") for part in parts if part.strip()]
    return normalized[:4]


def normalize_flashcards(flashcards_raw: List[Any]) -> List[Dict[str, str]]:
    normalized: List[Dict[str, str]] = []
    for item in flashcards_raw:
        if not isinstance(item, dict):
            continue
        term = str(item.get("term") or "").strip()
        definition = str(item.get("definition") or "").strip()
        if term and definition:
            normalized.append({"term": term, "definition": definition})
    return normalized


def build_fallback_flashcards(title: str, key_points: List[str], summary: str, count: int) -> List[Dict[str, str]]:
    fallback: List[Dict[str, str]] = []
    fallback.append({"term": title, "definition": summary[:240].strip()})
    for idx, point in enumerate(key_points[: max(1, count - 1)], start=1):
        fallback.append({"term": f"Key Point {idx}", "definition": point})
    seen = set()
    unique_cards: List[Dict[str, str]] = []
    for card in fallback:
        signature = (card["term"], card["definition"])
        if signature in seen:
            continue
        seen.add(signature)
        unique_cards.append(card)
    return unique_cards[:count]
