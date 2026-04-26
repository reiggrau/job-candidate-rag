import { useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import { getJobs } from './api';

function App() {
	useEffect(() => {
		console.log('App mounted. Fetching initial data...');

		getJobs();
	}, []);
	return (
		<div id="App" className="flex flex-col">
			<Header />
			<Dashboard />
		</div>
	);
}

export default App;
