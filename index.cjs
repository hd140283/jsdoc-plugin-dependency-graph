'use strict';

/**
 * JSDoc plugin entry point.
 *
 * JSDoc fires its plugin events synchronously, while dependency-cruiser and the
 * WASM build of Graphviz are asynchronous. The heavy lifting therefore happens
 * in a child process (lib/render.mjs); this file only wires the result into the
 * Home page by rewriting `env.opts.readme`, which JSDoc has already turned into
 * HTML by the time `processingComplete` fires.
 * @module jsdoc-plugin-dependency-graph
 */

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const env = require('jsdoc/env');
const logger = require('jsdoc/util/logger');
const { pageUrls } = require('./lib/page-urls.cjs');
const { buildFragment } = require('./lib/build-fragment.cjs');
const { linkNodes } = require('./lib/link-nodes.cjs');
const { placeFragment } = require('./lib/place-fragment.cjs');
const { OUTPUT_TYPES } = require('./lib/output-types.cjs');

// Marker scheme used for node links in the generated SVG. dependency-cruiser
// always emits a URL per node (the source path, or nodejs.org / npmjs.com for
// external modules); the prefix tags the ones we are supposed to rewrite. A
// prefix containing "://" is concatenated verbatim instead of being path-joined
// (which would produce backslashes on Windows). A prefix in the
// dependency-cruiser config takes the marker's place, and the links are then
// left as dependency-cruiser drew them.
const LINK_PREFIX = 'jsdoc://';

const DEFAULTS = {
	config: undefined,
	outputType: 'dot',
	placement: 'prepend',
	title: 'Dependency graph',
	stats: true,
	hoverHighlight: true,
	failOnViolation: false,
};

/**
 * Event handlers that JSDoc calls while it runs.
 * @type {object}
 */
exports.handlers = {
	/**
	 * Draw the graph and put it on the Home page once every source file is parsed.
	 * @param {object} event
	 * @param {object[]} event.doclets Every doclet JSDoc collected.
	 */
	processingComplete({ doclets }) {
		// `jsdoc -X` dumps doclets and never renders a Home page.
		if (env.opts.explain) return;

		const conf = { ...DEFAULTS, ...env.conf.dependencyGraph };
		const cwd = env.pwd;
		const files = (env.sourceFiles ?? []).map((file) => path.relative(cwd, file).replaceAll('\\', '/'));
		if (files.length === 0) return;

		if (!OUTPUT_TYPES.includes(conf.outputType)) {
			logger.error(
				`dependency-graph: unsupported outputType "${conf.outputType}". Use one of: ${OUTPUT_TYPES.join(', ')}.`,
			);
			return;
		}

		let rendered;
		try {
			rendered = renderGraph({ files, cwd, config: conf.config, outputType: conf.outputType });
		} catch (error) {
			logger.error(`dependency-graph: could not render the graph.\n${error.stderr || error.message}`);
			return;
		}

		if (rendered.violations) {
			const report = `dependency-graph: dependency-cruiser reported rule violations.\n${rendered.violations.report}`;
			if (conf.failOnViolation) {
				logger.error(report);
			} else {
				logger.warn(report);
			}
		}

		let svg = rendered.svg;
		if (rendered.prefix === LINK_PREFIX) {
			const urls = pageUrls({
				doclets,
				cwd,
				access: env.opts.access,
				includePrivate: Boolean(env.opts.private),
				sourcePages: env.conf.templates?.default?.outputSourceFiles !== false,
			});
			svg = linkNodes(svg, LINK_PREFIX, urls);
		} else {
			logger.info(
				`dependency-graph: nodes link to the prefix in the dependency-cruiser config ("${rendered.prefix}") instead of the generated pages`,
			);
		}
		const fragment = buildFragment({
			svg,
			title: conf.title,
			stats: conf.stats ? rendered.stats : null,
			hoverHighlight: conf.hoverHighlight,
		});
		env.opts.readme = placeFragment(env.opts.readme, fragment, conf.placement);

		logger.info(`dependency-graph: ${rendered.stats.modules} modules, ${rendered.stats.dependencies} dependencies`);
	},
};

/**
 * Run lib/render.mjs in a child process and return its result.
 * @function
 * @private
 * @param {object} job
 * @param {string[]} job.files Source files, relative to `cwd`.
 * @param {string} job.cwd Project root.
 * @param {string} [job.config] Path to a dependency-cruiser config file.
 * @param {string} [job.outputType] dependency-cruiser reporter that draws the graph.
 * @returns {{svg: string, prefix: string, stats: {modules: number, dependencies: number}, violations: ({report: string}|null)}}
 */
const renderGraph = (job) => {
	const stdout = execFileSync(process.execPath, [require.resolve('./lib/render.mjs')], {
		cwd: job.cwd,
		input: JSON.stringify({ ...job, prefix: LINK_PREFIX }),
		encoding: 'utf8',
		maxBuffer: 256 * 1024 * 1024,
		stdio: ['pipe', 'pipe', 'pipe'],
	});
	return JSON.parse(stdout);
};
