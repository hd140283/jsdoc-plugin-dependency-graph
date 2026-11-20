import { deepMerge } from './deep-merge.mjs';

// Leave third-party packages out of the picture.
const DEFAULT_OPTIONS = {
	doNotFollow: { path: 'node_modules' },
	exclude: { path: 'node_modules' },
};

// Edges drawn as horizontal and vertical segments instead of curves.
const ORTHOGONAL = { graph: { splines: 'ortho' } };

/**
 * Lay dependency-cruiser options over the plugin's defaults: node links that
 * start with the given prefix, no third-party packages, and orthogonal edges.
 *
 * The edges go into the theme dependency-cruiser draws the graph with: the one
 * of the reporter named by `outputType`, or else the one of `dot`. A theme
 * that replaces dependency-cruiser's own is left as it is.
 * @function
 * @param {object} options dependency-cruiser options, as read from a config file.
 * @param {object} context
 * @param {string} context.prefix Prefix for node links.
 * @param {string} context.outputType dependency-cruiser reporter that draws the graph.
 * @returns {{options: object, orthogonalByDefault: boolean}} The merged options, and whether
 *   the orthogonal edges come from the defaults.
 */
export const withDefaultOptions = (options, { prefix, outputType }) => {
	const section = options.reporterOptions?.[outputType]?.theme == null ? 'dot' : outputType;
	const theme = options.reporterOptions?.[section]?.theme;
	const orthogonalByDefault = !theme?.replace && theme?.graph?.splines === undefined;

	const defaults = { ...DEFAULT_OPTIONS, prefix };
	if (orthogonalByDefault) defaults.reporterOptions = { [section]: { theme: ORTHOGONAL } };

	return { options: deepMerge(defaults, options), orthogonalByDefault };
};
