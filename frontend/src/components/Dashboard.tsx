import { useState } from 'react';
import type { Profile } from '../types';
import CardList from './CardList';
import SearchForm from './SearchForm';

interface DashboardProps {
	jobs: Profile[];
	candidates: Profile[];
}

export default function Dashboard(props: DashboardProps) {
	const { jobs, candidates } = props;

	const [description, setDescription] = useState('');
	const [results, setResults] = useState<Profile[]>([]);

	return (
		<div id="Dashboard" className="flex bg-red-500">
			<CardList
				title="Jobs Quick Access"
				items={jobs}
				onSelect={(item) => setDescription(item.summary)}
			/>
			<SearchForm
				description={description}
				onDescriptionChange={setDescription}
			/>
			<CardList title="Search Results" items={results} />
		</div>
	);
}
