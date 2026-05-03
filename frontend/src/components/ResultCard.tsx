import type { MatchResult } from '../types';

interface ResultCardProps {
	result: MatchResult;
	searchMode: string;
	selectedResult: MatchResult | null;
	onSelect: (result: MatchResult | null) => void;
}

function scoreBadgeColor(score: number): string {
	// 0.3 → rgb(148, 20,  20)  red
	// 1.0 → rgb( 20, 148, 21)  green
	const t = Math.max(0, Math.min(1, (score - 0.3) / 0.7));
	const r = Math.round(148 + t * (20 - 148));
	const g = Math.round(20 + t * (148 - 20));
	const b = Math.round(20 + t * (21 - 20));
	return `rgb(${r}, ${g}, ${b})`;
}

export default function ResultCard(props: ResultCardProps) {
	const { result, searchMode, selectedResult, onSelect } = props;

	return (
		<div
			id="ResultCard"
			className={`w-full flex flex-col px-3 py-2 border border-[var(--border)] rounded cursor-pointer bg-[var(--bg-highlight)] hover:bg-[var(--bg-highlight-hover)] ${
				selectedResult?.id === result.id ? 'bg-[var(--bg-highlight-hover)]' : ''
			}`}
			onClick={() => onSelect(result)}
		>
			<div className="flex items-center justify-between">
				<h3 className="line-clamp-1">
					{result.name
						? result.name
						: searchMode === 'Jobs'
							? 'Unnamed Candidate'
							: 'Unnamed Company'}
				</h3>
				<h5
					className="shrink-0 pr-1 pl-1.5 pt-0.4 rounded !font-bold"
					style={{ backgroundColor: scoreBadgeColor(result.score) }}
				>
					{Math.round(result.score * 100)}%
				</h5>
			</div>
			<h4 className="line-clamp-1">{result.profile.role || 'N/A'}</h4>
			<h5 className="line-clamp-1">{result.profile.location || 'N/A'}</h5>
			<h6 className="line-clamp-2">{result.matched_skills.join(' · ')}</h6>
		</div>
	);
}
