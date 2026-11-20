// Render a module dependency graph for a set of source files as SVG.
//
// index.cjs runs this file as a child process: the job arrives on stdin and
// the result leaves on stdout.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Graphviz } from '@hpcc-js/wasm-graphviz';
import { cruise, format } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import { dropExternalModules } from './drop-external-modules.mjs';
import { OUTPUT_TYPES } from './output-types.cjs';

// Same search order as the dependency-cruiser CLI.
const CONFIG_FILES = [
	'.dependency-cruiser.json',
	'.dependency-cruiser.js',
	'.dependency-cruiser.cjs',
	'.dependency-cruiser.mjs',
];

// Edges drawn as horizontal and vertical segments instead of curves.
const ORTHOGONAL = { theme: { graph: { splines: 'ortho' } } };

// Used when the project has no dependency-cruiser configuration: draw the
// project's own modules with orthogonal edges and leave third-party packages
// out of the picture.
const DEFAULT_OPTIONS = {
	doNotFollow: { path: 'node_modules' },
	exclude: { path: 'node_modules' },
	reporterOptions: { dot: ORTHOGONAL, ddot: ORTHOGONAL, archi: ORTHOGONAL, flat: ORTHOGONAL },
};

/**
 * @typedef {object} RenderJob
 * @property {string[]} files Source files to start cruising from, relative to `cwd`.
 * @property {string} [cwd] Project root. dependency-cruiser resolves paths against
 *   `process.cwd()`, so when calling `render()` in-process this must equal it.
 * @property {string} [config] Path to a dependency-cruiser config file. When omitted,
 *   the usual `.dependency-cruiser.*` files are looked up in `cwd`.
 * @property {string} [prefix] Prefix for node links, used unless the dependency-cruiser
 *   config sets one. Each node links to `prefix + source path`.
 * @property {string} [outputType] dependency-cruiser reporter that draws the graph, named as in
 *   `depcruise --output-type`: `dot` (the default), `flat`, `ddot` or `archi`.
 * @property {boolean} [coreModules] Whether Node.js built-ins stay in the graph.
 * @property {boolean} [unresolvableModules] Whether unresolvable imports stay in the graph.
 */

/**
 * @typedef {object} RenderResult
 * @property {string} svg The graph, starting at `<svg` (no XML prolog).
 * @property {string} prefix Prefix the node links were drawn with: the one from the
 *   dependency-cruiser config, or else the job's.
 * @property {{modules: number, dependencies: number}} stats Node and edge counts of the drawn graph.
 * @property {{report: string}|null} violations dependency-cruiser rule violations, if any.
 */

/**
 * Cruise the given files with dependency-cruiser and draw the result with Graphviz.
 * @function
 * @param {RenderJob} job
 * @returns {Promise<RenderResult>}
 */
export const render = async ({
	files,
	cwd = process.cwd(),
	config,
	prefix = '',
	outputType = 'dot',
	coreModules = false,
	unresolvableModules = false,
}) => {
	if (!OUTPUT_TYPES.includes(outputType)) {
		throw new Error(`unsupported outputType "${outputType}". Use one of: ${OUTPUT_TYPES.join(', ')}.`);
	}

	const options = await loadOptions(cwd, config);
	// A prefix in the dependency-cruiser config wins over the one the job asks for.
	const linkPrefix = options.prefix || prefix;
	const { output: cruised } = await cruise(files, { ...options, prefix: linkPrefix });
	const result = dropExternalModules(cruised, { coreModules, unresolvableModules });

	const { output: dot } = await format(result, { outputType });
	let svg;
	try {
		svg = await toSvg(dot);
	} catch (error) {
		// Graphviz cannot route orthogonal edges on large graphs. The default
		// look asked for them on the user's behalf, so it settles for curves.
		if (options !== DEFAULT_OPTIONS) throw error;
		svg = await toSvg(dot.replace('splines="ortho"', 'splines="true"'));
	}

	const violations = await format(result, { outputType: 'err' });

	return {
		svg,
		prefix: linkPrefix,
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
 * Lay out a Graphviz dot program and return it as SVG markup. Every call uses
 * a fresh Graphviz instance, so a failed layout does not affect the next one.
 * @function
 * @private
 * @param {string} dot
 * @returns {Promise<string>} The graph, starting at `<svg` (no XML prolog).
 */
const toSvg = async (dot) => {
	const graphviz = await Graphviz.load();
	try {
		const rendered = graphviz.dot(dot, 'svg');
		return rendered.slice(rendered.indexOf('<svg'));
	} finally {
		Graphviz.unload();
	}
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

// Entry point of the child process. The plugin tests run it for real, but
// coverage is not collected inside a child process.
/* v8 ignore start */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const job = JSON.parse(readFileSync(0, 'utf8'));
	const result = await render(job);
	process.stdout.write(JSON.stringify(result));
}
/* v8 ignore stop */
