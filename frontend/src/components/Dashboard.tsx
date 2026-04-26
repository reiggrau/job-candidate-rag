import { useState } from 'react';
import type { Profile } from '../types';
import CardList from './CardList';
import SearchForm from './SearchForm';
import ResultViewer from './ResultViewer';

interface DashboardProps {
	jobs: Profile[];
	candidates: Profile[];
}

export default function Dashboard(props: DashboardProps) {
	const { jobs, candidates } = props;

	const [searchMode, setSearchMode] = useState<'Jobs' | 'Candidates'>('Jobs');

	const [selectedItem, setSelectedItem] = useState<Profile | null>(null);

	const [results, setResults] = useState<Profile[]>([]);
	const [selectedResult, setSelectedResult] = useState<Profile | null>(null);

	return (
		<div id="Dashboard" className="flex bg-red-500">
			<CardList
				title={searchMode === 'Jobs' ? 'Job Openings' : 'Candidates'}
				items={searchMode === 'Jobs' ? jobs : candidates}
				onSelect={(item) => setSelectedItem(item)}
			/>
			<SearchForm
				description={selectedItem?.summary || ''}
				onDescriptionChange={() => {}}
			/>
			<ResultViewer result={selectedResult} />
			<CardList
				title="Search Results"
				items={results}
				onSelect={(item) => setSelectedResult(item)}
			/>
		</div>
	);
}
