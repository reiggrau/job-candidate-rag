import { useState } from 'react';
import { search } from '../api';
import { ResultCard } from '../ResultCard';
import type { MatchResult } from '../types';

interface SearchFormProps {
	description: string;
	onDescriptionChange: (value: string) => void;
}

export default function SearchForm({
	description,
	onDescriptionChange,
}: SearchFormProps) {
	const [results, setResults] = useState<MatchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.SubmitEvent) {
		e.preventDefault();
		if (!description.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const data = await search({ job_description: description });
			setResults(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div id="SearchForm" className="flex-grow min-h-screen px-4 py-12">
			<div className="mx-auto max-w-2xl space-y-8">
				<h1 className="text-3xl font-bold text-gray-900">Candidate Search</h1>

				<form onSubmit={handleSubmit} className="space-y-4">
					<textarea
						className="w-full rounded-lg border border-gray-300 p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						rows={6}
						placeholder="Paste a job description..."
						value={description}
						onChange={(e) => onDescriptionChange(e.target.value)}
					/>
					{/* Phase B: filter panel goes here */}
					<button
						type="submit"
						disabled={loading || !description.trim()}
						className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
					>
						{loading ? 'Searching…' : 'Search'}
					</button>
				</form>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<div className="space-y-4">
					{results.map((r) => (
						<ResultCard key={r.candidate_id} result={r} />
					))}
				</div>
			</div>
		</div>
	);
}
