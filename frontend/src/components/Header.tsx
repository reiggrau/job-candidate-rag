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
			<div className="w-[250px]">
				<h1 className="!text-5xl font-bold text-white pt-1 !text-white">
					Laborful
				</h1>
			</div>
			<nav className="flex-grow flex gap-12">
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
