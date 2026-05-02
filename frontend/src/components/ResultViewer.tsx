import type { Profile } from '../types';

interface ResultViewerProps {
	result: Profile | null;
}

export default function ResultViewer(props: ResultViewerProps) {
	const { result } = props;

	return (
		<div id="ResultViewer" className="flex-grow w-full p-4">
			{result ? (
				<>
					<h1>{result.name}</h1>
					<p>
						{result.role} · {result.seniority} · {result.location}
					</p>
				</>
			) : (
				<p>No result selected</p>
			)}
		</div>
	);
}
