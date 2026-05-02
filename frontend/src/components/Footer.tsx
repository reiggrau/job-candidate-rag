import VisitRepo from './VisitRepo';

export default function Footer() {
	return (
		<footer
			id="Footer"
			className="absolute bottom-0 w-full h-[var(--footer-height)] px-4 flex justify-between items-center"
		>
			<a
				href="https://www.linkedin.com/in/reig-grau/"
				target="_blank"
				rel="noopener noreferrer"
			>
				<h6 className="!text-[var(--text)] hover:underline">
					© 2026 ReigGrau™ All Rights Reserved
				</h6>
			</a>
			<VisitRepo />
		</footer>
	);
}
