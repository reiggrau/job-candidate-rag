import type { Profile, SearchMode } from '../types';
import ItemCard from './ItemCard';

interface QuickAccessProps {
	items: Profile[];
	searchMode: SearchMode;
	isFetching: boolean;
	isQuickAccessOpen: boolean;
	setIsQuickAccessOpen: (open: boolean) => void;
	selectedItem: Profile | null;
	setSelectedItem: (item: Profile | null) => void;
}

export default function QuickAccess(props: QuickAccessProps) {
	const {
		items,
		searchMode,
		isFetching,
		isQuickAccessOpen,
		setIsQuickAccessOpen,
		selectedItem,
		setSelectedItem,
	} = props;

	return (
		<div
			id="QuickAccess"
			className={`relative w-[250px] ${isQuickAccessOpen ? 'left-0' : '-left-[250px]'} h-full flex-col gap-2 p-0 pl-2 border-r border-[var(--border)] transition-[left] duration-300 bg-[var(--bg-highlight)] z-10`}
		>
			<div className="h-full overflow-y-scroll flex flex-col gap-2 pt-2 pb-10">
				<h3 className="!font-bold">
					Available {searchMode === 'Jobs' ? 'Candidates' : 'Jobs'}:
				</h3>
				{isFetching ? (
					<p className="text-sm text-center pt-4 text-gray-500">Loading...</p>
				) : items.length === 0 ? (
					<p className="text-sm text-center pt-4 text-gray-500">
						No items found.
					</p>
				) : (
					items.map((item) => (
						<ItemCard
							key={item.id}
							item={item}
							searchMode={searchMode}
							selectedItem={selectedItem}
							onSelect={() => setSelectedItem(item)}
						/>
					))
				)}
			</div>
			{/* Pull tab */}
			<button
				onClick={() => setIsQuickAccessOpen(!isQuickAccessOpen)}
				className="absolute -right-7 top-1/2 -translate-y-1/2 w-7 !py-3 flex items-center justify-center bg-[var(--bg-highlight)] border !border-1 !border-l-0 !border-[var(--border)] !rounded-none !rounded-r-md cursor-pointer"
				aria-label={
					isQuickAccessOpen ? 'Close quick access' : 'Open quick access'
				}
			>
				<span
					className="text-[9px] font-semibold tracking-widest text-[var(--text)] uppercase"
					style={{
						writingMode: 'vertical-rl',
						textOrientation: 'mixed',
						transform: 'rotate(180deg)',
					}}
				>
					Quick Access
				</span>
			</button>
		</div>
	);
}
