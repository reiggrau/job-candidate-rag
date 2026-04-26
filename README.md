# AI-Powered Job-to-Candidate Matching Demo

Demonstrates AI-powered matching between job descriptions and candidate profiles using a hybrid RAG pipeline.

---

## Tech Stack

| Layer      | Choice                            | Reason                                                          |
| ---------- | --------------------------------- | --------------------------------------------------------------- |
| Backend    | Python + FastAPI                  | Async-native, clean DX                                          |
| Vector DB  | Qdrant                            | Native hybrid search (dense + sparse)                           |
| Embeddings | `text-embedding-3-large` (OpenAI) | Best retrieval quality; fallback: `nomic-embed-text` via Ollama |
| LLM        | GPT-4.1 or Claude Sonnet          | Normalization + reranking                                       |
| Frontend   | React + TailwindCSS               | Minimal results UI                                              |

---

## Pipeline Architecture

### INGESTION (run once, or on new profiles)

1. Load raw candidate profiles — mixed formats (JSON, plain text, PDF) and languages (EN/ES)
2. **LLM normalization pass** — convert each profile into a standardized JSON schema + clean English prose summary
3. **Embed** the prose summary as a single dense vector (`text-embedding-3-large`, 3072 dims)
4. **Extract sparse keywords** (skills, job titles, technologies) for BM25
5. **Index in Qdrant** — both dense and sparse vectors + metadata fields

### QUERY (per job description search)

1. Accept raw job description (any format, any language)
2. **LLM normalization pass** — extract same structured schema from the JD
3. **Embed** normalized JD prose summary
4. **Extract sparse keywords** from normalized JD
5. **Hybrid search** — Reciprocal Rank Fusion (RRF) combining dense + sparse results
6. **Metadata pre-filters** — seniority, location, sector (applied before semantic search)
7. **LLM reranker** — score and explain top-20 results against the JD
8. Return **top-5 candidates** with match score and human-readable reasoning

---

## Normalized Profile Schema

Applies to both candidate profiles and job descriptions (the symmetric design is intentional).

```json
{
	"name": "string — candidate's full name, or hiring company name for job postings",
	"summary": "string — clean English prose paragraph, dense with skills and context, used for embedding",
	"role": "string",
	"seniority": "junior | mid | senior | lead | executive",
	"years_experience": "number",
	"sector": ["string"],
	"hard_skills": ["string — exact technology/tool names"],
	"soft_skills": ["string"],
	"languages": ["string"],
	"location": "string",
	"open_to_remote": "boolean",
	"education": "string"
}
```

---

## Project Structure

```
job-candidate-rag/
├── backend/
│   ├── main.py          # FastAPI app and endpoints
│   ├── ingestion.py     # Load, normalize, embed, and index profiles
│   ├── retrieval.py     # Hybrid search + metadata filtering
│   ├── reranker.py      # LLM rerank + match explanation
│   ├── normalizer.py    # LLM normalization prompts for profiles and JDs
│   ├── models.py        # Pydantic schemas
│   └── config.py        # API keys, model names, Qdrant settings
├── frontend/
│   └── ...              # React + TailwindCSS — JD input + ranked results
├── data/
│   ├── sample_profiles/ # Mock candidate profiles (mixed formats and languages)
│   └── sample_jobs/     # Mock job descriptions (mixed formats and languages)
├── docker-compose.yml   # Qdrant + backend + frontend
└── README.md
```

---

## Key Design Decisions (interview-ready explanations)

**Why LLM normalization?**
Raw profiles arrive in any format and language. Normalization bridges that variance so the rest of the pipeline operates on a clean, consistent schema. Without it, a Spanish CV and an English LinkedIn export would be incomparable.

**Why hybrid search (dense + sparse)?**
Dense vectors capture semantic similarity but can conflate terms like "Java" and "JavaScript". Sparse BM25 handles exact keyword matching. RRF fusion gives you the best of both: semantic understanding + term precision.

**Why metadata pre-filtering?**
Filtering by seniority or location before the semantic search eliminates obviously wrong matches cheaply, without burning embedding distance budget on irrelevant candidates.

**Why an LLM reranker?**
The vector search returns the closest vectors — not necessarily the best business matches. The reranker reads the actual JD and profile text, scores fit holistically, and produces a human-readable explanation. This makes results trustworthy and debuggable.

**Why one schema for candidates and JDs?**
The pipeline is symmetric. Normalization, embedding, and search don't need to know which side they're processing. Swapping candidates for recruiters requires only changing the data and schema — not the pipeline logic.

---

## Build Steps (in order)

### Step 1 — Scaffold + Docker Compose ✅

#### 1.1 — Install Docker Desktop

Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your OS.

**Windows — common install error:**
If you see `"For security reasons C:\ProgramData\DockerDesktop must be owned by an elevated account"`, do the following:

1. Delete the `C:\ProgramData\DockerDesktop` directory
2. Open PowerShell **as Administrator**
3. Navigate to the folder containing the installer
4. Run:

```powershell
Start-Process 'Docker Desktop Installer.exe' -Wait install
```

**Windows Subsystem for Linux (WSL):**
During installation you may be prompted to install WSL. Accept it — Docker Desktop on Windows runs containers inside a lightweight Linux VM via WSL2. Without it, Linux-based images (Python, Node, Qdrant) won't run. If you need to install it manually:

```powershell
wsl --install
```

Then restart your machine before continuing.

---

#### 1.2 — Create the folder structure

```
job-candidate-rag/
├── backend/
│   ├── config.py
│   ├── ingestion.py
│   ├── main.py
│   ├── models.py
│   ├── normalizer.py
│   ├── reranker.py
│   └── retrieval.py
├── frontend/          ← stub for now; replaced in Step 10
├── data/
│   ├── sample_profiles/
│   └── sample_jobs/
├── docker-compose.yml
└── README.md
```

---

#### 1.3 — `docker-compose.yml`

Defines three services that run together on a private Docker bridge network:

```yaml
# docker-compose.yml
services:
  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - '6333:6333' # REST API — used by qdrant-client in Python
      - '6334:6334' # gRPC — optional, but good to expose
    volumes:
      - qdrant_data:/qdrant/storage # persist indexed data

  backend:
    build: ./backend
    ports:
      - '8000:8000'
    env_file:
      - .env # injects OPENAI_API_KEY etc. at runtime
    depends_on:
      - qdrant
    environment:
      - QDRANT_URL=http://qdrant:6333 # 'qdrant' resolves inside Docker network

  frontend:
    build: ./frontend
    ports:
      - '5173:5173'
    depends_on:
      - backend

volumes:
  qdrant_data: # named volume — survives docker compose down
```

Key points:

- `depends_on` ensures Qdrant starts before the backend, backend before the frontend
- The backend uses `http://qdrant:6333` (not `localhost`) because inside Docker, containers reach each other by **service name**
- `env_file: .env` keeps secrets out of the compose file
- The `qdrant_data` named volume means `docker compose down` won't wipe your indexed vectors

---

#### 1.4 — `.env` file

