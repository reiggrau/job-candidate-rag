import { useState } from 'react';
import type { Profile } from '../types';
import ItemCard from './ItemCard';

interface QuickAccessProps {
	isFetching: boolean;
	items: Profile[];
	selectedItem: Profile | null;
	setSelectedItem: (item: Profile | null) => void;
}

export default function QuickAccess(props: QuickAccessProps) {
	const { isFetching, items, selectedItem, setSelectedItem } = props;

	const [isOpen, setIsOpen] = useState(false);

	return (
		<div
			id="QuickAccess"
			className={`relative w-[250px] ${isOpen ? 'left-0' : '-left-[250px]'} h-full flex-col gap-2 p-2 pr-0 pb-0 border-r border-[var(--border)] transition-left duration-300 bg-[var(--bg-highlight)]`}
		>
			<h4>Quick access:</h4>
			<div className="flex-grow overflow-y-scroll flex flex-col gap-2 pb-4">
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
							selectedItem={selectedItem}
							onSelect={() => setSelectedItem(item)}
						/>
					))
				)}
			</div>
		</div>
	);
}
