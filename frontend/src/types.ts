export type SearchMode = 'Jobs' | 'Candidates';

export interface Profile {
	id: string;
	name: string | null;
	role: string | null;
	years_experience: number | null;
	seniority: string | null;
	sector: string[];
	hard_skills: string[];
	soft_skills: string[];
	languages: string[];
	location: string | null;
	open_to_remote: boolean | null;
	education: string | null;
	summary: string;
}

export interface MatchResult {
	id: string;
	name: string | null;
	score: number;
	matched_skills: string[];
	reasoning: string;
	profile: Profile;
}

export interface SearchRequest {
	query_text: string;
	direction: 'job_to_candidate' | 'candidate_to_job';
	filters?: Record<string, unknown>;
}

/*
id :  "87dcac0e-4b8c-52fc-afec-06703115360a"
matched_skills : ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS']
name : "Guillem Reig"
reasoning : "This candidate matches all core stack requirements (React, TypeScript, Node.js, PostgreSQL, AWS), has over 7 years of relevant experience, SaaS and AI-driven product background, and is Barcelona-based, though lacks explicit LLM agent pipeline experience."
score : 0.92
profile : {
	name: 'Guillem Reig',
	role: 'Fullstack Engineer',
	seniority: 'senior',
	years_experience: 7.1,
	sector: Array(6),
…}
*/
