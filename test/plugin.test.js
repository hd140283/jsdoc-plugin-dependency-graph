// index.cjs requires `jsdoc/env` and `jsdoc/util/logger`, which only resolve
// inside JSDoc's own module loader. A Node resolve hook points those two
// specifiers at the real files, so the plugin runs against the genuine env
// object and logger. Nothing else is faked: the graph is rendered by the real
// child process on the fixture project.

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
const { handlers } = require('../index.cjs');

const fixture = fileURLToPath(new URL('./fixtures/basic/', import.meta.url));
const sourceFiles = ['src/index.js', 'src/lib/greeting.js', 'src/lib/plain.js', 'src/lib/shout.js'].map((file) =>
	path.join(fixture, file),
);

function doclet(file, extra) {
	return {
		meta: {
			path: path.join(fixture, path.dirname(file)),
			filename: path.basename(file),
		},
		...extra,
	};
}

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
	for (const messages of Object.values(logged)) messages.length = 0;
});

function run(conf) {
	if (conf) env.conf.dependencyGraph = conf;
	handlers.processingComplete({ doclets });
	return env.opts.readme;
}

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

	it('does nothing when JSDoc only explains (-X)', () => {
		env.opts.explain = true;

		expect(run()).toBe(README);
		expect(logged.info).toEqual([]);
	});

	it('does nothing without source files', () => {
		env.sourceFiles = [];

		expect(run()).toBe(README);
		expect(logged.info).toEqual([]);
	});
});
