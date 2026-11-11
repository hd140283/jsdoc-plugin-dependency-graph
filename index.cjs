"use strict";

// JSDoc plugin entry point.
//
// JSDoc fires its plugin events synchronously, while dependency-cruiser and the
// WASM build of Graphviz are asynchronous. The heavy lifting therefore happens
// in a child process (lib/render.mjs); this file only wires the result into the
// Home page by rewriting `env.opts.readme`, which JSDoc has already turned into
// HTML by the time `processingComplete` fires.

const { execFileSync } = require("node:child_process");
const path = require("node:path");
const env = require("jsdoc/env");
const logger = require("jsdoc/util/logger");
const { pageUrls } = require("./lib/page-urls.cjs");
const { buildFragment, linkNodes, placeFragment } = require("./lib/embed.cjs");

// Marker scheme used for node links in the generated SVG. dependency-cruiser
// always emits a URL per node (the source path, or nodejs.org / npmjs.com for
// external modules); the prefix tags the ones we are supposed to rewrite. A
// prefix containing "://" is concatenated verbatim instead of being path-joined
// (which would produce backslashes on Windows).
const LINK_PREFIX = "jsdoc://";

const DEFAULTS = {
	config: undefined,
	placement: "prepend",
	title: "Dependency graph",
	stats: true,
	hoverHighlight: true,
	failOnViolation: false,
};

exports.handlers = {
	processingComplete({ doclets }) {
		// `jsdoc -X` dumps doclets and never renders a Home page.
		if (env.opts.explain) return;

		const conf = { ...DEFAULTS, ...env.conf.dependencyGraph };
		const cwd = env.pwd;
		const files = (env.sourceFiles ?? []).map((file) =>
			path.relative(cwd, file).replaceAll("\\", "/"),
		);
		if (files.length === 0) return;

		let rendered;
		try {
			rendered = renderGraph({ files, cwd, config: conf.config });
		} catch (error) {
			logger.error(
				`dependency-graph: could not render the graph.\n${error.stderr || error.message}`,
			);
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

		const urls = pageUrls({
			doclets,
			cwd,
			includePrivate: Boolean(env.opts.private),
			sourcePages: env.conf.templates?.default?.outputSourceFiles !== false,
		});
		const svg = linkNodes(rendered.svg, LINK_PREFIX, urls);
		const fragment = buildFragment({
			svg,
			title: conf.title,
			stats: conf.stats ? rendered.stats : null,
			hoverHighlight: conf.hoverHighlight,
		});
		env.opts.readme = placeFragment(env.opts.readme, fragment, conf.placement);

		logger.info(
			`dependency-graph: ${rendered.stats.modules} modules, ${rendered.stats.dependencies} dependencies`,
		);
	},
};

/**
 * Run lib/render.mjs in a child process and return its result.
 * @param {{files: string[], cwd: string, config?: string}} job
 * @returns {{svg: string, stats: {modules: number, dependencies: number}, violations: ({report: string}|null)}}
 */
function renderGraph(job) {
	const stdout = execFileSync(
		process.execPath,
		[require.resolve("./lib/render.mjs")],
		{
			cwd: job.cwd,
			input: JSON.stringify({ ...job, prefix: LINK_PREFIX }),
			encoding: "utf8",
			maxBuffer: 256 * 1024 * 1024,
			stdio: ["pipe", "pipe", "pipe"],
		},
	);
	return JSON.parse(stdout);
}