Create `.env` at the project root (never commit this):

```bash
# .env (project root — never commit)
OPENAI_API_KEY=sk-...
QDRANT_COLLECTION=candidates
EMBEDDING_MODEL=text-embedding-3-large
LLM_MODEL=gpt-4.1
```

`QDRANT_URL` is intentionally omitted — `config.py` defaults to `http://localhost:6333` for local dev. Docker Compose injects `QDRANT_URL=http://qdrant:6333` via its `environment:` block, so each context gets the right value automatically.

---

#### 1.5 — `backend/Dockerfile`

```dockerfile
# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

---

#### 1.6 — `backend/requirements.txt`

```
# backend/requirements.txt
fastapi
uvicorn[standard]
pydantic
pydantic-settings
openai
qdrant-client[fastembed]
python-dotenv
pdfplumber
```

---

#### 1.7 — `frontend/Dockerfile` (stub)

A placeholder until the React app is scaffolded in Step 10. Without this file, `docker compose up --build` fails because the `build: ./frontend` directive expects a `Dockerfile` to exist.

```dockerfile
# frontend/Dockerfile (stub)
FROM node:20-alpine

WORKDIR /app

RUN echo '<!DOCTYPE html><html><body><h1>Frontend coming soon</h1></body></html>' > index.html
RUN npm install -g serve

EXPOSE 5173

CMD ["serve", "-l", "5173", "."]
```

---

#### 1.8 — Start the stack

```bash
docker compose up --build
```

`--build` forces Docker to rebuild images from the Dockerfiles. Omit it on subsequent runs when nothing has changed. Once running, verify Qdrant is healthy:

```bash
curl http://localhost:6333/healthz
# → healthz check passed

# For version info (JSON):
curl http://localhost:6333/
# → {"title":"qdrant - version 1.x.x","version":"1.x.x","commit":"..."}
```

The Qdrant **built-in web dashboard** is available at [`http://localhost:6333/dashboard`](http://localhost:6333/dashboard) while Docker is running. From there you can:

- See both `candidates` and `jobs` collections with their point counts
- Browse individual points (vectors + payload)
- Run ad-hoc searches and filter queries visually

### Step 2 — `config.py` + `models.py` ✅

These two files are the foundation every other module imports from. Write them first so nothing else has to hardcode strings or repeat type definitions.

---

#### 2.1 — `backend/config.py`

`pydantic-settings` extends Pydantic to read fields directly from environment variables (or a `.env` file). You declare a class and values are populated at import time — no manual `os.getenv()` calls scattered across the codebase.

```python
# backend/config.py
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).parent.parent / ".env"

class Settings(BaseSettings):
    openai_api_key: str
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "candidates"
    jobs_collection: str = "jobs"
    embedding_model: str = "text-embedding-3-large"
    llm_model: str = "gpt-4.1"

    model_config = SettingsConfigDict(env_file=_ENV_FILE, extra="ignore")

settings = Settings()
```

Key points:

- `BaseSettings` maps env var names to fields automatically (case-insensitive). `OPENAI_API_KEY` in `.env` → `settings.openai_api_key`.
- Fields with no default (e.g. `openai_api_key`) raise a `ValidationError` at startup if missing — fail fast, not silently.
- Fields with defaults (e.g. `qdrant_url`) are safe to omit from `.env`, useful for local dev where Qdrant runs on `localhost` rather than the Docker service name.
- `extra="ignore"` means unrecognised env vars (`PATH`, `HOME`, etc.) don't cause errors.
- `_ENV_FILE` anchors the `.env` path to the project root via `Path(__file__).parent.parent`. Using a plain `".env"` string resolves relative to the **working directory**, which causes a `ValidationError` when uvicorn is started from inside the `backend/` folder.
- The module-level `settings = Settings()` means all other modules do `from config import settings` — one import, no repeated instantiation.

---

#### 2.2 — `backend/models.py`

Three Pydantic models cover all data shapes in the pipeline.

```python
# backend/models.py
from pydantic import BaseModel
from typing import Optional, Literal

class NormalizedProfile(BaseModel):
    name: Optional[str] = None            # candidate's full name or hiring company name
    summary: str                          # clean English prose — used for embedding
    role: Optional[str] = None
    seniority: Optional[str] = None       # junior | mid | senior | lead | executive
    years_experience: float               # required — estimate from career dates if not explicit
    sector: list[str] = []
    hard_skills: list[str] = []           # exact tool/technology names
    soft_skills: list[str] = []
    languages: list[str] = []
    location: Optional[str] = None
    open_to_remote: Optional[bool] = None
    education: Optional[str] = None


class SearchRequest(BaseModel):
    query_text: str                          # raw CV or JD text — any format, any language
    direction: Literal["job_to_candidate", "candidate_to_job"] = "job_to_candidate"
    filters: Optional[dict] = None           # optional metadata pre-filters


class MatchResult(BaseModel):
    candidate_id: str
    name: Optional[str] = None
    score: float                      # 0.0 – 1.0, assigned by LLM reranker
    reasoning: str                    # LLM-generated explanation
    matched_skills: list[str]
    profile: NormalizedProfile
```

Key points:

- `NormalizedProfile` is used for **both** candidates and job descriptions. The `name` field holds the candidate's full name for profiles, or the hiring company name (e.g. `"NTT Data"`, `"Clio"`) for job postings — `null` if not stated. This symmetry is what makes the pipeline reversible: the same embedding and retrieval code works in both directions.
- `summary` is the field that gets embedded. It must be a dense, skill-rich English paragraph — not a JSON dump. The LLM normalization step (Step 3) is responsible for writing it well.
- `hard_skills` stores **exact, canonical names** (`"PostgreSQL"`, not `"databases"`) because these feed the sparse BM25 index, which depends on term-level matching. Skill expansion (implied and similar skills) is handled separately in `skills.py` (see Step 5).
- `SearchRequest.direction` controls which collection is searched and which normalizer is called: `"job_to_candidate"` embeds a JD and searches the `candidates` collection; `"candidate_to_job"` embeds a CV and searches the `jobs` collection. The default is `"job_to_candidate"`.
- `SearchRequest.filters` is a free-form dict for now — Step 6 defines valid keys (e.g. `{"seniority": "senior", "location": "Barcelona"}`).
- `MatchResult.score` comes from the LLM reranker in Step 7, not from vector distance. Vector distance ranks candidates; the LLM scores them on business fit.

#### Few-shot examples (also in `models.py`)

`models.py` also defines canonical example instances used to few-shot the LLM prompts in `normalizer.py`. They are defined as actual `NormalizedProfile` objects — not raw JSON strings — so they are structurally tied to the schema. If a field is added or renamed, Python raises a `TypeError` at import time rather than silently producing a malformed prompt.

