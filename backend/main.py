from fastapi import FastAPI, HTTPException
from ingestion import ingest_all
from retrieval import retrieve
from reranker import rerank
from normalizer import normalize_job_description
from models import SearchRequest, MatchResult
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


@app.post("/search", response_model=list[MatchResult])
def search(request: SearchRequest):
    jd_profile = normalize_job_description(request.job_description)
    points = retrieve(jd_profile, filters=request.filters)
    results = rerank(points, jd_profile)
    return results
