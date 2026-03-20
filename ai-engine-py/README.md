# AI Engine (Python + FastAPI)

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY=your-gemini-api-key
export GEMINI_MODEL=gemini-1.5-flash
uvicorn main:app --reload --port 8000
```

## API

- `POST /api/v1/generate-course-material`

Payload:

```json
{
  "url": "https://example.com/article",
  "text": null,
  "title": "Optional override",
  "num_questions": 5
}
```

## Notes

- The engine uses the Gemini REST API.
- `GEMINI_API_KEY` is required.
- `GEMINI_MODEL` defaults to `gemini-1.5-flash`.
