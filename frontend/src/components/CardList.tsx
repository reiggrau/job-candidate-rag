import type { Profile } from '../types';
import ListCard from './ListCard';

interface CardListProps {
	title: string;
	items: Profile[];
	onSelect?: (item: Profile) => void;
}

export default function CardList(props: CardListProps) {
	const { title, items, onSelect } = props;

	return (
		<div id="CardList" className="w-[15%] bg-green-200 flex flex-col gap-2 p-4">
			<div className="text-lg font-bold">{title}</div>
			{items.map((item) => (
				<ListCard key={item.id} item={item} onSelect={onSelect} />
			))}
		</div>
	);
}
