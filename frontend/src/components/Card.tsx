import type { Profile } from '../types';

interface CardProps {
	item: Profile;
	onSelect: (item: Profile) => void;
}

export default function Card(props: CardProps) {
	const { item, onSelect } = props;

	return (
		<div
			id="Card"
			className="w-full bg-blue-200 flex flex-col gap-2 p-4 rounded cursor-pointer hover:bg-blue-300"
			onClick={() => onSelect(item)}
		>
			{item.name}
		</div>
	);
}
