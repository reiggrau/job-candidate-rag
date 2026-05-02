import { GitHub as GitHubIcon } from '@mui/icons-material';

export default function VisitRepo() {
	return (
		<a
			className="!text-[var(--text)]"
			href="https://github.com/reiggrau/job-candidate-rag"
			target="_blank"
			rel="noopener noreferrer"
		>
			<GitHubIcon className="inline-block w-5 h-5" />
		</a>
	);
}
