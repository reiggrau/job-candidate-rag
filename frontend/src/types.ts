export type SearchMode = 'Jobs' | 'Candidates';

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

export interface MatchResult extends Profile {
	score: number;
	reasoning: string;
	matched_skills: string[];
	profile: Profile;
}

export interface SearchRequest {
	query_text: string;
	direction: 'job_to_candidate' | 'candidate_to_job';
	filters?: Record<string, unknown>;
}
