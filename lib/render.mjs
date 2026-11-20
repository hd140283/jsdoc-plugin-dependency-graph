// Render a module dependency graph for a set of source files as SVG.
//
// Run as a child process, this file reads the job from stdin and writes the
// result to stdout.

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Graphviz } from '@hpcc-js/wasm-graphviz';
import { cruise, format } from 'dependency-cruiser';
import extractDepcruiseOptions from 'dependency-cruiser/config-utl/extract-depcruise-options';
import { dropExternalModules } from './drop-external-modules.mjs';
import { withDefaultOptions } from './with-default-options.mjs';

// Same search order as the dependency-cruiser CLI.
const CONFIG_FILES = [
	'.dependency-cruiser.json',
	'.dependency-cruiser.js',
	'.dependency-cruiser.cjs',
	'.dependency-cruiser.mjs',
	'.dependency-cruiser.ts',
	'.dependency-cruiser.cts',
	'.dependency-cruiser.mts',
];

/**
 * @typedef {object} RenderJob
 * @property {string[]} files Source files to start cruising from, relative to the
 *   working directory.
 * @property {string} [config] Path to a dependency-cruiser config file, resolved against
 *   the working directory. When omitted, the first of `CONFIG_FILES` found there is used.
 * @property {string} [prefix] Prefix for node links, used unless the dependency-cruiser
 *   config sets one. Each node links to `prefix + source path`.
 * @property {string} outputType dependency-cruiser reporter that draws the graph, named as in
 *   `depcruise --output-type`.
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
 * The files and the config file are resolved against the working directory.
 * @function
 * @param {RenderJob} job
 * @returns {Promise.<RenderResult>}
 */
export const render = async ({ files, config, prefix = '', outputType, coreModules, unresolvableModules }) => {
	const { options, orthogonalByDefault } = withDefaultOptions(await loadOptions(config), { prefix, outputType });
	const { output: cruised } = await cruise(files, options);
	const result = dropExternalModules(cruised, { coreModules, unresolvableModules });

	const { output: dot } = await format(result, { outputType });
	let svg;
	try {
		svg = await toSvg(dot);
	} catch (error) {
		// Graphviz cannot route orthogonal edges on large graphs. When the defaults
		// asked for them on the user's behalf, the graph settles for curves.
		if (!orthogonalByDefault) throw error;
		svg = await toSvg(dot.replace('splines="ortho"', 'splines="true"'));
	}

	const violations = await format(result, { outputType: 'err' });

	return {
		svg,
		prefix: options.prefix,
		stats: {
			modules: count(svg, 'class="node"'),
			dependencies: count(svg, 'class="edge"'),
		},
		violations: violations.exitCode === 0 ? null : { report: violations.output },
	};
};

/**
 * Load dependency-cruiser options from the given config file, or from the
 * first of `CONFIG_FILES` found in the working directory.
 * @function
 * @private
 * @param {string} [config] Path to a config file, resolved against the working directory.
 * @returns {Promise.<object>} Empty when no config file is given and none is found.
 * @throws {Error} When the given config file does not exist.
 */
const loadOptions = async (config) => {
	const file = config
		? path.resolve(config)
		: CONFIG_FILES.map((name) => path.resolve(name)).find((candidate) => existsSync(candidate));
	if (!file) return {};
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
 * @returns {Promise.<string>} The graph, starting at `<svg` (no XML prolog).
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

// Entry point of the child process. Coverage is not collected inside a child
// process.
/* v8 ignore start */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const job = JSON.parse(readFileSync(0, 'utf8'));
	const result = await render(job);
	process.stdout.write(JSON.stringify(result));
}
/* v8 ignore stop */
