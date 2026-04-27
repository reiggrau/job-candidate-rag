export default function Header() {
	return (
		<div
			id="Header"
			className="absolute w-full h-[var(--header-height)] flex justify-between items-center justify-items-center px-6 bg-gray-900 border-b border-[var(--border)]"
		>
			<div className="w-[20%]">
				<h1>Laborful</h1>
			</div>
			<div>
				<h2> RAG-based Recruiting AI Assistant</h2>
			</div>
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
