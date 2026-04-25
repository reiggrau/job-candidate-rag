export interface MatchResult {
	candidate_id: string;
	name: string;
	score: number;
	reasoning: string;
	matched_skills: string[];
	profile: {
		summary: string;
		current_role: string | null;
		seniority: string | null;
		years_experience: number | null;
		location: string | null;
		open_to_remote: boolean | null;
		hard_skills: string[];
	};
}

export interface SearchRequest {
	job_description: string;
	filters?: Record<string, unknown>;
}
