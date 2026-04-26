import type { Profile, MatchResult, SearchRequest } from './types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:8000';

export async function getJobs() {
	const response = await fetch(`${API_BASE}/jobs`);
	if (!response.ok) {
		const detail = await response.text();
		throw new Error(detail);
	}
	return response.json();
}

export async function getCandidates(): Promise<Profile[]> {
	const response = await fetch(`${API_BASE}/candidates`);
	if (!response.ok) {
		const detail = await response.text();
		throw new Error(detail);
	}
	return response.json();
}

export async function search(payload: SearchRequest): Promise<MatchResult[]> {
	const response = await fetch(`${API_BASE}/search`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		const detail = await response.text();
		throw new Error(detail);
	}
	return response.json();
}
