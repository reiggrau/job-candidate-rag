"""Ingestion pipeline: parse raw profiles, normalise, embed, and upsert to Qdrant."""

import json
import hashlib
import uuid
from pathlib import Path
import pdfplumber
from openai import OpenAI
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance, SparseVectorParams, SparseVector
from skills import expand_skills_weighted
from models import NormalizedProfile
from normalizer import normalize_profile, normalize_job_description
from config import settings

PROFILES_DIR = Path(__file__).parent.parent / "data" / "sample_profiles"
JOBS_DIR = Path(__file__).parent.parent / "data" / "sample_jobs"


def load_raw_text(path: Path) -> str:
    """Load raw text from a file, supporting multiple formats."""
    if path.suffix == ".pdf":
        with pdfplumber.open(path) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    elif path.suffix == ".json":
        # Re-serialise to normalised string — consistent whitespace regardless of source
        return json.dumps(json.loads(path.read_text(encoding="utf-8")), indent=2)
    else:
        return path.read_text(encoding="utf-8")


client = OpenAI(api_key=settings.openai_api_key)


def embed(text: str) -> list[float]:
    """Get the embedding vector for a given text."""
    response = client.embeddings.create(
        model=settings.embedding_model,   # text-embedding-3-large
        input=text,
    )
    return response.data[0].embedding    # 3072-dimensional float list


def term_to_index(term: str) -> int:
    """Stable integer index for a term — consistent across runs."""
    return int(hashlib.md5(term.lower().encode()).hexdigest(), 16) % (2**24)


def build_sparse_vector(profile: NormalizedProfile) -> SparseVector:
    """Build a sparse vector from the candidate's skills."""
    weighted = expand_skills_weighted(
        profile.hard_skills + [profile.role]
    )  # e.g. {"React": 1.0, "JavaScript": 1.0, "Vue": 0.6, "Angular": 0.5}
    indices = [term_to_index(term) for term in weighted]
    values = [float(weight) for weight in weighted.values()]
    return SparseVector(indices=indices, values=values)


qdrant = QdrantClient(url=settings.qdrant_url)


def ensure_collection() -> None:
    """Create both collections if they don't exist."""
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


def upsert_profile(profile: NormalizedProfile, candidate_id: str) -> None:
    """Upsert a normalized profile into the Qdrant collection."""
    dense_vector = embed(profile.summary)
    sparse_vector = build_sparse_vector(profile)

    qdrant.upsert(
        collection_name=settings.qdrant_collection,
        points=[
            PointStruct(
                id=candidate_id,
                vector={
                    "dense":  dense_vector,
                    "sparse": sparse_vector,
                },
                payload={
                    "name":             profile.name,
                    "role":             profile.role,
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


def upsert_job(profile: NormalizedProfile, job_id: str) -> None:
    """Upsert a normalized job description into the jobs collection."""
    dense_vector = embed(profile.summary)
    sparse_vector = build_sparse_vector(profile)

    qdrant.upsert(
        collection_name=settings.jobs_collection,
        points=[
            PointStruct(
                id=job_id,
                vector={
                    "dense":  dense_vector,
                    "sparse": sparse_vector,
                },
                payload={
                    "name":             profile.name,
                    "role":             profile.role,
                    "seniority":        profile.seniority,
                    "years_experience": profile.years_experience,
                    "sector":           profile.sector,
                    "hard_skills":      profile.hard_skills,
                    "languages":        profile.languages,
                    "location":         profile.location,
                    "open_to_remote":   profile.open_to_remote,
                    "summary":          profile.summary,
                },
            )
        ],
    )


def ingest_one(path: Path, kind: str) -> None:
    """Ingest a single file as a candidate profile or job description."""
    ensure_collection()
    print(f"Ingesting {path.name} as {kind}...")
    raw_text = load_raw_text(path)
    if kind == "candidate":
        profile = normalize_profile(raw_text)
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_profile(profile, doc_id)
    else:
        profile = normalize_job_description(raw_text)
        doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_job(profile, doc_id)
    print(f"\n{'─' * 50}")
    print(f"  ✓ Ingested as {kind.upper()}  |  ID: {doc_id}")
    print(f"{'─' * 50}")
    print(f"  Name            {profile.name}")
    print(f"  Role            {profile.role}")
    print(f"  Seniority       {profile.seniority}")
    print(f"  Experience      {profile.years_experience} years")
    print(
        f"  Location        {profile.location}  (remote: {profile.open_to_remote})")
    print(f"  Languages       {', '.join(profile.languages) or '—'}")
    print(f"  Sector          {', '.join(profile.sector) or '—'}")
    print(f"  Hard skills     {', '.join(profile.hard_skills) or '—'}")
    print(f"  Soft skills     {', '.join(profile.soft_skills) or '—'}")
    print(f"  Education       {profile.education or '—'}")
    print(f"  Summary         {profile.summary}")
    print(f"{'─' * 50}\n")


def ingest_all() -> None:
    """Ingest all profiles and job descriptions from the data directory."""
    ensure_collection()
    for path in PROFILES_DIR.iterdir():
        if path.suffix not in {".txt", ".json", ".pdf"}:
            continue
        print(f"Ingesting {path.name}...")
        raw_text = load_raw_text(path)
        profile = normalize_profile(raw_text)
        candidate_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_profile(profile, candidate_id)
        print(
            f"  ✓ {profile.name or path.stem} — {profile.seniority} {profile.role}")
    for path in JOBS_DIR.iterdir():
        if path.suffix not in {".txt", ".json", ".pdf"}:
            continue
        print(f"Ingesting job {path.name}...")
        raw_text = load_raw_text(path)
        profile = normalize_job_description(raw_text)
        job_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, path.name))
        upsert_job(profile, job_id)
        print(
            f"  ✓ {profile.name or path.stem} — {profile.seniority} {profile.role}")


if __name__ == "__main__":
    import sys

    search_dirs = {"candidate": PROFILES_DIR, "job": JOBS_DIR}

    print("Ingest files into Qdrant.")
    print("Kind options: candidate, job, all")
    kind = input("Kind [all]: ").strip().lower() or "all"

    if kind == "all":
        ingest_all()
        sys.exit(0)

    if kind not in search_dirs:
        print(f"Invalid kind '{kind}'. Must be 'candidate', 'job', or 'all'.")
        sys.exit(1)

    base_dir = search_dirs[kind]
    available = sorted(p.name for p in base_dir.iterdir()
                       if p.suffix in {".txt", ".json", ".pdf"})
    print(f"\nAvailable files in {base_dir}:")
    for name in available:
        print(f"  {name}")

    filename = input("\nFilename: ").strip()
    path = base_dir / filename
    if not path.exists():
        print(f"File not found: {path}")
        sys.exit(1)

    ingest_one(path, kind)
