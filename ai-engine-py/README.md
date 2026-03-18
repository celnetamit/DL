# AI Engine (Python + FastAPI)

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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