```python
# backend/models.py
PROFILE_EXAMPLE_INPUT = """María López
Desarrolladora Backend Senior | Barcelona
10 años de experiencia en Python, Django y PostgreSQL.
Actualmente en Glovo trabajando en microservicios con Kafka y Docker.
Habla español e inglés. Máster en Informática, UPC 2014."""

PROFILE_EXAMPLE_OUTPUT = NormalizedProfile(
    name="María López",
    summary=(
        "Senior backend engineer with 10 years of experience developing Python-based "
        "microservices and REST APIs, with deep expertise in Django, PostgreSQL, Kafka, "
        "and Docker. Currently working in a high-scale food delivery environment. "
        "Based in Barcelona, fluent in Spanish and English."
    ),
    role="Senior Backend Developer",
    seniority="senior",
    years_experience=10,
    sector=["food delivery", "e-commerce"],
    hard_skills=["Python", "Django", "PostgreSQL", "Kafka", "Docker"],
    soft_skills=[],
    languages=["Spanish", "English"],
    location="Barcelona",
    open_to_remote=False,
    education="Master's in Computer Science, UPC, 2014",
)
```

In `normalizer.py`, the example is rendered at import time via `.model_dump_json()` and prepended to the user message — never the system prompt, which is how the model is trained to interpret few-shot examples:

```python
# backend/normalizer.py
_PROFILE_FEW_SHOT = (
    f"--- EXAMPLE INPUT ---\n{PROFILE_EXAMPLE_INPUT}\n\n"
    f"--- EXAMPLE OUTPUT ---\n{PROFILE_EXAMPLE_OUTPUT.model_dump_json(indent=2)}\n"
    "--- END EXAMPLE ---\n\nNow extract from the following input:\n"
)

# Used in the LLM call:
messages=[
    {"role": "system", "content": PROFILE_SYSTEM_PROMPT},
    {"role": "user",   "content": _PROFILE_FEW_SHOT + raw_text},
]
```

The example is intentionally in **Spanish** — a different language from the English output — to specifically exercise the translation + normalization path, which is the hardest case.

---

#### 2.3 — How they connect to the rest of the pipeline

```
.env
  └─► config.py (Settings)
           ├─► normalizer.py   (openai_api_key, llm_model)
           ├─► ingestion.py    (qdrant_url, embedding_model, qdrant_collection, jobs_collection)
           └─► retrieval.py    (qdrant_url, qdrant_collection, jobs_collection)

models.py (NormalizedProfile, SearchRequest, MatchResult)
           ├─► normalizer.py   returns NormalizedProfile
           ├─► ingestion.py    receives NormalizedProfile
           ├─► retrieval.py    returns List[MatchResult]
           ├─► reranker.py     returns List[MatchResult]
           └─► main.py         request/response types on endpoints
```

### Step 3 — `normalizer.py` ✅

#### 3.1 — What this module does and why

Raw candidate profiles and job descriptions arrive in any format (plain text, JSON, PDF-extracted text) and any language. Before embedding or comparing them, everything must be converted to a **consistent, clean, English schema**.

This module exposes two public functions:

```python
# backend/normalizer.py
normalize_profile(raw_text: str)          → NormalizedProfile
normalize_job_description(raw_text: str)  → NormalizedProfile
```

Both return the same `NormalizedProfile` type — the symmetric design means the rest of the pipeline doesn't need to know which side it's processing. This symmetry is also what makes the search reversible: `normalize_job_description` is used when the query is a JD (searching for candidates), and `normalize_profile` is used when the query is a CV (searching for matching jobs). Both outputs are embedded and searched against the appropriate Qdrant collection.

---

#### 3.2 — Why `temperature=0`

This is **extraction**, not generation. There is a correct answer (what the CV or JD actually says) and you want it every time, not creative paraphrasing. `temperature=0` makes the model as deterministic as possible, which also means re-running normalization on the same input produces the same result — important for debugging and re-ingestion.

---

#### 3.3 — Why `response_format={"type": "json_object"}`

Without this, the model may wrap its JSON in markdown fences (` ```json ... ``` `), add commentary, or produce malformed output. This parameter forces the model to output **only** a raw JSON object — no wrapper, no prose — which you can `json.loads()` directly.

> `response_format` guarantees valid JSON syntax but not schema conformance. `NormalizedProfile.model_validate(data)` handles the schema check — if the model gets a type wrong or hallucinates a field, you get a clear `ValidationError` rather than a silent bad record.

---

#### 3.4 — Why inject the schema into the prompt

Instead of describing the schema in prose (which drifts as `models.py` evolves), inject the live schema at module load time:

```python
# backend/normalizer.py
import json
from models import NormalizedProfile

SCHEMA = json.dumps(NormalizedProfile.model_json_schema(), indent=2)
```

`model_json_schema()` returns a full JSON Schema object describing every field, its type, and whether it's required. Pasting this into the system prompt means the model sees exactly what you need — and if you add a field to `NormalizedProfile`, the prompt automatically reflects it on the next run.

---

#### 3.5 — Why impersonal third-person for the `summary` field

Embedding models are sensitive to **register** (the "voice" of text). A first-person CV (`"I built distributed systems"`) and a second-person JD (`"candidate must have built distributed systems"`) describe the same thing but land in slightly different subspaces in the embedding space — not because the semantics differ, but because the linguistic style does.

The standard fix for this is **HyDE** (Hypothetical Document Embeddings) — rewrite the JD as a hypothetical CV at query time, then embed that. It works but costs an extra LLM call per search.

The approach here eliminates the need for HyDE entirely: both prompts instruct the model to write the `summary` in the **same impersonal third-person register**:

```
# backend/normalizer.py — PROFILE_SYSTEM_PROMPT / JD_SYSTEM_PROMPT
# Candidate prompt rule:
- 'summary': write a dense, fluent English paragraph (4–6 sentences) in impersonal
  third-person describing the candidate as a professional. Do NOT use first-person ("I",
  "my") or second-person ("you", "your"). Frame it as a description of a person:
  e.g. "Senior backend engineer with 7 years of experience building financial APIs in
  Python and Go, with deep expertise in PostgreSQL and AWS, based in Barcelona."

# JD prompt rule:
- 'summary': write a dense, fluent English paragraph (4–6 sentences) in impersonal
  third-person describing the ideal candidate as a professional. Do NOT use directives
  ("must have", "we need", "you will") or second-person ("you", "your"). Frame it as
  a description of a person, not a list of requirements.
```

Both sides produce summaries that sound like: _"Senior backend engineer with 7 years..."_ — one describing who exists, the other describing who is wanted. Cosine similarity between them is a genuine semantic comparison, not a style-penalised one.

---

#### 3.6 — Few-shot prompting

The model knows how to extract structured data, but one example dramatically improves consistency on the hardest cases: mixed-language inputs, missing fields, and getting the `summary` register exactly right.

The examples are defined as actual `NormalizedProfile` instances in `models.py` (see Step 2) and rendered at import time via `.model_dump_json()`. This means:

- A schema change that breaks the example raises a `TypeError` at import time, not silently at runtime
- The example JSON is always in sync with the current schema — no manual maintenance

