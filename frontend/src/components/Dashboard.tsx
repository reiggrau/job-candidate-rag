import { useEffect, useState } from 'react';
import { getCandidates, getJobs, search } from '../api';
import type { MatchResult, Profile, SearchMode } from '../types';
import Header from './Header';
import CandidateSearch from './CandidateSearch';
import Footer from './Footer';

export default function Dashboard() {
	const [jobs, setJobs] = useState<Profile[]>([]);
	const [candidates, setCandidates] = useState<Profile[]>([]);

	const [searchMode, setSearchMode] = useState<SearchMode>('Candidates');
	const [isFetching, setIsFetching] = useState(true);

	const [selectedItem, setSelectedItem] = useState<Profile | null>(null);

	const [results, setResults] = useState<MatchResult[]>([]);
	const [selectedResult, setSelectedResult] = useState<MatchResult | null>(
		null,
	);

	async function searchMatches(description: string) {
		try {
			const results = await search({
				query_text: description,
				direction:
					searchMode === 'Jobs' ? 'candidate_to_job' : 'job_to_candidate',
			});
			console.log('Search results:', results);
			setResults(results);
			setSelectedResult(results[0] || null);
		} catch (error) {
			console.error('Error during search:', error);
		}
	}

	useEffect(() => {
		console.log('Search mode changed. Fetching data...');
		async function fetchData(searchMode: SearchMode) {
			setIsFetching(true);
			try {
				if (searchMode === 'Candidates') {
					const jobs = await getJobs();
					console.log('Fetched jobs:', jobs);
					setJobs(jobs);
				} else {
					const candidates = await getCandidates();
					console.log('Fetched candidates:', candidates);
					setCandidates(candidates);
				}
			} catch (error) {
				console.error('Error fetching data:', error);
			}
		}

		fetchData(searchMode).finally(() => setIsFetching(false));
	}, [searchMode]);

	return (
		<div id="Dashboard" className="h-full">
			<Header searchMode={searchMode} setSearchMode={setSearchMode} />
			{/* <QuickAccess
					isFetching={isFetching}
					items={searchMode === 'Jobs' ? candidates : jobs}
					selectedItem={selectedItem}
					setSelectedItem={setSelectedItem}
				/> */}
			<main className="h-full w-full pt-[var(--header-height)] pb-[var(--footer-height)]">
				<CandidateSearch
					key={selectedItem?.id ?? 'none'}
					selectedItem={selectedItem}
					setSelectedItem={setSelectedItem}
					handleSearch={searchMatches}
				/>
			</main>
			{/* <ResultsList
					title="Search Results"
					results={results}
					setSelectedResult={setSelectedResult}
				/> */}
			<Footer />
		</div>
	);
}
