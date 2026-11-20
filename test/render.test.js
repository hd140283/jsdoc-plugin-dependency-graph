import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { render } from '../lib/render.mjs';

const fixture = fileURLToPath(new URL('./fixtures/basic/', import.meta.url));
const files = ['src/index.js'];

// render() resolves the files and the config file against process.cwd(), so the
// fixture has to be the working directory while it runs.
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
		const { svg, stats, violations } = await render({ files, outputType: 'dot' });

		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).not.toContain('<?xml');
		// index.js, greeting.js, plain.js, shout.js
		expect(stats).toEqual({ modules: 4, dependencies: 3 });
		expect(svg).toContain('src/lib/shout.js');
		expect(violations).toBeNull();
	});

	it('prefixes node links so they can be rewritten later', async () => {
		const { svg, prefix } = await render({ files, prefix: 'jsdoc://', outputType: 'dot' });

		expect(prefix).toBe('jsdoc://');
		expect(svg).toContain('href="jsdoc://src/index.js"');
		expect(svg).toContain('href="jsdoc://src/lib/greeting.js"');
	});

	it('links nodes to the bare source path without a prefix', async () => {
		const { svg, prefix } = await render({ files, outputType: 'dot' });

		expect(prefix).toBe('');
		expect(svg).toContain('href="src/index.js"');
	});

	it('lets the prefix in a dependency-cruiser config win', async () => {
		const { svg, prefix } = await render({
			files,
			config: 'dependency-cruiser.prefix.json',
			prefix: 'jsdoc://',
			outputType: 'dot',
		});

		expect(prefix).toBe('vscode://file/project/');
		expect(svg).toContain('href="vscode://file/project/src/index.js"');
		expect(svg).not.toContain('jsdoc://');
	});

	it('reports rule violations from a dependency-cruiser config', async () => {
		const { violations, stats } = await render({ files, config: 'dependency-cruiser.strict.json', outputType: 'dot' });

		expect(stats.modules).toBe(4);
		expect(violations).not.toBeNull();
		expect(violations.report).toContain('no-shouting');
		expect(violations.report).toContain('src/lib/shout.js');
	});

	it('fails on a missing config file', async () => {
		await expect(render({ files, config: 'nope.json', outputType: 'dot' })).rejects.toThrow(
			/dependency-cruiser config not found: .*nope\.json/,
		);
	});

	it('draws orthogonal edges unless a dependency-cruiser config sets the edges', async () => {
		const byDefault = await render({ files, outputType: 'dot' });
		const untouched = await render({ files, config: 'dependency-cruiser.strict.json', outputType: 'dot' });
		const curved = await render({ files, config: 'dependency-cruiser.curved.json', outputType: 'dot' });

		expect(hasOrthogonalEdges(byDefault.svg)).toBe(true);
		expect(hasOrthogonalEdges(untouched.svg)).toBe(true);
		expect(hasOrthogonalEdges(curved.svg)).toBe(false);
	});

	it.each([
		['dot', { modules: 4, dependencies: 3 }],
		['flat', { modules: 4, dependencies: 3 }],
		// src/index.js and the src/lib folder
		['archi', { modules: 2, dependencies: 1 }],
	])('draws the graph with outputType %s', async (outputType, expected) => {
		const { svg, stats } = await render({ files, outputType });

		expect(svg.startsWith('<svg')).toBe(true);
		expect(stats).toEqual(expected);
	});

	it('draws folders with outputType ddot', async () => {
		const { svg } = await render({ files, outputType: 'ddot' });

		expect(svg).toContain('<title>src/lib</title>');
		expect(svg).not.toContain('greeting.js');
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
		const { svg, stats } = await render({ files, outputType: 'dot' });

		// index.js, local.js
		expect(stats).toEqual({ modules: 2, dependencies: 1 });
		expect(svg).toContain('src/local.js');
		expect(svg).not.toContain('<title>path</title>');
		expect(svg).not.toContain('missingpackage');
	});

	it('leaves them out with a dependency-cruiser config too', async () => {
		const { svg, stats } = await render({ files, config: 'dependency-cruiser.json', outputType: 'dot' });

		expect(stats).toEqual({ modules: 2, dependencies: 1 });
		expect(svg).not.toContain('<title>path</title>');
		expect(svg).not.toContain('missingpackage');
	});

	it('keeps the built-ins with coreModules', async () => {
		const { svg, stats } = await render({ files, outputType: 'dot', coreModules: true });

		expect(stats).toEqual({ modules: 3, dependencies: 2 });
		expect(svg).toContain('<title>path</title>');
		expect(svg).not.toContain('missingpackage');
	});

	it('keeps the unresolvable imports with unresolvableModules', async () => {
		const { svg, stats } = await render({ files, outputType: 'dot', unresolvableModules: true });

		expect(stats).toEqual({ modules: 3, dependencies: 2 });
		expect(svg).not.toContain('<title>path</title>');
		expect(svg).toContain('missingpackage');
	});
});

describe('render on a project with a .dependency-cruiser config file', { timeout: 60_000 }, () => {
	const autoconfig = fileURLToPath(new URL('./fixtures/autoconfig/', import.meta.url));

	beforeAll(() => {
		process.chdir(autoconfig);
	});
	afterAll(() => {
		process.chdir(fixture);
	});

	it('picks the config up without being told where it is', async () => {
		const { svg, stats } = await render({ files, outputType: 'dot' });

		expect(stats).toEqual({ modules: 2, dependencies: 1 });
		// The background colour comes from the theme in .dependency-cruiser.json.
		expect(svg).toContain('lightyellow');
	});

	it.each(['flat', 'ddot', 'archi'])('draws outputType %s with the dot theme in the config', async (outputType) => {
		const { svg } = await render({ files, outputType });

		expect(svg).toContain('lightyellow');
	});
});

