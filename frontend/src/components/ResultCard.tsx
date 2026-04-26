import type { MatchResult } from '../types';

interface ResultCardProps {
	result: MatchResult;
	onSelect?: (item: MatchResult) => void;
}

export default function ResultCard(props: ResultCardProps) {
	const { result, onSelect } = props;

	return (
		<div
			id="ResultCard"
			className="w-full bg-blue-200 flex flex-col gap-2 p-4 rounded cursor-pointer hover:bg-blue-300"
			onClick={() => onSelect?.(result)}
		>
			{result.name} - {result.score}
		</div>
	);
}
