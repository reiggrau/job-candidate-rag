import type { Profile } from '../types';
import ItemCard from './ItemCard';

interface CardListProps {
	isFetching: boolean;
	searchMode: 'Jobs' | 'Candidates';
	setSearchMode: (mode: 'Jobs' | 'Candidates') => void;
	items: Profile[];
	onSelect: (item: Profile) => void;
}

export default function CardList(props: CardListProps) {
	const { isFetching, searchMode, setSearchMode, items, onSelect } = props;

	return (
		<div
			id="CardList"
			className="w-[300px] flex flex-col gap-2 p-4 border-r border-[var(--border)]"
		>
			<div className="flex justify-center gap-2">
				<button
					className={searchMode === 'Jobs' ? '!bg-gray-700' : ''}
					onClick={() => setSearchMode('Jobs')}
				>
					Job Openings
				</button>
				<button
					className={searchMode === 'Candidates' ? '!bg-gray-700' : ''}
					onClick={() => setSearchMode('Candidates')}
				>
					Candidates
				</button>
			</div>
			{isFetching ? (
				<p className="text-sm text-center pt-4 text-gray-500">Loading...</p>
			) : items.length === 0 ? (
				<p className="text-sm text-center pt-4 text-gray-500">
					No items found.
				</p>
			) : (
				items.map((item) => (
					<ItemCard key={item.id} item={item} onSelect={onSelect} />
				))
			)}
		</div>
	);
}
