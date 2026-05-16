import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture } from 'three';
import { Canvas } from '@react-three/fiber';
import type { ShaderMaterial } from 'three';

import vertexShader from '../glsl/vertex.glsl?raw';
import fragmentShader from '../glsl/fragment.glsl?raw';

const COUNT = 300;
const BASE_SIZE = 100;
const BASE_SPEED = 100;
const DEPTH = 10;

const positions = (() => {
	const arr = new Float32Array(COUNT * 3);
	for (let i = 0; i < COUNT * 3; i += 3) {
		arr[i] = (Math.random() - 0.5) * 30; // X
		arr[i + 1] = (Math.random() - 0.5) * 15; // Y
		arr[i + 2] = (i / 3 / COUNT - 1) * DEPTH; // Z: -DEPTH (far, drawn first) → 0 (close, drawn on top)
	}
	return arr;
})();

const aProperties = (() => {
	const arr = new Float32Array(COUNT * 3);
	for (let i = 0; i < COUNT * 3; i += 3) {
		arr[i] = BASE_SIZE * (1 + Math.random()); // Size
		arr[i + 1] = Math.random(); // X vs Y movement weight
		arr[i + 2] = Math.random(); // Phase
	}
	return arr;
})();

// Pastel chromatic spectrum — Cyan, Yellow, Magenta (logo) + full wheel
const PALETTE: [number, number, number][] = [
	[0.549, 0.902, 1.0], // pastel cyan      ← logo
	[1.0, 0.961, 0.549], // pastel yellow    ← logo
	[1.0, 0.588, 0.941], // pastel magenta   ← logo
	[1.0, 0.627, 0.627], // pastel red
	[1.0, 0.784, 0.549], // pastel orange
	[0.745, 1.0, 0.549], // pastel lime
	[0.549, 1.0, 0.667], // pastel green
	[0.55, 0.94, 0.863], // pastel teal
	[0.588, 0.706, 1.0], // pastel blue
	[0.765, 0.608, 1.0], // pastel violet
	[1.0, 0.647, 0.765], // pastel pink
];

const aColor = (() => {
	const arr = new Float32Array(COUNT * 3);
	for (let i = 0; i < COUNT; i++) {
		const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
		arr[i * 3] = c[0]; // R
		arr[i * 3 + 1] = c[1]; // G
		arr[i * 3 + 2] = c[2]; // B
	}
	return arr;
})();

// Canvas texture: white rounded square on transparent background
function makeSquareTexture() {
	const size = 128;
	const canvas = document.createElement('canvas');
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext('2d')!;
	ctx.fillStyle = 'white';
	ctx.beginPath();
	ctx.roundRect(8, 8, size - 16, size - 16, 16); // ~12.5% corner radius, matches logo
	ctx.fill();
	return new CanvasTexture(canvas);
}

export default function ThreeBackground() {
	const matRef = useRef<ShaderMaterial>(null!);

	const texture = useMemo(() => makeSquareTexture(), []);

	const uniforms = useMemo(
		() => ({
			uTime: { value: 0 },
			uBaseSpeed: { value: BASE_SPEED },
			uTexture: { value: texture },
		}),
		[texture],
	);

	useEffect(() => {
		let id: number;

		const tick = () => {
			if (matRef.current) matRef.current.uniforms.uTime.value += 1;
			id = requestAnimationFrame(tick);
		};

		id = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(id);
	}, []);

	return (
		<div
			id="ThreeBackground"
			className="absolute w-full h-full -z-10 blur-[3px]"
		>
			<Canvas camera={{ position: [0, 0, 5], fov: 70 }}>
				<points>
					<bufferGeometry>
						<bufferAttribute
							attach="attributes-position"
							args={[positions, 3]}
						/>
						<bufferAttribute
							attach="attributes-aProperties"
							args={[aProperties, 3]}
						/>
						<bufferAttribute attach="attributes-aColor" args={[aColor, 3]} />
					</bufferGeometry>
					<shaderMaterial
						ref={matRef}
						vertexShader={vertexShader}
						fragmentShader={fragmentShader}
						uniforms={uniforms}
						transparent
						depthWrite={false}
					/>
				</points>
			</Canvas>
		</div>
	);
}
