"""Models for the job-candidate-rag application."""

from typing import Optional
from pydantic import BaseModel


class NormalizedProfile(BaseModel):
    """Standardized candidate profile used for embedding and matching."""
    name: Optional[str] = None  # candidate only — null for JDs
    summary: str                # clean English prose — used for embedding
    current_role: str
    seniority: str              # junior | mid | senior | lead | executive
    years_experience: float
    sector: list[str]
    hard_skills: list[str]      # exact tool/technology names
    soft_skills: list[str]
    languages: list[str]
    location: str
    open_to_remote: bool
    education: str


class SearchRequest(BaseModel):
    """Input for the search endpoint."""
    job_description: str            # raw JD text — any format, any language
    filters: Optional[dict] = None  # optional metadata pre-filters


class MatchResult(BaseModel):
    """Output for the search endpoint."""
    candidate_id: str
    name: Optional[str] = None
    score: float                  # 0.0 – 1.0
    reasoning: str                # LLM-generated explanation
    matched_skills: list[str]
    profile: NormalizedProfile
