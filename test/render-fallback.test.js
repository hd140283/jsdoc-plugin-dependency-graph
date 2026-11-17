// Graphviz gives up on orthogonal edges once a graph gets large. Building a
// project that big for a test is slow, so Graphviz is replaced by a stand-in
// that fails whenever it is asked for orthogonal edges.

import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { render } from '../lib/render.mjs';

vi.mock('@hpcc-js/wasm-graphviz', () => ({
	Graphviz: {
		load: async () => ({
			dot: (dot) => {
				if (dot.includes('splines="ortho"')) throw new Error('memory access out of bounds');
				return '<svg><g class="node"></g></svg>';
			},
		}),
		unload: () => {},
	},
}));

const fixture = fileURLToPath(new URL('./fixtures/basic/', import.meta.url));
const files = ['src/index.js'];

let originalCwd;
beforeAll(() => {
	originalCwd = process.cwd();
	process.chdir(fixture);
});
afterAll(() => {
	process.chdir(originalCwd);
});

describe('render when Graphviz cannot route orthogonal edges', { timeout: 60_000 }, () => {
	it('falls back to curves for the default look', async () => {
		const { svg, stats } = await render({ files, cwd: fixture });

		expect(svg).toBe('<svg><g class="node"></g></svg>');
		expect(stats).toEqual({ modules: 1, dependencies: 0 });
	});

	it('reports the failure when a dependency-cruiser config asked for them', async () => {
		await expect(render({ files, cwd: fixture, config: 'dependency-cruiser.ortho.json' })).rejects.toThrow(
			'memory access out of bounds',
		);
	});
});