```python
# backend/normalizer.py
# Rendered at import time — always reflects the current schema
_PROFILE_FEW_SHOT = (
    f"--- EXAMPLE INPUT ---\n{PROFILE_EXAMPLE_INPUT}\n\n"
    f"--- EXAMPLE OUTPUT ---\n{PROFILE_EXAMPLE_OUTPUT.model_dump_json(indent=2)}\n"
    "--- END EXAMPLE ---\n\nNow extract from the following input:\n"
)
```

The example is injected into the **user message**, not the system prompt — this is how the model is trained to interpret few-shot examples (system prompt = instructions, user message = input context).

---

#### 3.7 — The full module structure

```python
# backend/normalizer.py
# One private helper — the only thing that differs between
# normalizing a profile vs. a JD is the system prompt and few-shot block.
def _call_llm(system_prompt: str, few_shot: str, raw_text: str) -> NormalizedProfile:
    response = client.chat.completions.create(
        model=settings.llm_model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": few_shot + raw_text},
        ],
    )
    data = json.loads(response.choices[0].message.content)
    return NormalizedProfile.model_validate(data)

# Two thin public wrappers
def normalize_profile(raw_text: str) -> NormalizedProfile:
    return _call_llm(PROFILE_SYSTEM_PROMPT, _PROFILE_FEW_SHOT, raw_text)

def normalize_job_description(raw_text: str) -> NormalizedProfile:
    return _call_llm(JD_SYSTEM_PROMPT, _JD_FEW_SHOT, raw_text)
```

---

#### 3.8 — The `summary` field is the most important thing to get right

This is the only field that gets embedded. The entire semantic search quality depends on it. Compare:

**Bad** (generic, low information density):

> "Experienced software engineer with strong technical skills and good communication. Has worked in multiple companies and knows several programming languages."

**Good** (dense, embeddable, impersonal):

> "Senior backend engineer with 7 years of experience building high-throughput financial APIs in Python and Go. Deep expertise in PostgreSQL, Redis, and Kafka. Has led teams of 4–6 in FinTech and RegTech environments in Barcelona and remotely."

The prompt's `summary` instruction is the single most impactful thing to tune across the whole pipeline.

### Step 4 — Mock data ✅

#### 4.1 — Purpose

The ingestion pipeline needs realistic input to validate the normalizer, the embedding quality, and the end-to-end search. The samples are designed to stress-test specific parts of the pipeline:

- **Mixed formats** — `.txt`, `.json`, and `.pdf` so `ingestion.py` must handle format detection
- **Mixed languages** — Spanish and English to exercise the LLM's translation + normalization path
- **Mixed profile types** — engineers and a designer to test sector/skill diversity and reranker penalty for irrelevant matches
- **Matching JDs** — each JD is written to surface a specific candidate as the expected top result, giving a verifiable end-to-end test

---

#### 4.2 — Sample profiles (`data/sample_profiles/`)

| File                | Language | Format                           | Profile                            |
| ------------------- | -------- | -------------------------------- | ---------------------------------- |
| `elena_garcia.txt`  | Spanish  | Free-text CV                     | Senior Backend Engineer, Madrid    |
| `james_okafor.json` | English  | Structured JSON (LinkedIn-style) | Lead Data Engineer, London         |
| `carla_vidal.txt`   | Spanish  | Narrative bio                    | Senior Product Designer, Barcelona |
| `guillem_reig.pdf`  | English  | PDF (real CV)                    | Full Stack AI Engineer, Barcelona  |

Example — `elena_garcia.txt` (Spanish, free-text, realistic mess):

```
Elena García
Ingeniera de Software Senior | Madrid, España

Glovo — Senior Backend Engineer (2021–presente)
  · Microservicios en Python (FastAPI, Django), Kafka, Redis
  · Despliegues en AWS (ECS, RDS, S3)

Cabify — Backend Developer (2018–2021)
  · APIs REST en Python y Node.js, PostgreSQL, MongoDB

Habilidades: Python, FastAPI, Django, Kafka, Redis, PostgreSQL, AWS, Docker, Kubernetes
Idiomas: Español (nativo), Inglés (C1) | Disponibilidad remota: Sí
```

The JSON profile (`james_okafor.json`) deliberately includes a first-person `summary` field — exactly what the normalizer's impersonal-register prompt is designed to correct.

The PDF (`guillem_reig.pdf`) is a real CV included as an Easter egg for the live demo (see end-to-end test below).

---

#### 4.3 — Sample job descriptions (`data/sample_jobs/`)

| File                                  | Language | Format     | Expected top match |
| ------------------------------------- | -------- | ---------- | ------------------ |
| `senior_backend_engineer.txt`         | English  | Plain text | Elena García       |
| `lead_data_engineer_es.txt`           | Spanish  | Plain text | James Okafor       |
| `ai_fullstack_engineer_laborful.json` | English  | JSON       | Guillem Reig       |

Example — `lead_data_engineer_es.txt` (Spanish JD, should surface an English-CV candidate):

```
Buscamos un Lead Data Engineer para nuestro equipo en Madrid.
Requisitos: 7+ años con Spark, Python, Airflow.
Experiencia con GCP (BigQuery, Dataflow) o AWS.
Espa\u00f1ol fluido imprescindible.
```

This JD is intentionally in Spanish while James Okafor's profile is in English — a direct test that the normalizer's language-agnostic design works end-to-end.

---

#### 4.4 — End-to-end verification

Once the full pipeline is running, expected rankings are:

| JD                                    | Expected #1                                       | Expected low score                    |
| ------------------------------------- | ------------------------------------------------- | ------------------------------------- |
| `senior_backend_engineer.txt`         | Elena García (Python, FastAPI, Kafka, AWS)        | Carla Vidal (wrong sector entirely)   |
| `lead_data_engineer_es.txt`           | James Okafor (Lead, GCP/BigQuery, Spark, dbt)     | Carla Vidal                           |
| `ai_fullstack_engineer_laborful.json` | Guillem Reig (React, TypeScript, Python, AWS, AI) | James Okafor (no AI/frontend overlap) |

Carla appearing as a low scorer is intentional — she'll likely appear in the top-20 vector results (she's in the same embedding neighbourhood as tech professionals) but should be penalised by the LLM reranker for sector mismatch. This is a useful sanity check that the reranker is doing its job.

### Step 5 — `ingestion.py` ✅

#### 5.1 — What this module does

Ingestion is a one-shot pipeline that runs once at setup and again whenever new profiles are added. It has four sequential responsibilities:

```
File on disk
  └─► load_raw_text()       — format detection, extract plain text string
  └─► normalize_profile()   — LLM call → NormalizedProfile
  └─► embed + expand        — dense vector (summary) + weighted sparse keywords
  └─► upsert to Qdrant      — store vectors + metadata payload
```

Each step is independent and can be tested in isolation.

---

#### 5.2 — Format detection: `load_raw_text()`

The normalizer knows nothing about file formats — it receives a plain string. `load_raw_text()` is the only place that knows about `.txt`, `.json`, and `.pdf`:

