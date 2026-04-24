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
	"name": "string (candidate only — null for JDs)",
	"summary": "string — clean English prose paragraph, dense with skills and context, used for embedding",
	"current_role": "string",
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
├── frontend/          ← stub for now; replaced in Step 9
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
OPENAI_API_KEY=sk-...
QDRANT_URL=http://qdrant:6333
QDRANT_COLLECTION=candidates
EMBEDDING_MODEL=text-embedding-3-large
LLM_MODEL=gpt-4.1
```

---

#### 1.5 — `backend/Dockerfile`

```dockerfile
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

A placeholder until the React app is scaffolded in Step 9. Without this file, `docker compose up --build` fails because the `build: ./frontend` directive expects a `Dockerfile` to exist.

```dockerfile
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

The Qdrant dashboard is also available at `http://localhost:6333/dashboard` — useful for inspecting collections and vectors.

### Step 2 — `config.py` + `models.py` ✅

These two files are the foundation every other module imports from. Write them first so nothing else has to hardcode strings or repeat type definitions.

---

#### 2.1 — `backend/config.py`

`pydantic-settings` extends Pydantic to read fields directly from environment variables (or a `.env` file). You declare a class and values are populated at import time — no manual `os.getenv()` calls scattered across the codebase.

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    openai_api_key: str
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "candidates"
    embedding_model: str = "text-embedding-3-large"
    llm_model: str = "gpt-4.1"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
```

Key points:

- `BaseSettings` maps env var names to fields automatically (case-insensitive). `OPENAI_API_KEY` in `.env` → `settings.openai_api_key`.
- Fields with no default (e.g. `openai_api_key`) raise a `ValidationError` at startup if missing — fail fast, not silently.
- Fields with defaults (e.g. `qdrant_url`) are safe to omit from `.env`, useful for local dev where Qdrant runs on `localhost` rather than the Docker service name.
- `extra="ignore"` means unrecognised env vars (`PATH`, `HOME`, etc.) don't cause errors.
- The module-level `settings = Settings()` means all other modules do `from config import settings` — one import, no repeated instantiation.

---

#### 2.2 — `backend/models.py`

Three Pydantic models cover all data shapes in the pipeline.

```python
from pydantic import BaseModel
from typing import Optional

class NormalizedProfile(BaseModel):
    name: Optional[str] = None       # candidate only — null for JDs
    summary: str                      # clean English prose — used for embedding
    current_role: str
    seniority: str                    # junior | mid | senior | lead | executive
    years_experience: float
    sector: list[str]
    hard_skills: list[str]            # exact tool/technology names
    soft_skills: list[str]
    languages: list[str]
    location: str
    open_to_remote: bool
    education: str


class SearchRequest(BaseModel):
    job_description: str              # raw JD text — any format, any language
    filters: Optional[dict] = None   # optional metadata pre-filters


class MatchResult(BaseModel):
    candidate_id: str
    name: Optional[str] = None
    score: float                      # 0.0 – 1.0, assigned by LLM reranker
    reasoning: str                    # LLM-generated explanation
    matched_skills: list[str]
    profile: NormalizedProfile
```

Key points:

- `NormalizedProfile` is used for **both** candidates and job descriptions. When normalizing a JD, `name` is `None`. This symmetry means `normalizer.py`, `ingestion.py`, and `retrieval.py` all work with the same type.
- `summary` is the field that gets embedded. It must be a dense, skill-rich English paragraph — not a JSON dump. The LLM normalization step (Step 3) is responsible for writing it well.
- `hard_skills` stores **exact, canonical names** (`"PostgreSQL"`, not `"databases"`) because these feed the sparse BM25 index, which depends on term-level matching. Skill expansion (implied and similar skills) is handled separately in `skills.py` (see Step 5).
- `SearchRequest.filters` is a free-form dict for now — Step 6 defines valid keys (e.g. `{"seniority": "senior", "location": "Barcelona"}`).
- `MatchResult.score` comes from the LLM reranker in Step 7, not from vector distance. Vector distance ranks candidates; the LLM scores them on business fit.

#### Few-shot examples (also in `models.py`)

`models.py` also defines canonical example instances used to few-shot the LLM prompts in `normalizer.py`. They are defined as actual `NormalizedProfile` objects — not raw JSON strings — so they are structurally tied to the schema. If a field is added or renamed, Python raises a `TypeError` at import time rather than silently producing a malformed prompt.

```python
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
    current_role="Senior Backend Developer",
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
           ├─► ingestion.py    (qdrant_url, embedding_model)
           └─► retrieval.py    (qdrant_url, qdrant_collection)

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
normalize_profile(raw_text: str)          → NormalizedProfile
normalize_job_description(raw_text: str)  → NormalizedProfile
```

Both return the same `NormalizedProfile` type — the symmetric design means the rest of the pipeline doesn't need to know which side it's processing.

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
def term_to_index(term: str) -> int:
    """Stable integer index for a term — consistent across runs."""
    return int(hashlib.md5(term.lower().encode()).hexdigest(), 16) % (2**24)
```

The sparse vector is built from the weighted skill expansion (see `skills.py`):

```python
def build_sparse_vector(profile: NormalizedProfile) -> SparseVector:
    weighted = expand_skills_weighted(
        profile.hard_skills + [profile.current_role]
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
                    "current_role":     profile.current_role,
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
        print(f"  ✓ {profile.name or path.stem} — {profile.seniority} {profile.current_role}")
```

`uuid.uuid5` generates a **deterministic UUID** from the filename — running ingestion twice on the same file produces the same ID, so Qdrant upserts (overwrites) rather than duplicates the point.

---

#### 5.8 — `skills.py` dependency

`ingestion.py` imports `expand_skills_weighted` from `skills.py`. This file must exist before ingestion runs. It contains the `IMPLIES`, `SIMILAR`, and `expand_skills_weighted()` definitions discussed in Step 2.

### Step 6 — `retrieval.py` (TODO)

- Accept a normalized JD
- Embed JD summary → dense query vector
- Extract sparse keywords → BM25 query
- Qdrant hybrid search with RRF fusion
- Apply optional metadata pre-filters (seniority, location, sector)
- Return top-20 raw results for reranking

### Step 7 — `reranker.py` (TODO)

- Take top-20 Qdrant results + original JD text
- LLM prompt: score each candidate 0–1 and explain the match
- Return top-5 as `List[MatchResult]`

### Step 8 — `main.py` (TODO)

- `POST /ingest` — trigger ingestion of all profiles
- `POST /search` — accept `SearchRequest`, run full query pipeline, return `List[MatchResult]`
- `GET /health` — sanity check

### Step 9 — Frontend (TODO)

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
