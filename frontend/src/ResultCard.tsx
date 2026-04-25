import type { MatchResult } from './types';

export function ResultCard({ result }: { result: MatchResult }) {
	const percentage = Math.round(result.score * 100);

	return (
		<div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold text-gray-900">{result.name}</h2>
					<p className="text-sm text-gray-500">
						{result.profile.current_role} · {result.profile.seniority} ·{' '}
						{result.profile.location}
					</p>
				</div>
				<span className="text-2xl font-bold text-indigo-600">
					{percentage}%
				</span>
			</div>

			<p className="text-sm text-gray-700 italic">{result.reasoning}</p>

			<div className="flex flex-wrap gap-2">
				{result.matched_skills.map((skill) => (
					<span
						key={skill}
						className="rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700"
					>
						{skill}
					</span>
				))}
			</div>
		</div>
	);
}
