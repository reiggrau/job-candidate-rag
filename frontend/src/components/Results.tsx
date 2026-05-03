import type { MatchResult, SearchMode } from '../types';
import ResultCard from './ResultCard';

interface ResultsProps {
	results: MatchResult[];
	searchMode: SearchMode;
	isResultsOpen: boolean;
	setIsResultsOpen: (isOpen: boolean) => void;
	selectedResult: MatchResult | null;
	setSelectedResult: (result: MatchResult) => void;
}

export default function Results(props: ResultsProps) {
	const {
		results,
		searchMode,
		isResultsOpen,
		setIsResultsOpen,
		selectedResult,
		setSelectedResult,
	} = props;

	return (
		<div
			id="ResultsList"
			className={`relative w-[250px] ${isResultsOpen ? 'right-0' : '-right-[250px]'} h-full flex-col gap-2 p-0 pl-2 border-l border-[var(--border)] transition-[right] duration-300 bg-[var(--bg-highlight)]`}
		>
			<div className="h-full overflow-y-scroll flex flex-col gap-2 pt-2 pb-10">
				<h3 className="!font-bold">
					Matching {searchMode === 'Jobs' ? 'Jobs' : 'Candidates'}:
				</h3>
				{results.length === 0 ? (
					<p className="text-sm text-center pt-4 text-gray-500">
						No matches yet.
					</p>
				) : (
					results.map((result) => (
						<ResultCard
							key={result.id}
							result={result}
							searchMode={searchMode}
							selectedResult={selectedResult}
							onSelect={() => setSelectedResult(result)}
						/>
					))
				)}
			</div>
			{/* Pull tab */}
			<button
				onClick={() => setIsResultsOpen(!isResultsOpen)}
				className="absolute -left-7 top-1/2 -translate-y-1/2 w-7 !py-3 flex items-center justify-center bg-[var(--bg-highlight)] border !border-1 !border-r-0 !border-[var(--border)] !rounded-none !rounded-l-md cursor-pointer"
				aria-label={isResultsOpen ? 'Close results' : 'Open results'}
			>
				<span
					className="text-[9px] font-semibold tracking-widest text-[var(--text)] uppercase"
					style={{
						writingMode: 'vertical-rl',
						textOrientation: 'mixed',
						// transform: 'rotate(180deg)',
					}}
				>
					Results
				</span>
			</button>
		</div>
	);
}
