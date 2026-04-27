import { useState } from 'react';
import type { Profile } from '../types';

interface SearchFormProps {
	selectedItem: Profile | null;
	handleSearch: (description: string) => Promise<void>;
}

export default function SearchForm(props: SearchFormProps) {
	const { selectedItem, handleSearch } = props;

	const [description, setDescription] = useState(
		selectedItem ? selectedItem.summary : '',
	);

	const [loading, setLoading] = useState(false);

	return (
		<div
			id="SearchForm"
			className="flex-grow flex flex-col p-4 border-r border-[var(--border)]"
		>
			<h1 className="text-3xl font-bold text-gray-900">Candidate Search</h1>

			<form
				onSubmit={async (e) => {
					e.preventDefault();
					setLoading(true);
					await handleSearch(description);
					setLoading(false);
				}}
				className="space-y-4"
			>
				<textarea
					className=""
					rows={6}
					placeholder="Paste a job description..."
					value={description}
					onChange={(e) => setDescription(e.target.value)}
				/>
				{/* Phase B: filter panel goes here */}
				<button
					type="submit"
					disabled={loading || !description.trim()}
					className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
				>
					{loading ? 'Searching…' : 'Search'}
				</button>
			</form>
		</div>
	);
}
