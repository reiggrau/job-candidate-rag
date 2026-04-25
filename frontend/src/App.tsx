import { useState } from 'react';
import { search } from './api';
import { ResultCard } from './ResultCard';
import type { MatchResult } from './types';
import reactLogo from './assets/react.svg';
import viteLogo from './assets/vite.svg';
import heroImg from './assets/hero.png';
import './App.css';

function App() {
	const [count, setCount] = useState(0);
	const [jd, setJd] = useState('');
	const [results, setResults] = useState<MatchResult[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(e: React.SubmitEvent) {
		e.preventDefault();
		if (!jd.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const data = await search({ job_description: jd });
			setResults(data);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Unknown error');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="min-h-screen bg-gray-50 px-4 py-12">
			<div className="mx-auto max-w-2xl space-y-8">
				<h1 className="text-3xl font-bold text-gray-900">Candidate Search</h1>

				<form onSubmit={handleSubmit} className="space-y-4">
					<textarea
						className="w-full rounded-lg border border-gray-300 p-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
						rows={6}
						placeholder="Paste a job description..."
						value={jd}
						onChange={(e) => setJd(e.target.value)}
					/>
					{/* Phase B: filter panel goes here */}
					<button
						type="submit"
						disabled={loading || !jd.trim()}
						className="rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
					>
						{loading ? 'Searching…' : 'Search'}
					</button>
				</form>

				{error && <p className="text-sm text-red-600">{error}</p>}

				<div className="space-y-4">
					{results.map((r) => (
						<ResultCard key={r.candidate_id} result={r} />
					))}
				</div>
			</div>
		</div>
	);

	return (
		<>
			<section id="center">
				<div className="hero">
					<img src={heroImg} className="base" width="170" height="179" alt="" />
					<img src={reactLogo} className="framework" alt="React logo" />
					<img src={viteLogo} className="vite" alt="Vite logo" />
				</div>
				<div>
					<h1>Get started</h1>
					<p>
						Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
					</p>
				</div>
				<button
					type="button"
					className="counter"
					onClick={() => setCount((count) => count + 1)}
				>
					Count is {count}
				</button>
			</section>

			<div className="ticks"></div>

			<section id="next-steps">
				<div id="docs">
					<svg className="icon" role="presentation" aria-hidden="true">
						<use href="/icons.svg#documentation-icon"></use>
					</svg>
					<h2>Documentation</h2>
					<p>Your questions, answered</p>
					<ul>
						<li>
							<a href="https://vite.dev/" target="_blank">
								<img className="logo" src={viteLogo} alt="" />
								Explore Vite
							</a>
						</li>
						<li>
							<a href="https://react.dev/" target="_blank">
								<img className="button-icon" src={reactLogo} alt="" />
								Learn more
							</a>
						</li>
					</ul>
				</div>
				<div id="social">
					<svg className="icon" role="presentation" aria-hidden="true">
						<use href="/icons.svg#social-icon"></use>
					</svg>
					<h2>Connect with us</h2>
					<p>Join the Vite community</p>
					<ul>
						<li>
							<a href="https://github.com/vitejs/vite" target="_blank">
								<svg
									className="button-icon"
									role="presentation"
									aria-hidden="true"
								>
									<use href="/icons.svg#github-icon"></use>
								</svg>
								GitHub
							</a>
						</li>
						<li>
							<a href="https://chat.vite.dev/" target="_blank">
								<svg
									className="button-icon"
									role="presentation"
									aria-hidden="true"
								>
									<use href="/icons.svg#discord-icon"></use>
								</svg>
								Discord
							</a>
						</li>
						<li>
							<a href="https://x.com/vite_js" target="_blank">
								<svg
									className="button-icon"
									role="presentation"
									aria-hidden="true"
								>
									<use href="/icons.svg#x-icon"></use>
								</svg>
								X.com
							</a>
						</li>
						<li>
							<a href="https://bsky.app/profile/vite.dev" target="_blank">
								<svg
									className="button-icon"
									role="presentation"
									aria-hidden="true"
								>
									<use href="/icons.svg#bluesky-icon"></use>
								</svg>
								Bluesky
							</a>
						</li>
					</ul>
				</div>
			</section>

			<div className="ticks"></div>
			<section id="spacer"></section>
		</>
	);
}

export default App;
