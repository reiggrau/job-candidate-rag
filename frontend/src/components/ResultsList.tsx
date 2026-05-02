import { useState } from 'react';
import type { MatchResult } from '../types';
import ResultCard from './ResultCard';

interface ResultsListProps {
	title: string;
	results: MatchResult[];
	setSelectedResult: (result: MatchResult) => void;
}

export default function ResultsList(props: ResultsListProps) {
	const { title, results, setSelectedResult } = props;

	const [isOpen, setIsOpen] = useState(false);

	return (
		<div
			id="ResultsList"
			className={`relative w-[250px] ${isOpen ? 'right-0' : '-right-[250px]'} flex flex-col gap-2 p-4 border-l border-[var(--border)] bg-[var(--bg-highlight)]`}
		>
			<div className="text-lg font-bold">{title}</div>

			{results.map((result) => (
				<ResultCard
					key={result.id}
					result={result}
					onSelect={() => setSelectedResult(result)}
				/>
			))}
		</div>
	);
}
