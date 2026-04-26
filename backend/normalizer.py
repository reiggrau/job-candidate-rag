"""Normalize raw candidate profiles and job descriptions into a standardized schema."""

import json
from openai import OpenAI
from config import settings
from models import (
    NormalizedProfile,
    PROFILE_EXAMPLE_INPUT,
    PROFILE_EXAMPLE_OUTPUT,
    JD_EXAMPLE_INPUT,
    JD_EXAMPLE_OUTPUT,
)

client = OpenAI(api_key=settings.openai_api_key)

SCHEMA = json.dumps(NormalizedProfile.model_json_schema(), indent=2)

# Few-shot blocks rendered at import time from model instances.
# model_dump_json() always reflects the current schema — no manual sync needed.
_PROFILE_FEW_SHOT = (
    f"--- EXAMPLE INPUT ---\n{PROFILE_EXAMPLE_INPUT}\n\n"
    f"--- EXAMPLE OUTPUT ---\n{PROFILE_EXAMPLE_OUTPUT.model_dump_json(indent=2)}\n"
    "--- END EXAMPLE ---\n\nNow extract from the following input:\n"
)

_JD_FEW_SHOT = (
    f"--- EXAMPLE INPUT ---\n{JD_EXAMPLE_INPUT}\n\n"
    f"--- EXAMPLE OUTPUT ---\n{JD_EXAMPLE_OUTPUT.model_dump_json(indent=2)}\n"
    "--- END EXAMPLE ---\n\nNow extract from the following input:\n"
)

PROFILE_SYSTEM_PROMPT = f"""
You are a technical recruiter extracting structured data from candidate profiles.
The profile may be in any language and any format. Always output in English.

Extract the candidate's information and return ONLY a JSON object matching this schema:
{SCHEMA}

Rules:
- 'summary': write a dense, fluent English paragraph (4–6 sentences) in impersonal
  third-person describing the candidate as a professional. Do NOT use first-person ("I",
  "my") or second-person ("you", "your"). Frame it as a description of a person:
  e.g. "Senior backend engineer with 7 years of experience building financial APIs in
  Python and Go, with deep expertise in PostgreSQL and AWS, based in Barcelona."
  This field is used for semantic embedding — make it information-dense, not generic.
- 'hard_skills': list exact, canonical tool/technology names only (e.g. "PostgreSQL",
  not "databases"). List only what is explicitly stated — do NOT infer or expand.
- 'seniority': must be one of: junior | mid | senior | lead | executive
- 'name': extract the candidate's full name if present; null if not found.
- 'years_experience': REQUIRED — must be a number, never null. If not stated explicitly,
  calculate from career dates (sum all role durations). If truly indeterminate, use 0.
- For all other fields: use null for strings, [] for arrays, false for booleans if unknown.
"""

JD_SYSTEM_PROMPT = f"""
You are a technical recruiter extracting structured requirements from a job description.
The JD may be in any language and any format. Always output in English.

Extract the job requirements and return ONLY a JSON object matching this schema:
{SCHEMA}

Rules:
- 'summary': write a dense, fluent English paragraph (4–6 sentences) in impersonal
  third-person describing the ideal candidate as a professional. Do NOT use directives
  ("must have", "we need", "you will") or second-person ("you", "your"). Frame it as
  a description of a person, not a list of requirements:
  e.g. "Senior backend engineer with deep experience in Python and Kubernetes, working
  in FinTech environments, based in Barcelona or open to remote."
  This field is used for semantic embedding — make it information-dense, not generic.
- 'hard_skills': list exact, canonical tool/technology names only (e.g. "React",
  not "frontend frameworks"). List only what is explicitly required or preferred.
- 'seniority': must be one of: junior | mid | senior | lead | executive
- 'name': extract the hiring company's name if stated; otherwise null.
- 'years_experience': REQUIRED — must be a number, never null. Use the minimum years
  stated in the requirements (e.g. "5+ years" → 5). If not stated, infer from seniority
  (junior=1, mid=3, senior=5, lead=7, executive=10). Never return null.
- For all other fields: use null for strings, [] for arrays, false for booleans if unknown.
"""


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


def normalize_profile(raw_text: str) -> NormalizedProfile:
    """Normalize a raw candidate profile into the standardized schema."""
    return _call_llm(PROFILE_SYSTEM_PROMPT, _PROFILE_FEW_SHOT, raw_text)


def normalize_job_description(raw_text: str) -> NormalizedProfile:
    """Normalize a raw job description into the standardized schema."""
    return _call_llm(JD_SYSTEM_PROMPT, _JD_FEW_SHOT, raw_text)
