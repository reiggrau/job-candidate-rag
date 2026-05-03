export type SearchMode = 'Jobs' | 'Candidates';

export interface Profile {
	name: string;
	summary: string;
	role: string;
	seniority: string;
	years_experience: number;
	sector: string[];
	hard_skills: string[];
	soft_skills: string[];
	languages: string[];
	location: string;
	open_to_remote: boolean;
	education?: string | null;
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