```python
# backend/ingestion.py
def load_raw_text(path: Path) -> str:
    if path.suffix == ".pdf":
        with pdfplumber.open(path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    elif path.suffix == ".json":
        # Re-serialise to normalised string — consistent whitespace regardless of source
        return json.dumps(json.loads(path.read_text(encoding="utf-8")), indent=2)
    else:
        return path.read_text(encoding="utf-8")
```

The `.json` branch deserialises and re-serialises rather than reading the raw string — this normalises inconsistent whitespace and key ordering before it reaches the LLM.

---

#### 5.3 — Embedding the summary: `embed()`

Only `profile.summary` is embedded — not the full profile JSON. That one dense, information-rich paragraph is the entire basis for semantic search.

```python
# backend/ingestion.py
def embed(text: str) -> list[float]:
    response = client.embeddings.create(
        model=settings.embedding_model,   # text-embedding-3-large
        input=text,
    )
    return response.data[0].embedding    # 3072-dimensional float list
```

`text-embedding-3-large` returns 3072 dimensions by default. You can pass `dimensions=1536` to halve storage with minimal quality loss, but use full 3072 for a demo.

---

#### 5.4 — Building the sparse vector: `build_sparse_vector()`

Qdrant sparse vectors are maps of `{ term_index → float weight }`. The index must be consistent between ingestion and query time — the same term must always map to the same integer.

Rather than maintaining a vocabulary file, a stable MD5 hash provides deterministic, collision-resistant indices with no state:

```python
# backend/ingestion.py
def term_to_index(term: str) -> int:
    """Stable integer index for a term — consistent across runs."""
    return int(hashlib.md5(term.lower().encode()).hexdigest(), 16) % (2**24)
```

The sparse vector is built from the weighted skill expansion (see `skills.py`):

```python
# backend/ingestion.py
def build_sparse_vector(profile: NormalizedProfile) -> SparseVector:
    weighted = expand_skills_weighted(
        profile.hard_skills + [profile.role]
    )  # e.g. {"React": 1.0, "JavaScript": 1.0, "Vue": 0.6, "Angular": 0.5}
    indices = [term_to_index(term) for term in weighted]
    values  = [float(weight) for weight in weighted.values()]
    return SparseVector(indices=indices, values=values)
```

Exact skills get weight `1.0`, implied skills `1.0`, and similar-but-not-identical skills a partial weight (e.g. `0.6` for React→Vue). This makes the BM25 dot product naturally discount transferable-but-not-exact matches.

---

#### 5.5 — Creating the Qdrant collection: `ensure_collection()`

The collection needs two vector spaces — `dense` (cosine similarity, 3072 dims) and `sparse` (dot product for BM25):

```python
# backend/ingestion.py
def ensure_collection() -> None:
    existing = [c.name for c in qdrant.get_collections().collections]
    if settings.qdrant_collection not in existing:
        qdrant.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config={
                "dense": VectorParams(size=3072, distance=Distance.COSINE),
            },
            sparse_vectors_config={
                "sparse": SparseVectorParams(),
            },
        )
```

Idempotent — safe to call on every ingestion run.

---

#### 5.6 — Upserting a profile: `upsert_profile()`

Each candidate is stored as a Qdrant **point** with both vectors and a metadata payload:

```python
# backend/ingestion.py
def upsert_profile(profile: NormalizedProfile, candidate_id: str) -> None:
    dense_vector  = embed(profile.summary)
    sparse_vector = build_sparse_vector(profile)

    qdrant.upsert(
        collection_name=settings.qdrant_collection,
        points=[
            PointStruct(
                id=candidate_id,
                vector={"dense": dense_vector, "sparse": sparse_vector},
                payload={
                    "name":             profile.name,
                    "role":     profile.role,
                    "seniority":        profile.seniority,
                    "years_experience": profile.years_experience,
                    "sector":           profile.sector,
                    "hard_skills":      profile.hard_skills,
                    "languages":        profile.languages,
                    "location":         profile.location,
                    "open_to_remote":   profile.open_to_remote,
                    "summary":          profile.summary,   # stored for reranker
                },
            )
        ],
    )
```

`summary` is stored in the payload (not just embedded) so the reranker in Step 7 can read the actual text without going back to disk.

---

#### 5.7 — The top-level entry point: `ingest_all()`

```python
# backend/ingestion.py
def ingest_all() -> None:
    ensure_collection()
    for path in PROFILES_DIR.iterdir():
        if path.suffix not in {".txt", ".json", ".pdf"}:
            continue
        print(f"Ingesting {path.name}...")
        raw_text     = load_raw_text(path)
        profile      = normalize_profile(raw_text)
        candidate_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_profile(profile, candidate_id)
        print(f"  ✓ {profile.name or path.stem} — {profile.seniority} {profile.role}")
```

`uuid.uuid5` generates a **deterministic UUID** from the filename — running ingestion twice on the same file produces the same ID, so Qdrant upserts (overwrites) rather than duplicates the point.

---

#### 5.8 — `skills.py` dependency

`ingestion.py` imports `expand_skills_weighted` from `skills.py`. This file must exist before ingestion runs. It contains the `IMPLIES`, `SIMILAR`, and `expand_skills_weighted()` definitions discussed in Step 2.

---

#### 5.9 — Job ingestion

Jobs are stored in a separate Qdrant collection (`jobs`) so that the similarity search can run in both directions:

