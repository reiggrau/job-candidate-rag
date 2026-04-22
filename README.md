# AI-Powered Job-to-Candidate Matching Demo

Take-home technical challenge for Workfully — a Barcelona-based B2B recruitment marketplace.
Demonstrates AI-powered matching between job descriptions and candidate profiles using a hybrid RAG pipeline.

> **Note:** The same architecture applies to job-to-recruiter matching (the real product need). Only the data schema and sample data change — the pipeline logic is identical.

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
      - "6333:6333"   # REST API — used by qdrant-client in Python
      - "6334:6334"   # gRPC — optional, but good to expose
    volumes:
      - qdrant_data:/qdrant/storage  # persist indexed data

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env           # injects OPENAI_API_KEY etc. at runtime
    depends_on:
      - qdrant
    environment:
      - QDRANT_URL=http://qdrant:6333  # 'qdrant' resolves inside Docker network

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend

volumes:
  qdrant_data:         # named volume — survives docker compose down
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

- `normalize_profile(raw_text)` and `normalize_job_description(raw_text)`
- Both call OpenAI chat with `temperature=0` (deterministic extraction, not generation)
- `response_format={"type": "json_object"}` guarantees parseable output
- Summary always written in English — embeddings perform better in a single language space
- Schema injected into prompt via `NormalizedProfile.model_json_schema()`

### Step 4 — Mock data ✅

Sample files in `data/` covering:

- `elena_garcia.txt` — Spanish, free-text CV, Senior Backend Engineer
- `james_okafor.json` — English, structured JSON (LinkedIn-style), Lead Data Engineer
- `carla_vidal.txt` — Spanish, narrative bio, Product Designer
- `senior_backend_engineer.txt` — English job description, FinTech
- `lead_data_engineer_es.txt` — Spanish job description, Madrid

### Step 5 — `ingestion.py` (TODO)

- Load files from `data/sample_profiles/`
- Call `normalize_profile()` for each
- Embed `profile.summary` with `text-embedding-3-large`
- Extract sparse keywords from `hard_skills + [current_role]`
- Upsert into Qdrant with dense vector, sparse vector, and metadata payload

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
