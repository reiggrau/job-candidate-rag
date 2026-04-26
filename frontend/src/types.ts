export interface Profile {
	id: string;
	name?: string | null;
	role: string;
	seniority: string;
	years_experience: number;
	location: string;
	open_to_remote: boolean;
	hard_skills: string[];
	summary: string;
}

export interface MatchResult {
	candidate_id: string;
	name: string;
	score: number;
	reasoning: string;
	matched_skills: string[];
	profile: Profile;
}

export interface SearchRequest {
	job_description: string;
	filters?: Record<string, unknown>;
}
