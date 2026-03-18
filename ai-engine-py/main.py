from __future__ import annotations

import os
import re
from typing import List, Optional

import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="AI Content Engine", version="1.0.0")


class GenerateMaterialRequest(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    title: Optional[str] = None
    num_questions: int = 5


class MaterialResponse(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    flashcards: List[dict]


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-engine"}


@app.post("/api/v1/generate-course-material", response_model=MaterialResponse)
def generate_course_material(payload: GenerateMaterialRequest):
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

    title = payload.title or infer_title(cleaned)
    summary = simple_summary(cleaned)
    key_points = extract_key_points(cleaned)
    flashcards = generate_flashcards(key_points)

    return MaterialResponse(
        title=title,
        summary=summary,
        key_points=key_points,
        flashcards=flashcards,
    )


def scrape_url(url: str) -> str:
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    return "\n".join(paragraphs)


def normalize_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def infer_title(text: str) -> str:
    words = text.split()
    return " ".join(words[:8]) + ("..." if len(words) > 8 else "")


def simple_summary(text: str) -> str:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return " ".join(sentences[:4]).strip()


def extract_key_points(text: str) -> List[str]:
    sentences = re.split(r"(?<=[.!?])\s+", text)
    points = []
    for sentence in sentences:
        if len(points) >= 6:
            break
        sentence = sentence.strip()
        if 40 <= len(sentence) <= 160:
            points.append(sentence)
    if not points:
        points = sentences[:4]
    return [p.strip() for p in points if p.strip()]


def generate_flashcards(points: List[str]) -> List[dict]:
    cards = []
    for point in points:
        term = " ".join(point.split()[:4])
        cards.append({"term": term, "definition": point})
    return cards
