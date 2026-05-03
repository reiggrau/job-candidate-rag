import { capitalize } from '../functions';
import type { MatchResult } from '../types';

interface ResultCardProps {
	result: MatchResult;
	selectedResult: MatchResult | null;
	onSelect: (result: MatchResult | null) => void;
}

export default function ResultCard(props: ResultCardProps) {
	const { result, selectedResult, onSelect } = props;

	return (
		<div
			id="ResultCard"
			className={`w-full flex flex-col px-3 py-2 border border-[var(--border)] rounded cursor-pointer bg-[var(--bg-highlight)] hover:bg-[var(--bg-highlight-hover)] ${
				selectedResult?.id === result.id ? 'bg-[var(--bg-highlight-hover)]' : ''
			}`}
			onClick={() => onSelect(result)}
		>
			<h3 className="line-clamp-1">{result.name}</h3>
			<h4 className="line-clamp-1">{result.score}</h4>
			<h5 className="line-clamp-1">
				{capitalize(result.seniority)} {result.role}
			</h5>
			<h6 className="line-clamp-2">{result.matched_skills.join(' · ')}</h6>
		</div>
	);
}
