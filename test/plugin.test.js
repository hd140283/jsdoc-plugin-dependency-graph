// index.cjs requires `jsdoc/env` and `jsdoc/util/logger`, which only resolve
// inside JSDoc's own module loader. A Node resolve hook points those two
// specifiers at the real files, so the plugin runs against the genuine env
// object and logger. The graph is rendered by the real child process on the
// fixture project; only the test for a child process that cannot start swaps
// `execFileSync` for a stand-in.

import { createRequire, registerHooks } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const jsdocLib = path.join(path.dirname(require.resolve('jsdoc/package.json')), 'lib', 'jsdoc');
const JSDOC_MODULES = {
	'jsdoc/env': path.join(jsdocLib, 'env.js'),
	'jsdoc/util/logger': path.join(jsdocLib, 'util', 'logger.js'),
};

const hook = registerHooks({
	resolve(specifier, context, nextResolve) {
		const file = JSDOC_MODULES[specifier];
		if (!file) return nextResolve(specifier, context);
		return { url: pathToFileURL(file).href, shortCircuit: true };
	},
});
afterAll(() => hook.deregister());

const env = require('jsdoc/env');
const logger = require('jsdoc/util/logger');

// index.cjs takes `execFileSync` from child_process when it loads. Route the
// call through a variable first, so a test can replace it afterwards.
const childProcess = require('node:child_process');
const realExecFileSync = childProcess.execFileSync;
let execFileSync = realExecFileSync;
childProcess.execFileSync = (...args) => execFileSync(...args);
afterAll(() => {
	childProcess.execFileSync = realExecFileSync;
});

const { handlers } = require('../index.cjs');

const fixture = fileURLToPath(new URL('./fixtures/basic/', import.meta.url));
const externals = fileURLToPath(new URL('./fixtures/externals/', import.meta.url));
const sourceFiles = ['src/index.js', 'src/lib/greeting.js', 'src/lib/plain.js', 'src/lib/shout.js'].map((file) =>
	path.join(fixture, file),
);

const doclet = (file, extra) => {
	return {
		meta: {
			path: path.join(fixture, path.dirname(file)),
			filename: path.basename(file),
		},
		...extra,
	};
};

const doclets = [
	doclet('src/index.js', {
		kind: 'module',
		longname: 'module:app',
		name: 'app',
	}),
	doclet('src/lib/greeting.js', {
		kind: 'module',
		longname: 'module:greeting',
		name: 'greeting',
	}),
	doclet('src/lib/shout.js', {
		kind: 'function',
		longname: 'shout',
		name: 'shout',
		scope: 'global',
	}),
];

const README = '<p>Hello from the README</p>';

// The logger is JSDoc's real one; keep it quiet and collect what the plugin logs.
logger.setLevel(logger.LEVELS.SILENT);
const logged = { error: [], warn: [], info: [] };
for (const level of Object.keys(logged)) {
	logger.on(`logger:${level}`, (message) => logged[level].push(message));
}

beforeEach(() => {
	env.pwd = fixture;
	env.opts = { readme: README };
	env.conf = {};
	env.sourceFiles = sourceFiles;
	execFileSync = realExecFileSync;
	for (const messages of Object.values(logged)) messages.length = 0;
});

const run = (conf) => {
	if (conf) env.conf.dependencyGraph = conf;
	handlers.processingComplete({ doclets });
	return env.opts.readme;
};

