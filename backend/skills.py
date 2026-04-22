# Implied skills — candidate definitely has these (weight 1.0)
# "If you know A, you know B"
IMPLIES: dict[str, list[str]] = {
    "TypeScript":   ["JavaScript"],
    "React":        ["JavaScript"],
    "Next.js":      ["React", "JavaScript"],
    "Vue":          ["JavaScript"],
    "Angular":      ["TypeScript", "JavaScript"],
    "PostgreSQL":   ["SQL"],
    "MySQL":        ["SQL"],
    "SQLite":       ["SQL"],
    "Pandas":       ["Python"],
    "FastAPI":      ["Python"],
    "Django":       ["Python"],
    "Spring Boot":  ["Java"],
}

# Similar skills — same family, transferable with effort (weight 0.0–1.0)
# "If you know A, you'd pick up B faster than someone starting from zero"
SIMILAR: dict[str, list[tuple[str, float]]] = {
    # UI frameworks
    "React":     [("Vue", 0.6), ("Angular", 0.5), ("Svelte", 0.6)],
    "Vue":       [("React", 0.6), ("Angular", 0.5)],
    "Angular":   [("React", 0.5), ("Vue", 0.5)],

    # SQL databases
    "PostgreSQL": [("MySQL", 0.8), ("SQLite", 0.7), ("MariaDB", 0.8)],
    "MySQL":      [("PostgreSQL", 0.8), ("SQLite", 0.7)],

    # Cloud providers
    "AWS":   [("Azure", 0.6), ("GCP", 0.6)],
    "Azure": [("AWS", 0.6), ("GCP", 0.6)],
    "GCP":   [("AWS", 0.6), ("Azure", 0.6)],

    # Python web frameworks
    "FastAPI":  [("Django", 0.6), ("Flask", 0.7)],
    "Django":   [("FastAPI", 0.6), ("Flask", 0.7)],
}


def expand_skills_weighted(skills: list[str]) -> dict[str, float]:
    """
    Returns a dict of { skill_name: weight } with:
    - 1.0 for explicitly stated skills
    - 1.0 for implied skills (knows A → knows B)
    - 0.x for similar skills (knows A → can adapt to B)

    Higher weight always wins if a skill appears via multiple paths.
    """
    weighted: dict[str, float] = {}

    for skill in skills:
        # Exact skill — full weight
        weighted[skill] = 1.0

        # Implied skills — full weight
        for implied in IMPLIES.get(skill, []):
            weighted[implied] = max(weighted.get(implied, 0.0), 1.0)

        # Similar skills — partial weight
        for similar_skill, weight in SIMILAR.get(skill, []):
            weighted[similar_skill] = max(
                weighted.get(similar_skill, 0.0), weight)

    return weighted
