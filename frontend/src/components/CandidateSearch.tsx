import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Profile, SearchMode } from '../types';

interface CandidateSearchProps {
	searchMode: SearchMode;
	setIsQuickAccessOpen: Dispatch<SetStateAction<boolean>>;
	selectedItem: Profile | null;
	setSelectedItem: Dispatch<SetStateAction<Profile | null>>;
	handleSearch: (description: string) => Promise<void>;
}

export default function CandidateSearch(props: CandidateSearchProps) {
	const {
		searchMode,
		setIsQuickAccessOpen,
		selectedItem,
		setSelectedItem,
		handleSearch,
	} = props;

	const [description, setDescription] = useState(
		selectedItem ? selectedItem.summary : '',
	);

	const [loading, setLoading] = useState(false);

	// const [error, setError] = useState<string | null>(null);

	return (
		<div id="SearchForm" className="h-full flex-grow flex justify-center">
			<form
				onSubmit={async (e) => {
					e.preventDefault();
					setLoading(true);
					await handleSearch(description);
					setLoading(false);
				}}
				className="max-w-[800px] flex-1 flex flex-col items-center py-20"
			>
				<h1 className="!text-6xl">
					Search a {searchMode.toLowerCase().slice(0, -1)}
				</h1>
				<h3 className="pb-4">
					Enter a {searchMode === 'Candidates' ? 'job' : 'candidate'}{' '}
					description, let the AI find the best match
				</h3>
				<textarea
					className="flex-1 w-full max-w-[500px]"
					rows={10}
					placeholder={`Paste a ${searchMode === 'Candidates' ? 'job' : 'candidate'} description'...`}
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					minLength={200}
				/>
				<div className="relative h-0 -top-2 w-full max-w-[500px] px-3 flex flex-row-reverse justify-between items-end">
					<h6>{description.length} / 200</h6>
					<div className="flex gap-3">
						<button
							type="button"
							className="justify-center !w-16"
							onClick={() => {
								setSelectedItem(null);
								setDescription('');
							}}
							disabled={!description.length}
						>
							Clear
						</button>
						{/* <button
							type="button"
							className="!bg-gray-700 w-24 justify-center !w-16"
							disabled={description.length < 200}
						>
							Save
						</button> */}
					</div>
				</div>
				<h5 className="!text-[var(--error)] h-5"></h5>
				<button
					className={`${loading ? '!bg-gray-500 disabled:!opacity-100' : '!bg-[var(--main-button-color)]'} cursor-pointer !px-8 !py-4 !rounded-xl shadow`}
					disabled={loading || description.trim().length < 200}
				>
					<h2 className="!text-white">
						{loading ? 'Searching' : 'New Search'}
						{loading && (
							<span aria-hidden="true" className="inline-flex">
								<span className="animate-pulse [animation-delay:0ms]">.</span>
								<span className="animate-pulse [animation-delay:300ms]">.</span>
								<span className="animate-pulse [animation-delay:600ms]">.</span>
							</span>
						)}
					</h2>
				</button>
				<h5>
					or choose from the{' '}
					<span
						className="underline cursor-pointer hover:text-[var(--accent)]"
						onClick={() => setIsQuickAccessOpen((prev) => !prev)}
					>
						available {searchMode === 'Candidates' ? 'jobs' : 'candidates'}
					</span>
				</h5>
			</form>
		</div>
	);
}
