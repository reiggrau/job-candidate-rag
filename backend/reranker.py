from openai import OpenAI
from pydantic import BaseModel as PydanticModel
from qdrant_client.models import ScoredPoint
from models import MatchResult, NormalizedProfile
from config import settings


class _RerankItem(PydanticModel):
    id: str
    score: float
    reasoning: str
    matched_skills: list[str]


class _RerankResponse(PydanticModel):
    results: list[_RerankItem]


client = OpenAI(api_key=settings.openai_api_key)

RERANK_SYSTEM_PROMPT = """You are a talent matching expert.

You will be given a QUERY profile and a list of RESULT profiles. Both are described in the
same normalised schema (role, seniority, skills, location, summary). Your task is to score
how well each result matches the query.

The core question is always: does the candidate's skill set cover the job's requirements?
The QUERY will tell you which side is which.

Scoring guide:
  1.0 — the candidate fully covers all job requirements; seniority and location align perfectly
  0.8 — covers all core requirements; minor gaps (e.g. one missing tool, slightly off seniority)
  0.6 — covers most requirements but has a meaningful gap (missing key skill, wrong seniority)
  0.4 — partial match; covers some skills but misses several core requirements
  below 0.4 — poor fit

Seniority: adjacent-level mismatches (one step apart, either direction) are a minor gap.
  Two or more levels apart is a significant mismatch regardless of direction.

Order results highest score first. For each result provide:
  id: copy exactly from the input
  score: float 0.0–1.0
  reasoning: one sentence, third-person, impersonal
  matched_skills: skills present in both the job requirements and the candidate"""


def _build_prompt(points: list[ScoredPoint], query: NormalizedProfile, direction: str) -> str:
    if direction == "candidate_to_job":
        query_label, results_label = "CANDIDATE (QUERY)", "JOBS"
        scoring_note = (
            "The CANDIDATE is the query. Each JOB is a result.\n"
            "Score how well the candidate covers the job's requirements.\n"
            "Job requirements the candidate LACKS should reduce the score.\n"
            "Job requirements the candidate EXCEEDS are positive."
        )
    else:
        query_label, results_label = "JOB DESCRIPTION (QUERY)", "CANDIDATES"
        scoring_note = (
            "The JOB DESCRIPTION is the query. Each CANDIDATE is a result.\n"
            "Score how well the candidate covers the job's requirements.\n"
            "Candidate skills beyond the job requirements should NOT reduce the score."
        )

    lines = [
        scoring_note,
        "",
        query_label,
        f"Role: {query.role} ({query.seniority})",
        f"Summary: {query.summary}",
        f"Skills: {', '.join(query.hard_skills)}",
        "",
        results_label,
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


def rerank(
    points: list[ScoredPoint],
    query: NormalizedProfile,
    direction: str = "job_to_candidate",
    top_n: int = 5,
) -> list[MatchResult]:
    if not points:
        return []

    prompt = _build_prompt(points, query, direction)

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
        payload = payload_by_id.get(item.id, {})
        results.append(MatchResult(
            id=item.id,
            name=payload.get("name", "Unknown"),
            score=item.score,
            reasoning=item.reasoning,
            matched_skills=item.matched_skills,
            profile=_point_to_profile(payload),
        ))

    return results