describe('render on a project with a TypeScript .dependency-cruiser config file', { timeout: 60_000 }, () => {
	// The background colour tells that the config was read.
	const config = "{ options: { reporterOptions: { dot: { theme: { graph: { bgcolor: 'lightyellow' } } } } } }";
	let project;

	beforeAll(() => {
		project = fs.mkdtempSync(path.join(os.tmpdir(), 'jsdoc-plugin-dependency-graph-typescript-'));
		fs.mkdirSync(path.join(project, 'src'));
		fs.writeFileSync(
			path.join(project, 'package.json'),
			JSON.stringify({ name: 'app', private: true, type: 'module' }),
		);
		fs.writeFileSync(path.join(project, 'src', 'index.js'), 'export const main = 1;\n');
		process.chdir(project);
	});
	afterAll(() => {
		process.chdir(fixture);
		fs.rmSync(project, { recursive: true, force: true });
	});

	it.each([
		['.dependency-cruiser.ts', `const config: object = ${config};\nexport default config;\n`],
		['.dependency-cruiser.cts', `const config: object = ${config};\nmodule.exports = config;\n`],
		['.dependency-cruiser.mts', `const config: object = ${config};\nexport default config;\n`],
	])('picks %s up without being told where it is', async (name, content) => {
		fs.writeFileSync(name, content);
		try {
			const { svg } = await render({ files, outputType: 'dot' });

			expect(svg).toContain('lightyellow');
		} finally {
			fs.rmSync(name);
		}
	});
});

describe('render on a project that depends on a package', { timeout: 60_000 }, () => {
	let project;

	beforeAll(() => {
		project = fs.mkdtempSync(path.join(os.tmpdir(), 'jsdoc-plugin-dependency-graph-package-'));
		const write = (file, content) => {
			fs.mkdirSync(path.dirname(path.join(project, file)), { recursive: true });
			fs.writeFileSync(path.join(project, file), content);
		};
		write(
			'package.json',
			JSON.stringify({ name: 'app', private: true, type: 'module', dependencies: { dep: '1.0.0' } }),
		);
		write('src/index.js', "import 'dep';\n");
		write('node_modules/dep/package.json', JSON.stringify({ name: 'dep', version: '1.0.0', main: 'index.js' }));
		write('node_modules/dep/index.js', 'module.exports = 1;\n');
		write(
			'rules.json',
			JSON.stringify({
				forbidden: [
					{ name: 'no-orphans', severity: 'error', from: { orphan: true }, to: {} },
					{ name: 'no-dep', severity: 'error', from: {}, to: { path: 'node_modules/dep' } },
				],
			}),
		);
		write('exclude.json', JSON.stringify({ options: { exclude: { path: '\\.spec\\.js$' } } }));
		write(
			'packages.json',
			JSON.stringify({ options: { reporterOptions: { dot: { filters: { exclude: { path: '' } } } } } }),
		);
		process.chdir(project);
	});
	afterAll(() => {
		process.chdir(fixture);
		fs.rmSync(project, { recursive: true, force: true });
	});

	it.each([
		['without a dependency-cruiser config', undefined],
		['with a dependency-cruiser config that has rules', 'rules.json'],
		['with a dependency-cruiser config that has an exclude of its own', 'exclude.json'],
	])('leaves the package out %s', async (_description, config) => {
		const { svg, stats } = await render({ files, config, outputType: 'dot' });

		expect(stats).toEqual({ modules: 1, dependencies: 0 });
		expect(svg).not.toContain('node_modules');
	});

	it('still checks the rules against the package it leaves out', async () => {
		const { violations } = await render({ files, config: 'rules.json', outputType: 'dot' });

		expect(violations.report).toContain('no-dep');
		expect(violations.report).not.toContain('no-orphans');
	});

	it('draws the package when the dependency-cruiser config empties the filter', async () => {
		const { svg, stats } = await render({ files, config: 'packages.json', outputType: 'dot' });

		expect(stats).toEqual({ modules: 2, dependencies: 1 });
		expect(svg).toContain('node_modules/dep/index.js');
	});
});

describe('render on a large project', { timeout: 120_000 }, () => {
	// 200 modules with 590 dependencies: far more than the fixtures, and still
	// within what Graphviz routes orthogonal edges for.
	const size = 200;
	let large;

	beforeAll(() => {
		large = fs.mkdtempSync(path.join(os.tmpdir(), 'jsdoc-plugin-dependency-graph-large-'));
		fs.mkdirSync(path.join(large, 'src'));
		fs.writeFileSync(
			path.join(large, 'package.json'),
			JSON.stringify({ name: 'large', private: true, type: 'module' }),
		);
		for (let index = 0; index < size; index++) {
			const imports = [index + 1, index + 2, index + 7]
				.filter((target) => target < size)
				.map((target) => `import './m${target}.js';`);
			fs.writeFileSync(
				path.join(large, 'src', `m${index}.js`),
				`${imports.join('\n')}\nexport const m${index} = ${index};\n`,
			);
		}
		process.chdir(large);
	});
	afterAll(() => {
		process.chdir(fixture);
		fs.rmSync(large, { recursive: true, force: true });
	});

	it('still draws the graph with orthogonal edges', async () => {
		const { svg, stats } = await render({ files: ['src'], outputType: 'dot' });

		expect(svg.startsWith('<svg')).toBe(true);
		expect(stats.modules).toBe(size);
		expect(hasOrthogonalEdges(svg)).toBe(true);
	});
});
