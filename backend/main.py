from fastapi import FastAPI, HTTPException
from ingestion import ingest_all
from retrieval import retrieve, qdrant
from reranker import rerank
from normalizer import normalize_job_description, normalize_profile
from models import SearchRequest, MatchResult
from config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Job-Candidate RAG")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ingest")
def ingest():
    try:
        ingest_all()
        return {"status": "ingestion complete"}
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


@app.post("/search", response_model=list[MatchResult])
def search(request: SearchRequest):
    try:
        if request.direction == "candidate_to_job":
            profile = normalize_profile(request.query_text)
            collection = settings.jobs_collection
        else:
            profile = normalize_job_description(request.query_text)
            collection = settings.qdrant_collection

        points = retrieve(profile, filters=request.filters,
                          collection=collection)
        results = rerank(points, profile, direction=request.direction)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
