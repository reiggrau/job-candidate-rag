"""Models for the job-candidate-rag application."""

from typing import Optional, Literal
from pydantic import BaseModel


class NormalizedProfile(BaseModel):
    """Standardized candidate profile used for embedding and matching."""
    name: str                             # candidate's full name or hiring company name
    role: str                             # e.g. "Senior Backend Developer"
    seniority: str                        # junior | mid | senior | lead | executive
    years_experience: float               # computed from work history
    sector: list[str] = []
    hard_skills: list[str] = []           # exact tool/technology names
    soft_skills: list[str] = []
    languages: list[str] = []
    location: str                         # city or region
    open_to_remote: bool                  # True | False
    education: Optional[str] = None
    summary: str                          # written last — uses all fields above


class SearchRequest(BaseModel):
    """Input for the search endpoint."""
    query_text: str                          # raw CV or JD text — any format, any language
    direction: Literal["job_to_candidate",
                       "candidate_to_job"] = "job_to_candidate"
    filters: Optional[dict] = None           # optional metadata pre-filters


class MatchResult(BaseModel):
    """Output for the search endpoint."""
    id: str
    name: str
    score: float                  # 0.0 – 1.0
    reasoning: str                # LLM-generated explanation
    matched_skills: list[str]
    profile: NormalizedProfile


# ---------------------------------------------------------------------------
# Few-shot examples for normalizer.py prompts
#
# Defined as actual model instances so they are structurally tied to the
# schema. If a field is added or renamed, Python raises a TypeError at
# import time — the compiler enforces consistency, not human discipline.
# ---------------------------------------------------------------------------

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

JD_EXAMPLE_INPUT = """Buscamos un Senior Data Engineer para unirse a nuestro equipo en Madrid.
Requisitos: 5+ años con Spark, Python, Airflow. Experiencia con AWS Glue o Azure Data Factory.
Español fluido imprescindible, inglés valorado."""

JD_EXAMPLE_OUTPUT = NormalizedProfile(
    name="Unknown Company",
    summary=(
        "Senior data engineer with at least 5 years of experience building and orchestrating "
        "large-scale data pipelines using Apache Spark, Python, and Airflow. Experienced with "
        "cloud-native ETL tooling such as AWS Glue or Azure Data Factory. Based in Madrid, "
        "fluent in Spanish."
    ),
    role="Senior Data Engineer",
    seniority="senior",
    years_experience=5,
    sector=[],
    hard_skills=["Apache Spark", "Python",
                 "Airflow", "AWS Glue", "Azure Data Factory"],
    soft_skills=[],
    languages=["Spanish", "English"],
    location="Madrid",
    open_to_remote=False,
    education="",
)
