from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    return "\n".join(paragraphs)


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
    response = requests.post(
        GEMINI_API_URL,
        params={"key": GEMINI_API_KEY},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "responseMimeType": "application/json",
            },
        },
        timeout=45,
    )
    if response.status_code >= 400:
        raise HTTPException(
            status_code=502,
            detail=f"Gemini request failed: {response.text[:300]}",
        )

    payload = response.json()
    text_output = extract_gemini_text(payload)
    if not text_output:
        raise HTTPException(status_code=502, detail="Gemini returned no usable content")

    try:
        parsed = json.loads(strip_json_fence(text_output))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned invalid JSON: {exc}") from exc

    return validate_material_payload(parsed, num_questions)


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
