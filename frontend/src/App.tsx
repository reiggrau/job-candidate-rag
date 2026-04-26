import { useEffect, useState } from 'react';
import { getJobs, getCandidates } from './api';
import type { Profile } from './types';
import Dashboard from './components/Dashboard';
import Header from './components/Header';

function App() {
	const [jobs, setJobs] = useState<Profile[]>([]);
	const [candidates, setCandidates] = useState<Profile[]>([]);

	useEffect(() => {
		console.log('App mounted. Fetching initial data...');

		async function fetchInitialData() {
			try {
				const jobs = await getJobs();
				console.log('Fetched jobs:', jobs);
				setJobs(jobs);

				const candidates = await getCandidates();
				console.log('Fetched candidates:', candidates);
				setCandidates(candidates);
			} catch (error) {
				console.error('Error fetching initial data:', error);
			}
		}

		fetchInitialData();
	}, []);
	return (
		<div id="App" className="flex flex-col">
			<Header />
			<Dashboard jobs={jobs} candidates={candidates} />
		</div>
	);
}

export default App;
