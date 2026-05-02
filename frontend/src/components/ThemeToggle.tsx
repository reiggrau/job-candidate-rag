import { useEffect, useState } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

export default function ThemeToggle() {
	const [dark, setDark] = useState(
		() => window.matchMedia('(prefers-color-scheme: dark)').matches,
	);

	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark);
	}, [dark]);

	return (
		<div
			id="ThemeToggle"
			className="cursor-pointer text-gray-200 hover:text-white transition-colors"
			onClick={() => setDark((prev) => !prev)}
			aria-label="Toggle dark mode"
		>
			{dark ? (
				<DarkModeIcon className="animate-spin-out" />
			) : (
				<LightModeIcon className="animate-spin-out" />
			)}
		</div>
	);
}