- **JD → candidates** (the `/search` flow already built)
- **Candidate → matching jobs** (future endpoint: pass a candidate's profile as the query)

The ingestion logic is identical to candidate ingestion — normalize with `normalize_job_description()`, embed the summary, build a sparse vector, upsert. The only differences are the source directory, the collection name, and the normalizer function used.

First, add a `JOBS_DIR` constant to `ingestion.py`:

```python
# backend/ingestion.py  (add constant)
JOBS_DIR = Path(__file__).parent.parent / "data" / "sample_jobs"
```

(`jobs_collection` is already declared in `config.py` from Step 2.)

Then extend `ensure_collection()` to create both collections:

```python
# backend/ingestion.py
def ensure_collection() -> None:
    existing = [c.name for c in qdrant.get_collections().collections]
    for collection in (settings.qdrant_collection, settings.jobs_collection):
        if collection not in existing:
            qdrant.create_collection(
                collection_name=collection,
                vectors_config={
                    "dense": VectorParams(size=3072, distance=Distance.COSINE),
                },
                sparse_vectors_config={
                    "sparse": SparseVectorParams(),
                },
            )
```

Add a dedicated upsert function for jobs — same shape as `upsert_profile()` but targets `jobs_collection`:

```python
# backend/ingestion.py
def upsert_job(profile: NormalizedProfile, job_id: str) -> None:
    dense_vector  = embed(profile.summary)
    sparse_vector = build_sparse_vector(profile)

    qdrant.upsert(
        collection_name=settings.jobs_collection,
        points=[
            PointStruct(
                id=job_id,
                vector={"dense": dense_vector, "sparse": sparse_vector},
                payload={
                    "name":             profile.name,
                    "role":             profile.role,
                    "seniority":        profile.seniority,
                    "years_experience": profile.years_experience,
                    "sector":           profile.sector,
                    "hard_skills":      profile.hard_skills,
                    "location":         profile.location,
                    "open_to_remote":   profile.open_to_remote,
                    "summary":          profile.summary,
                },
            )
        ],
    )
```

`name` stores the hiring company name extracted by the normalizer — it follows the same convention as candidate profiles, where `name` is the person's full name.

`ingest_all()` handles both candidates and jobs in one pass:

```python
# backend/ingestion.py
def ingest_all() -> None:
    ensure_collection()
    for path in PROFILES_DIR.iterdir():
        if path.suffix not in {".txt", ".json", ".pdf"}:
            continue
        print(f"Ingesting {path.name}...")
        raw_text     = load_raw_text(path)
        profile      = normalize_profile(raw_text)
        candidate_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_profile(profile, candidate_id)
        print(f"  ✓ {profile.name or path.stem} — {profile.seniority} {profile.role}")
    for path in JOBS_DIR.iterdir():
        if path.suffix not in {".txt", ".json", ".pdf"}:
            continue
        print(f"Ingesting job {path.name}...")
        raw_text = load_raw_text(path)
        profile  = normalize_job_description(raw_text)
        job_id   = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_job(profile, job_id)
        print(f"  ✓ {profile.name or path.stem} — {profile.seniority} {profile.role}")
```

With both collections populated, the Qdrant dashboard at `http://localhost:6333/dashboard` will show two collections: `candidates` and `jobs`, each with dense + sparse vectors.

### Step 6 — `retrieval.py` ✅

#### 6.1 — What this module does

Retrieval mirrors ingestion in reverse. Where ingestion converts a profile into vectors and stores them, retrieval converts a job description into the same vector representations and searches for the closest matches.

```
NormalizedProfile (JD)
  └─► embed(jd.summary)          — dense query vector
  └─► build_sparse_vector(jd)    — BM25 keyword query
  └─► apply_filters()            — optional metadata pre-filters
  └─► hybrid_search()            — Qdrant RRF fusion → top-20 raw results
```

The output is a list of raw Qdrant results (not yet `MatchResult` objects) — the reranker in Step 7 adds scores and explanations.

---

#### 6.2 — Why pre-filter before semantic search

Metadata pre-filtering eliminates obviously wrong matches **before** the vector search runs. Filtering seniority or location in Qdrant is a cheap boolean check — it doesn't consume any embedding distance budget. Without it, a junior developer in Tokyo might be semantically close to a senior role in Barcelona simply because they share the same tech stack.

Filters are **optional** — if none are passed, the full collection is searched. This keeps the API flexible: a broad JD can search everything, a specific one can narrow down first.

---

#### 6.3 — Building Qdrant filters

Qdrant filters work on payload fields. The `SearchRequest.filters` dict (from `models.py`) maps to Qdrant's filter DSL:

```python
# backend/retrieval.py
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

def build_filter(filters: dict | None) -> Filter | None:
    if not filters:
        return None

    conditions = []

    if seniority := filters.get("seniority"):
        conditions.append(
            FieldCondition(key="seniority", match=MatchValue(value=seniority))
        )

    if location := filters.get("location"):
        conditions.append(
            FieldCondition(key="location", match=MatchValue(value=location))
        )

    if min_years := filters.get("min_years_experience"):
        conditions.append(
            FieldCondition(key="years_experience", range=Range(gte=min_years))
        )

    if filters.get("open_to_remote") is True:
        conditions.append(
            FieldCondition(key="open_to_remote", match=MatchValue(value=True))
        )

    return Filter(must=conditions) if conditions else None
```

`must` means all conditions must pass (logical AND). Qdrant also supports `should` (OR) and `must_not` (NOT) for more complex filter logic.

---

#### 6.4 — The hybrid search: dense + sparse with RRF

Qdrant's `query_points` with `prefetch` and `Query(fusion=Fusion.RRF)` runs both searches in parallel and merges the ranked lists using Reciprocal Rank Fusion. The function accepts a `collection` parameter so it can search either the `candidates` or `jobs` collection depending on search direction:

```python
# backend/retrieval.py
from qdrant_client.models import (
    Prefetch, Query, Fusion, NamedVector, NamedSparseVector, SparseVector
)
from qdrant_client import QdrantClient
from config import settings

qdrant = QdrantClient(url=settings.qdrant_url)

def hybrid_search(
    dense_vector: list[float],
    sparse_vector: SparseVector,
    query_filter: Filter | None,
    collection: str,
    top_k: int = 20,
) -> list:
    results = qdrant.query_points(
        collection_name=collection,
        prefetch=[
            Prefetch(
                query=NamedVector(name="dense", vector=dense_vector),
                using="dense",
                filter=query_filter,
                limit=top_k * 2,   # fetch more, RRF will trim
            ),
            Prefetch(
                query=NamedSparseVector(
                    name="sparse",
                    vector=sparse_vector,
                ),
                using="sparse",
                filter=query_filter,
                limit=top_k * 2,
            ),
        ],
        query=Query(fusion=Fusion.RRF),
        limit=top_k,
        with_payload=True,
    )
    return results.points
```

**Why `limit=top_k * 2` for the prefetch?**
RRF needs to see more candidates than the final limit to rank effectively. If you only fetch 20 from each leg, a candidate that ranks #21 in dense but #1 in sparse gets dropped before RRF can promote it. Fetching 40 from each gives RRF enough material to work with.

**What RRF actually does:**
For each candidate appearing in either ranked list, its RRF score is:

$$\text{score} = \sum_{r \in \text{rankings}} \frac{1}{k + r}$$

where $r$ is the rank position (1-indexed) and $k$ is a smoothing constant (typically 60). A candidate ranked #1 in both lists scores highest. One that appears only in the sparse list at rank #5 still gets credit — it's not discarded.

---

#### 6.5 — Reusing `ingestion.py` functions

`retrieval.py` needs to build the same vectors the ingestion pipeline built. Rather than duplicating `embed()`, `term_to_index()`, and `build_sparse_vector()`, import them directly:

```python
# backend/retrieval.py
from ingestion import embed, build_sparse_vector
```

This is the correct dependency direction — retrieval depends on ingestion utilities, not the other way around. Both are pure functions with no side effects, so the import is safe.

---

#### 6.6 — The top-level entry point: `retrieve()`

```python
# backend/retrieval.py
from models import NormalizedProfile

def retrieve(
    profile: NormalizedProfile,
    filters: dict | None = None,
    collection: str = settings.qdrant_collection,
    top_k: int = 20,
) -> list:
    dense_vector  = embed(profile.summary)
    sparse_vector = build_sparse_vector(profile)
    query_filter  = build_filter(filters)

    return hybrid_search(dense_vector, sparse_vector, query_filter, collection, top_k)
```

The function receives an already-normalized `NormalizedProfile` and the target `collection`. Normalization and collection selection happen upstream in `main.py` (Step 8), which knows the search direction. This keeps retrieval focused: it does search, not routing.

---

#### 6.7 — What the results look like

Each item in the returned list is a Qdrant `ScoredPoint`:

```python
# backend/retrieval.py — example output shape
ScoredPoint(
    id="uuid-...",
    score=0.031,          # RRF score — not a semantic similarity score
    payload={
        "name": "Elena García",
        "role": "Senior Backend Developer",
        "seniority": "senior",
        "summary": "Senior backend engineer with 10 years...",
        "hard_skills": ["Python", "FastAPI", "Kafka", ...],
        ...
    }
)
```

The `score` here is the RRF score — a ranking signal, not a human-readable match percentage. The reranker in Step 7 replaces this with a `0.0–1.0` business fit score and adds a natural language explanation.

### Step 7 — `reranker.py` ✅

Qdrant returns up to 20 candidates ranked by RRF score. RRF is good at **recall** — it surfaces candidates who match either the dense or sparse query — but it has no semantic understanding of whether a candidate is actually a good fit for the job. That judgment belongs to the LLM.

The reranker passes all 20 candidates to the LLM in a single call and asks it to score each one 0.0–1.0 against the job description, explain the match in one sentence, and list the skills present in both. The top 5 are returned as typed `MatchResult` objects.

---

#### 7.1 — Why a single batch call?

You could call the LLM once per candidate (20 calls), but one batch call is better:

- **Cost and latency** — one API round trip instead of twenty
- **Calibration** — with all candidates in context the model can score them _relative to each other_. A 0.8 is more meaningful when the model has seen the full field and actively chose not to award 0.9 to anyone else

---

#### 7.2 — Enforcing the output schema with Pydantic

Rather than just describing the expected JSON in the prompt and hoping the model follows it, the OpenAI SDK's `beta.chat.completions.parse()` endpoint accepts a Pydantic model as `response_format`. The SDK converts it to a JSON Schema, passes it to the model with `strict: true`, and validates the response before it reaches your code.

Two internal models (prefixed with `_` to signal they are private to the module) define exactly what each array item must contain and what the wrapper object looks like:

```python
# backend/reranker.py
from pydantic import BaseModel as PydanticModel

class _RerankItem(PydanticModel):
    candidate_id: str
    score: float
    reasoning: str
    matched_skills: list[str]

class _RerankResponse(PydanticModel):
    results: list[_RerankItem]
```

`_RerankResponse` wraps the array under a `results` key — the JSON Schema format requires an object at the top level, not a bare array.

Because the schema is enforced by the SDK, the system prompt no longer needs to describe JSON formatting rules. It can focus purely on the task:

```python
# backend/reranker.py
RERANK_SYSTEM_PROMPT = """You are a talent matching expert.

Given a job description and a list of candidates, score each candidate's fit from 0.0 to 1.0.

Order results highest score first. For each candidate provide:
  candidate_id: copy exactly from the input
  score: float 0.0–1.0
  reasoning: one sentence, third-person, impersonal
  matched_skills: skills present in both the JD and the candidate"""
```

The `matched_skills` instruction ("present in both") keeps the model honest — it cannot invent skills the candidate doesn't have.

---

#### 7.3 — `_build_prompt()`

Formats the JD and all 20 candidates into a single readable text block. The candidate `summary` field carries the most signal — it is the normalized, impersonal third-person description written by the normalizer in Step 3, and it was stored in the Qdrant payload precisely so the reranker can read it without a second lookup:

```python
# backend/reranker.py
def _build_prompt(points: list[ScoredPoint], jd: NormalizedProfile) -> str:
    lines = [
        "JOB DESCRIPTION",
        f"Role: {jd.role} ({jd.seniority})",
        f"Summary: {jd.summary}",
        f"Skills: {', '.join(jd.hard_skills)}",
        "",
        "CANDIDATES",
    ]
    for point in points:
        p = point.payload
        lines += [
            "---",
            f"id: {point.id}",
            f"Name: {p.get('name', 'Unknown')}",
            f"Role: {p.get('role')} ({p.get('seniority')})",
            f"Summary: {p.get('summary')}",
            f"Skills: {', '.join(p.get('hard_skills', []))}",
        ]
    return "\n".join(lines)
```

---

#### 7.4 — `_point_to_profile()`

Each `ScoredPoint` payload is a plain dict. This helper reconstructs the typed `NormalizedProfile` that the `MatchResult` schema requires:

```python
# backend/reranker.py
def _point_to_profile(payload: dict) -> NormalizedProfile:
    return NormalizedProfile(
        name=payload.get("name"),
        summary=payload.get("summary", ""),
        role=payload.get("role"),
        seniority=payload.get("seniority"),
        years_experience=payload.get("years_experience"),
        sector=payload.get("sector"),
        hard_skills=payload.get("hard_skills", []),
        soft_skills=payload.get("soft_skills", []),
        languages=payload.get("languages", []),
        location=payload.get("location"),
        open_to_remote=payload.get("open_to_remote"),
        education=payload.get("education"),
    )
```

---

#### 7.5 — `rerank()` — the public function

```python
# backend/reranker.py
def rerank(
    points: list[ScoredPoint],
    jd: NormalizedProfile,
    top_n: int = 5,
) -> list[MatchResult]:
    if not points:
        return []

    prompt = _build_prompt(points, jd)

    response = client.beta.chat.completions.parse(
        model=settings.llm_model,
        temperature=0,
        response_format=_RerankResponse,
        messages=[
            {"role": "system", "content": RERANK_SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
    )

    items = response.choices[0].message.parsed.results

    payload_by_id = {str(p.id): p.payload for p in points}

    results = []
    for item in items[:top_n]:
        payload = payload_by_id.get(item.candidate_id, {})
        results.append(MatchResult(
            candidate_id=item.candidate_id,
            name=payload.get("name", "Unknown"),
            score=item.score,
            reasoning=item.reasoning,
            matched_skills=item.matched_skills,
            profile=_point_to_profile(payload),
        ))

    return results
```

Key design notes:

- **`temperature=0`** — same as `normalizer.py`. Reranking is a deterministic judgment task, not creative generation
- **`.parsed.results`** — `.parsed` is already a typed `_RerankResponse`; no `json.loads()`, no dict key access, no defensive fallback needed
- **`payload_by_id` lookup** — the LLM returns candidate IDs copied from the prompt; we look up the original payload to populate `MatchResult` without a second Qdrant query
- **`items[:top_n]`** — the LLM already ordered results highest-to-lowest; slicing to top 5 is sufficient

---

#### 7.6 — Full file structure

```python
# backend/reranker.py
from openai import OpenAI
from pydantic import BaseModel as PydanticModel
from qdrant_client.models import ScoredPoint
from models import MatchResult, NormalizedProfile
from config import settings

client = OpenAI(api_key=settings.openai_api_key)

class _RerankItem(PydanticModel): ...    # 7.2 — per-candidate schema
class _RerankResponse(PydanticModel): ... # 7.2 — top-level wrapper

RERANK_SYSTEM_PROMPT = "..."             # 7.2

def _build_prompt(...)     -> str: ...              # 7.3
def _point_to_profile(...) -> NormalizedProfile: ... # 7.4
def rerank(...)            -> list[MatchResult]: ... # 7.5
```

### Step 8 — `main.py` ✅

`main.py` is the thin orchestration layer. It wires together everything built in Steps 2–7: receives HTTP requests, calls the pipeline in order, and returns typed responses. No business logic lives here.

---

#### 8.1 — App setup

```python
# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ingestion import ingest_all
from retrieval import retrieve
from reranker import rerank
from normalizer import normalize_job_description
from models import SearchRequest, MatchResult

app = FastAPI(title="Job-Candidate RAG")
```

`SearchRequest` and `MatchResult` are already defined in `models.py` — no new schemas needed here.

---

#### 8.2 — CORS middleware

The React frontend runs on port 5173 and calls the API on port 8000 — a different origin. Browsers block cross-origin requests by default. Adding CORS middleware allows the frontend to reach the API:

```python
# backend/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

`allow_origins` is an explicit whitelist — only requests from the known frontend origin are permitted. Using `["*"]` would allow any website to call the API.

---

#### 8.3 — `GET /health`

```python
# backend/main.py
@app.get("/health")
def health():
    return {"status": "ok"}
```

Simple liveness check. Docker and orchestrators poll this to confirm the container is up.

---

#### 8.4 — `POST /ingest`

```python
# backend/main.py
@app.post("/ingest")
def ingest():
    try:
        ingest_all()
        return {"status": "ingestion complete"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

Triggers the full ingestion pipeline — reads every file from `data/sample_profiles/`, normalizes, embeds, and upserts to Qdrant. `ingest_all()` is idempotent (uuid5 IDs + upsert), so calling it twice is safe.

---

#### 8.5 — `POST /search` — the main pipeline

This is the only endpoint that matters for the demo. The `direction` field in `SearchRequest` controls which normalizer is called and which collection is searched. The rest of the pipeline — embed, retrieve, rerank — is identical for both directions:

```
"job_to_candidate" (default)          "candidate_to_job"

raw JD text                            raw CV text
  → normalize_job_description()          → normalize_profile()
  → retrieve(collection="candidates")    → retrieve(collection="jobs")
  → rerank()                             → rerank()
  → list[MatchResult]                    → list[MatchResult]
```

```python
# backend/main.py
@app.post("/search", response_model=list[MatchResult])
def search(request: SearchRequest):
    if request.direction == "candidate_to_job":
        profile    = normalize_profile(request.query_text)
        collection = settings.jobs_collection
    else:
        profile    = normalize_job_description(request.query_text)
        collection = settings.qdrant_collection

    points  = retrieve(profile, filters=request.filters, collection=collection)
    results = rerank(points, profile)
    return results
```

`response_model=list[MatchResult]` tells FastAPI to validate and serialize the return value. The branching is two lines — everything else is shared.

---

#### 8.6 — What the response looks like

```json
// POST /search — example response
[
	{
		"candidate_id": "uuid-...",
		"name": "Elena García",
		"score": 0.91,
		"reasoning": "Candidate has extensive backend experience with Python and PostgreSQL, directly matching the FinTech role requirements.",
		"matched_skills": ["Python", "PostgreSQL", "Docker", "FastAPI"],
		"profile": {
			"summary": "Senior backend engineer with 7 years of experience...",
			"role": "Senior Backend Engineer",
			"seniority": "senior"
		}
	}
]
```

The `score` is now a human-readable 0.0–1.0 fit rating assigned by the LLM, replacing the raw RRF score from Qdrant.

### Step 9 — `GET /candidates` and `GET /jobs` ✅

These two endpoints let the frontend display the full catalogue of indexed candidates and jobs without requiring a search query. They use Qdrant's `scroll()` API — a paginated full-collection read that bypasses the vector index entirely.

---

#### 9.1 — Why `scroll()` instead of search?

`search()` / `query_points()` require a query vector — they rank results by similarity. When you want to list everything (no query, no ranking), `scroll()` is the right tool. It returns points in storage order with no scoring overhead.

---

#### 9.2 — Adding the endpoints to `main.py`

```python
# backend/main.py
@app.get("/candidates")
def list_candidates():
    try:
        points, _ = qdrant.scroll(
            collection_name=settings.qdrant_collection,
            with_payload=True,
            limit=100,
        )
        return [{"id": str(p.id), **p.payload} for p in points]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs")
def list_jobs():
    try:
        points, _ = qdrant.scroll(
            collection_name=settings.jobs_collection,
            with_payload=True,
            limit=100,
        )
        return [{"id": str(p.id), **p.payload} for p in points]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

`scroll()` returns a tuple of `(points, next_page_offset)`. The second element is used for pagination — for now we ignore it and cap at 100 items, which is more than enough for the sample dataset.

The response for each item merges the Qdrant point `id` with the full `payload` dict into a flat object — the frontend can render it directly without needing to know the Qdrant data model.

---

#### 9.3 — The `qdrant` client in `main.py`

The scroll calls above need a `QdrantClient` instance. Rather than creating a second client, import the one already instantiated in `retrieval.py`:

```python
# backend/main.py
from retrieval import retrieve, qdrant
```

The client is module-level in `retrieval.py` — importing it here reuses the same connection pool.

---

#### 9.4 — What the responses look like

```json
// GET /candidates — example item
{
	"id": "uuid-...",
	"name": "Elena García",
	"role": "Senior Backend Engineer",
	"seniority": "senior",
	"years_experience": 7,
	"location": "Madrid",
	"open_to_remote": true,
	"hard_skills": ["Python", "PostgreSQL", "Docker", "FastAPI"],
	"summary": "Senior backend engineer with 7 years of experience..."
}
```

```json
// GET /jobs — example item
{
	"id": "uuid-...",
	"role": "Lead Data Engineer",
	"seniority": "lead",
	"years_experience": 5,
	"location": "Madrid",
	"open_to_remote": false,
	"hard_skills": ["Spark", "Airflow", "AWS Glue", "Python"],
	"summary": "Lead data engineer role in a Madrid-based FinTech..."
}
```

### Step 10 — Frontend (TODO)

- Text area for job description input
- Submit → call `POST /search`
- Display top-5 results as cards: name, role, score, reasoning, key matched skills

---

## Setup

```bash
# 1. Copy environment file
cp .env.example .env
# Add your OPENAI_API_KEY

# 2. Start the stack
docker compose up --build

# 3. Ingest sample profiles
curl -X POST http://localhost:8000/ingest

# 4. Run a search
curl -X POST http://localhost:8000/search \
  -H "Content-Type: application/json" \
  -d '{"job_description": "Senior Python engineer with Kubernetes experience in Barcelona"}'
```

---

## Dependencies (backend)

```
fastapi
uvicorn
pydantic
pydantic-settings
openai
qdrant-client
python-dotenv
```

Resume this session with:  
claude --resume eb672967-936a-45e7-8de7-752c086b6559
