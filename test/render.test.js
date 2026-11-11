import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render } from '../lib/render.mjs';

const fixture = fileURLToPath(new URL('./fixtures/basic/', import.meta.url));
const files = ['src/index.js'];

// dependency-cruiser resolves paths against process.cwd(), so the fixture has
// to be the working directory while render() runs.
let originalCwd;
beforeAll(() => {
	originalCwd = process.cwd();
	process.chdir(fixture);
});
afterAll(() => {
	process.chdir(originalCwd);
});

// Whether every edge is made of horizontal and vertical segments only.
const hasOrthogonalEdges = (svg) => {
	return svg
		.split('class="edge"')
		.slice(1)
		.every((edge) => {
			const points = / d="([^"]*)"/
				.exec(edge)[1]
				.replace(/[MC]/g, ' ')
				.trim()
				.split(/\s+/)
				.map((point) => point.split(',').map(Number));
			return points.every((point, index) => {
				return index === 0 || point[0] === points[index - 1][0] || point[1] === points[index - 1][1];
			});
		});
};

describe('render', { timeout: 60_000 }, () => {
	it("draws the project's modules as SVG with counts", async () => {
		const { svg, stats, violations } = await render({ files, cwd: fixture });

		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).not.toContain('<?xml');
		// index.js, greeting.js, plain.js, shout.js
		expect(stats).toEqual({ modules: 4, dependencies: 3 });
		expect(svg).toContain('src/lib/shout.js');
		expect(violations).toBeNull();
	});

	it('prefixes node links so they can be rewritten later', async () => {
		const { svg } = await render({ files, cwd: fixture, prefix: 'jsdoc://' });

		expect(svg).toContain('href="jsdoc://src/index.js"');
		expect(svg).toContain('href="jsdoc://src/lib/greeting.js"');
	});

	it('links nodes to the bare source path without a prefix', async () => {
		const { svg } = await render({ files, cwd: fixture });

		expect(svg).toContain('href="src/index.js"');
	});

	it('reports rule violations from a dependency-cruiser config', async () => {
		const { violations, stats } = await render({
			files,
			cwd: fixture,
			config: 'dependency-cruiser.strict.json',
		});

		expect(stats.modules).toBe(4);
		expect(violations).not.toBeNull();
		expect(violations.report).toContain('no-shouting');
		expect(violations.report).toContain('src/lib/shout.js');
	});

	it('fails on a missing config file', async () => {
		await expect(render({ files, cwd: fixture, config: 'nope.json' })).rejects.toThrow(
			/dependency-cruiser config not found: .*nope\.json/,
		);
	});

	it('draws orthogonal edges by default and leaves the look to a dependency-cruiser config', async () => {
		const byDefault = await render({ files, cwd: fixture });
		const configured = await render({ files, cwd: fixture, config: 'dependency-cruiser.strict.json' });

		expect(hasOrthogonalEdges(byDefault.svg)).toBe(true);
		expect(hasOrthogonalEdges(configured.svg)).toBe(false);
	});

	it.each([
		['dot', { modules: 4, dependencies: 3 }],
		['flat', { modules: 4, dependencies: 3 }],
		// src/index.js and the src/lib folder
		['archi', { modules: 2, dependencies: 1 }],
	])('draws the graph with outputType %s', async (outputType, expected) => {
		const { svg, stats } = await render({ files, cwd: fixture, outputType });

		expect(svg.startsWith('<svg')).toBe(true);
		expect(stats).toEqual(expected);
	});

	it('draws folders with outputType ddot', async () => {
		const { svg } = await render({ files, cwd: fixture, outputType: 'ddot' });

		expect(svg).toContain('<title>src/lib</title>');
		expect(svg).not.toContain('greeting.js');
	});

	it.each(['mermaid', 'x-dot-webpage', 'cdot'])('rejects the unsupported outputType %s', async (outputType) => {
		await expect(render({ files, cwd: fixture, outputType })).rejects.toThrow(
			`unsupported outputType "${outputType}". Use one of: dot, flat, ddot, archi.`,
		);
	});
});

describe('render on a project that imports external modules', { timeout: 60_000 }, () => {
	const externals = fileURLToPath(new URL('./fixtures/externals/', import.meta.url));

	beforeAll(() => {
		process.chdir(externals);
	});
	afterAll(() => {
		process.chdir(fixture);
	});

	it('leaves built-ins and unresolvable imports out by default', async () => {
		const { svg, stats } = await render({ files, cwd: externals });

		// index.js, local.js
		expect(stats).toEqual({ modules: 2, dependencies: 1 });
		expect(svg).toContain('src/local.js');
		expect(svg).not.toContain('<title>path</title>');
		expect(svg).not.toContain('missingpackage');
	});

	it('draws them when a dependency-cruiser config is given', async () => {
		const { svg, stats } = await render({ files, cwd: externals, config: 'dependency-cruiser.json' });

		expect(stats.modules).toBe(4);
		expect(svg).toContain('<title>path</title>');
		expect(svg).toContain('missingpackage');
	});
});