describe('processingComplete', { timeout: 60_000 }, () => {
	it('puts a linked graph in front of the README', () => {
		const readme = run();

		expect(readme).toContain('<h2>Dependency graph</h2>');
		expect(readme).toContain('4 modules / 3 dependencies');
		expect(readme).toContain('href="module-app.html"');
		expect(readme).toContain('href="module-greeting.html"');
		expect(readme).toContain('href="global.html#shout"');
		expect(readme).not.toContain('jsdoc://');
		expect(readme.indexOf('<svg')).toBeLessThan(readme.indexOf(README));
		expect(readme).toContain('<script>');

		expect(logged.info).toEqual(['dependency-graph: 4 modules, 3 dependencies']);
		expect(logged.warn).toEqual([]);
		expect(logged.error).toEqual([]);
	});

	it('honours the configuration', () => {
		const readme = run({
			title: 'Modules',
			placement: 'replace',
			stats: false,
			hoverHighlight: false,
		});

		expect(readme).toContain('<h2>Modules</h2>');
		expect(readme).not.toContain('modules /');
		expect(readme).not.toContain('<script>');
		expect(readme).not.toContain(README);
	});

	it('links only the pages JSDoc publishes under --access', () => {
		env.opts.access = 'public';
		const readme = run();

		expect(readme).toContain('4 modules / 3 dependencies');
		expect(readme).not.toContain('href="module-app.html"');
		expect(readme).not.toContain('href="global.html#shout"');
		expect(readme).not.toContain('jsdoc://');
	});

	it('leaves the links to the prefix in a dependency-cruiser config', () => {
		const readme = run({ config: 'dependency-cruiser.prefix.json' });

		expect(readme).toContain('href="vscode://file/project/src/index.js"');
		expect(readme).toContain('href="vscode://file/project/src/lib/plain.js"');
		expect(readme).not.toContain('href="module-app.html"');
		expect(logged.info).toEqual([
			'dependency-graph: nodes link to the prefix in the dependency-cruiser config ("vscode://file/project/") instead of the generated pages',
			'dependency-graph: 4 modules, 3 dependencies',
		]);
		expect(logged.warn).toEqual([]);
		expect(logged.error).toEqual([]);
	});

	it('leaves the links to the source files with an empty prefix in a dependency-cruiser config', () => {
		const readme = run({ config: 'dependency-cruiser.empty-prefix.json' });

		expect(readme).toContain('href="src/index.js"');
		expect(readme).not.toContain('href="module-app.html"');
		expect(logged.info).toEqual([
			'dependency-graph: the prefix in the dependency-cruiser config is empty, so nodes link to the source files instead of the generated pages',
			'dependency-graph: 4 modules, 3 dependencies',
		]);
	});

	it('draws the graph with the reporter named by outputType', () => {
		const readme = run({ outputType: 'archi' });

		// src/index.js and the src/lib folder
		expect(readme).toContain('2 modules / 1 dependencies');
		expect(logged.error).toEqual([]);
	});

	it.each([
		['leaves built-ins and unresolvable imports out', undefined, '2 modules, 1 dependencies'],
		['keeps the built-ins with coreModules', { coreModules: true }, '3 modules, 2 dependencies'],
		[
			'keeps the unresolvable imports with unresolvableModules',
			{ unresolvableModules: true },
			'3 modules, 2 dependencies',
		],
	])('%s', (_description, conf, counts) => {
		env.pwd = externals;
		env.sourceFiles = [path.join(externals, 'src', 'index.js'), path.join(externals, 'src', 'local.js')];
		run(conf);

		expect(logged.info).toEqual([`dependency-graph: ${counts}`]);
		expect(logged.error).toEqual([]);
	});

	it('logs an error and leaves the README alone when outputType is not supported', () => {
		const readme = run({ outputType: 'mermaid' });

		expect(readme).toBe(README);
		expect(logged.error).toEqual([
			'dependency-graph: unsupported outputType "mermaid". Use one of: dot, flat, ddot, archi.',
		]);
	});

	it('warns about rule violations and still draws the graph', () => {
		const readme = run({ config: 'dependency-cruiser.strict.json' });

		expect(readme).toContain('<svg');
		expect(logged.warn).toHaveLength(1);
		expect(logged.warn[0]).toContain('rule violations');
		expect(logged.warn[0]).toContain('no-shouting');
		expect(logged.error).toEqual([]);
	});

	it('reports violations as errors when failOnViolation is set', () => {
		run({ config: 'dependency-cruiser.strict.json', failOnViolation: true });

		expect(logged.error).toHaveLength(1);
		expect(logged.error[0]).toContain('no-shouting');
		expect(logged.warn).toEqual([]);
	});

	it('logs an error and leaves the README alone when rendering fails', () => {
		const readme = run({ config: 'nope.json' });

		expect(readme).toBe(README);
		expect(logged.error).toHaveLength(1);
		expect(logged.error[0]).toContain('could not render the graph');
		expect(logged.error[0]).toContain('nope.json');
	});

	it('logs the reason when the child process cannot start', () => {
		execFileSync = () => {
			throw new Error('spawnSync node ENOENT');
		};

		expect(run()).toBe(README);
		expect(logged.error).toEqual(['dependency-graph: could not render the graph.\nspawnSync node ENOENT']);
	});

	it('does nothing when JSDoc only explains (-X)', () => {
		env.opts.explain = true;

		expect(run()).toBe(README);
		expect(logged.info).toEqual([]);
	});

	it.each([
		['an empty list of source files', []],
		['no list of source files', undefined],
	])('does nothing with %s', (_description, files) => {
		env.sourceFiles = files;

		expect(run()).toBe(README);
		expect(logged.info).toEqual([]);
	});
});
