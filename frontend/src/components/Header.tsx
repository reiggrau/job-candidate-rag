export default function Header() {
	return (
		<div
			id="Header"
			className="absolute w-full flex justify-between items-center justify-items-center px-6 bg-gray-900"
		>
			<div className="flex items-end gap-2">
				<h1>Laborful AI</h1>
				<h2 className="pb-1.5"> Job-to-Candidate AI Assistant</h2>
			</div>
			<div></div>
			<div className="w-[20%] flex justify-end">
				<a href="https://github.com/reiggrau/job-candidate-rag" target="_blank">
					<button>
						Visit Repo{' '}
						<svg className="button-icon" role="presentation" aria-hidden="true">
							<use href="/icons.svg#github-icon"></use>
						</svg>
					</button>
				</a>
			</div>
		</div>
	);
}
