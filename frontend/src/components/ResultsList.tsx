import type { MatchResult } from '../types';
import ResultCard from './ResultCard';

interface ResultsListProps {
	title: string;
	results: MatchResult[];
	onSelect: (item: MatchResult) => void;
}

export default function ResultsList(props: ResultsListProps) {
	const { title, results, onSelect } = props;

	return (
		<div
			id="ResultsList"
			className="w-[15%] flex flex-col gap-2 p-4 border-l border-[var(--border)]"
		>
			<div className="text-lg font-bold">{title}</div>
			{results.map((result) => (
				<ResultCard key={result.id} result={result} onSelect={onSelect} />
			))}
		</div>
	);
}
