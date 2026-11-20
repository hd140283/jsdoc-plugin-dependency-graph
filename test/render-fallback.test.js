// Graphviz gives up on orthogonal edges once a graph gets large. Building a
// project that big for a test is slow, so Graphviz is replaced by a stand-in
// that fails whenever it is asked for orthogonal edges.

import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '../lib/render.mjs';

// The dot programs the stand-in was asked to lay out.
const programs = vi.hoisted(() => []);

vi.mock('@hpcc-js/wasm-graphviz', () => ({
	Graphviz: {
		load: async () => ({
			dot: (dot) => {
				programs.push(dot);
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
beforeEach(() => {
	programs.length = 0;
});

describe('render when Graphviz cannot route orthogonal edges', { timeout: 60_000 }, () => {
	it.each(['dot', 'flat', 'ddot', 'archi'])(
		'falls back to curves for the default look of outputType %s',
		async (outputType) => {
			const { svg, stats } = await render({ files, cwd: fixture, outputType });

			expect(svg).toBe('<svg><g class="node"></g></svg>');
			expect(stats).toEqual({ modules: 1, dependencies: 0 });
			expect(programs).toHaveLength(2);
			expect(programs[0]).toContain('splines="ortho"');
			expect(programs[1]).toContain('splines="true"');
		},
	);

	it('falls back to curves with a dependency-cruiser config that leaves the edges alone', async () => {
		const { svg } = await render({ files, cwd: fixture, config: 'dependency-cruiser.strict.json' });

		expect(svg).toBe('<svg><g class="node"></g></svg>');
		expect(programs).toHaveLength(2);
	});

	it('reports the failure when a dependency-cruiser config asked for them', async () => {
		await expect(render({ files, cwd: fixture, config: 'dependency-cruiser.ortho.json' })).rejects.toThrow(
			'memory access out of bounds',
		);
		expect(programs).toHaveLength(1);
	});
});
