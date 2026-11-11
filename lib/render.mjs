// Render a module dependency graph for a set of source files as SVG.
//
// This module is the documentation-tool-agnostic core of the plugin. It is
// normally run as a child process by index.cjs (job on stdin, result on stdout),
// but `render()` can also be imported directly.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instance } from '@viz-js/viz';
import { cruise, format } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';

// Same search order as the dependency-cruiser CLI.
const CONFIG_FILES = [
	'.dependency-cruiser.json',
	'.dependency-cruiser.js',
	'.dependency-cruiser.cjs',
	'.dependency-cruiser.mjs',
];

// Used when the project has no dependency-cruiser configuration: draw the
// project's own modules and leave third-party packages out of the picture.
const DEFAULT_OPTIONS = {
	doNotFollow: { path: 'node_modules' },
	exclude: { path: 'node_modules' },
};

/**
 * @typedef {object} RenderJob
 * @property {string[]} files Source files to start cruising from, relative to `cwd`.
 * @property {string} [cwd] Project root. dependency-cruiser resolves paths against
 *   `process.cwd()`, so when calling `render()` in-process this must equal it.
 * @property {string} [config] Path to a dependency-cruiser config file. When omitted,
 *   the usual `.dependency-cruiser.*` files are looked up in `cwd`.
 * @property {string} [prefix] Prefix for node links. Each node links to `prefix + source path`.
 */

/**
 * @typedef {object} RenderResult
 * @property {string} svg The graph, starting at `<svg` (no XML prolog).
 * @property {{modules: number, dependencies: number}} stats Node and edge counts of the drawn graph.
 * @property {{report: string}|null} violations dependency-cruiser rule violations, if any.
 */

/**
 * Cruise the given files with dependency-cruiser and draw the result with Graphviz.
 * @function
 * @param {RenderJob} job
 * @returns {Promise<RenderResult>}
 */
export const render = async ({ files, cwd = process.cwd(), config, prefix = '' }) => {
	const options = await loadOptions(cwd, config);
	const { output: result } = await cruise(files, { ...options, prefix });

	const { output: dot } = await format(result, { outputType: 'dot' });
	const viz = await instance();
	const rendered = viz.renderString(dot, { format: 'svg' });
	const svg = rendered.slice(rendered.indexOf('<svg'));

	const violations = await format(result, { outputType: 'err' });

	return {
		svg,
		stats: {
			modules: count(svg, 'class="node"'),
			dependencies: count(svg, 'class="edge"'),
		},
		violations: violations.exitCode === 0 ? null : { report: violations.output },
	};
};

/**
 * Load dependency-cruiser options from the given config file, or from the
 * first `.dependency-cruiser.*` file in `cwd`, falling back to the defaults.
 * @function
 * @private
 * @param {string} cwd
 * @param {string} [config]
 * @returns {Promise<object>}
 */
const loadOptions = async (cwd, config) => {
	const file = config
		? path.resolve(cwd, config)
		: CONFIG_FILES.map((name) => path.join(cwd, name)).find((candidate) => existsSync(candidate));
	if (!file) return DEFAULT_OPTIONS;
	if (config && !existsSync(file)) {
		throw new Error(`dependency-cruiser config not found: ${file}`);
	}
	return extractDepcruiseOptions(file);
};

/**
 * Count the occurrences of a substring.
 * @function
 * @private
 * @param {string} haystack
 * @param {string} needle
 * @returns {number}
 */
const count = (haystack, needle) => {
	return haystack.split(needle).length - 1;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const job = JSON.parse(readFileSync(0, 'utf8'));
	const result = await render(job);
	process.stdout.write(JSON.stringify(result));
}
