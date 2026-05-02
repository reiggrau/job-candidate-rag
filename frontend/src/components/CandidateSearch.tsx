import { useState } from 'react';
import type { Profile } from '../types';
import { Slide } from '@mui/material';

interface CandidateSearchProps {
	selectedItem: Profile | null;
	setSelectedItem: (item: Profile | null) => void;
	handleSearch: (description: string) => Promise<void>;
}

export default function CandidateSearch(props: CandidateSearchProps) {
	const { selectedItem, setSelectedItem, handleSearch } = props;

	const [description, setDescription] = useState(
		selectedItem ? selectedItem.summary : '',
	);

	const [loading, setLoading] = useState(false);

	const [error, setError] = useState<string | null>(null);

	return (
		<div id="SearchForm" className="w-full h-full flex justify-center">
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					setLoading(true);
					await handleSearch(description);
					setLoading(false);
				}}
				className="max-w-[800px] flex-1 flex flex-col items-center py-20"
			>
				<h1 className="!text-6xl">Search a Candidate</h1>
				<h3 className="pb-4">
					Enter a job description, let the AI find the best match
				</h3>
				<textarea
					className="flex-1 w-full max-w-[500px]"
					rows={10}
					placeholder={`Paste a job description'...`}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					minLength={200}
				/>
				<h6 className="relative -top-6 -right-55 h-0">
					{description.length} / 200
				</h6>
				<h5 className="!text-[var(--error)] h-5">{error}</h5>
				<button
					className={`${loading ? '!bg-gray-500' : '!bg-[var(--main-button-color)]'} cursor-pointer !px-8 !py-4 !rounded-xl shadow`}
					disabled={loading || description.trim().length < 200}
				>
					<h2 className="!text-white">
						{loading ? 'Searching…' : 'New Search'}
					</h2>
				</button>
				<h5>
					or choose from the{' '}
					<span className="underline cursor-pointer hover:text-[var(--accent)]">
						available jobs
					</span>
				</h5>
				{/* <div className="flex gap-2 justify-end">
					<button
						type="button"
						className="!bg-gray-700 w-24 justify-center"
						onClick={() => setSelectedItem(null)}
					>
						Clear
					</button>
				</div> */}
			</form>
		</div>
	);
}
