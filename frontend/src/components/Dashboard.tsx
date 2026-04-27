import { useEffect, useState } from 'react';
import type { MatchResult, Profile } from '../types';
import CardList from './CardList';
import SearchForm from './SearchForm';
import ResultViewer from './ResultViewer';
import { getCandidates, getJobs, search } from '../api';
import ResultsList from './ResultsList';

export default function Dashboard() {
	const [jobs, setJobs] = useState<Profile[]>([]);
	const [candidates, setCandidates] = useState<Profile[]>([]);

	const [searchMode, setSearchMode] = useState<'Jobs' | 'Candidates'>('Jobs');
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
					searchMode === 'Jobs' ? 'job_to_candidate' : 'candidate_to_job',
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
		async function fetchData(searchMode: 'Jobs' | 'Candidates') {
			setIsFetching(true);
			try {
				if (searchMode === 'Jobs') {
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
		<div id="Dashboard" className="h-full flex pt-[var(--header-height)]">
			<CardList
				isFetching={isFetching}
				searchMode={searchMode}
				setSearchMode={setSearchMode}
				items={searchMode === 'Jobs' ? jobs : candidates}
				onSelect={(item) => {
					console.log('Selected item:', item);
					setSelectedItem(item);
				}}
			/>
			<SearchForm
				key={selectedItem?.id ?? 'none'}
				selectedItem={selectedItem}
				handleSearch={searchMatches}
			/>
			<ResultViewer result={selectedResult} />
			<ResultsList
				title="Search Results"
				results={results}
				onSelect={(result) => {
					console.log('Selected result:', result);
					setSelectedResult(result);
				}}
			/>
		</div>
	);
}
