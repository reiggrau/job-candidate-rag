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

Given a job description and a list of candidates, score each candidate's fit from 0.0 to 1.0.

Order results highest score first. For each candidate provide:
  id: copy exactly from the input
  score: float 0.0–1.0
  reasoning: one sentence, third-person, impersonal
  matched_skills: skills present in both the JD and the candidate"""


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
