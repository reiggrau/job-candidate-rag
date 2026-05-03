import { capitalize } from '../functions';
import type { Profile } from '../types';

interface ItemCardProps {
	item: Profile;
	searchMode: string;
	selectedItem: Profile | null;
	onSelect: (item: Profile) => void;
}

export default function ItemCard(props: ItemCardProps) {
	const { item, searchMode, selectedItem, onSelect } = props;

	return (
		<div
			id="ItemCard"
			className={`w-full flex flex-col px-3 py-2 border border-[var(--border)] rounded cursor-pointer bg-[var(--bg-highlight)] hover:bg-[var(--bg-highlight-hover)] ${
				selectedItem?.id === item.id ? 'bg-[var(--bg-highlight-hover)]' : ''
			}`}
			onClick={() => onSelect(item)}
		>
			<h3 className="line-clamp-1">
				{item.name ||
					(searchMode === 'Jobs' ? 'Unnamed Company' : 'Unnamed Candidate')}
			</h3>
			<h4 className="line-clamp-1">{item.role || 'N/A'}</h4>
			<h5 className="line-clamp-1">
				{capitalize(item.seniority ?? '')} -{' '}
				{item.open_to_remote ? 'Remote' : 'On-site'} - {item.location ?? 'N/A'}
			</h5>
			<h6 className="line-clamp-2">{item.hard_skills.join(' · ')}</h6>
		</div>
	);
}
