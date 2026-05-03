import ThemeToggle from './ThemeToggle';

interface HeaderProps {
	searchMode: 'Jobs' | 'Candidates';
	setSearchMode: (mode: 'Jobs' | 'Candidates') => void;
}

export default function Header({ searchMode, setSearchMode }: HeaderProps) {
	return (
		<div
			id="Header"
			className="absolute w-full h-[var(--header-height)] flex justify-between items-center px-6 bg-[var(--header-color)] border-b border-[gray-500] shadow-sm"
		>
			<div className="w-[250px] flex items-center gap-2">
				<h1 className="!text-5xl font-bold !text-white pt-1">Laborful</h1>
				<svg
					width="40"
					height="50"
					viewBox="0 0 58 36"
					fill="none"
					xmlns="http://www.w3.org/2000/svg"
				>
					<rect x="0" y="-6" width="24" height="24" rx="3" fill="white" />
					<rect x="0" y="25" width="18" height="18" rx="2" fill="white" />
					<rect x="25" y="25" width="12" height="12" rx="1.5" fill="white" />
				</svg>
			</div>
			<nav className="flex-grow flex gap-12 pl-8">
				<h4
					className={`!font-light hover:!text-blue-300 cursor-pointer ${
						searchMode === 'Candidates' ? '!text-white' : '!text-gray-400'
					}`}
					onClick={() => setSearchMode('Candidates')}
				>
					SEARCH CANDIDATES
				</h4>
				<h4
					className={`!font-light hover:!text-blue-300 cursor-pointer ${
						searchMode === 'Jobs' ? '!text-white' : '!text-gray-400'
					}`}
					onClick={() => setSearchMode('Jobs')}
				>
					SEARCH JOBS
				</h4>
			</nav>
			<div className="w-[250px] flex justify-end">
				<ThemeToggle />
			</div>
		</div>
	);
}
