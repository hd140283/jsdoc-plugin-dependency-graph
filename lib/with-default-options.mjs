import { deepMerge } from './deep-merge.mjs';

// Third-party packages are not followed, and not drawn either. The filter
// leaves them in the cruise result, so rules still see them.
const DEFAULT_OPTIONS = { doNotFollow: { path: 'node_modules' } };
const DEFAULT_FILTERS = { exclude: { path: 'node_modules' } };

// Edges drawn as horizontal and vertical segments instead of curves.
const ORTHOGONAL = { graph: { splines: 'ortho' } };

/**
 * Name of the `reporterOptions` section dependency-cruiser reads a reporter
 * option from: the one of the reporter itself, or else the one of `dot`.
 * @function
 * @private
 * @param {object} options dependency-cruiser options.
 * @param {string} outputType dependency-cruiser reporter that draws the graph.
 * @param {string} key Reporter option, such as `theme`.
 * @returns {string}
 */
const sectionOf = (options, outputType, key) => {
	return options.reporterOptions?.[outputType]?.[key] == null ? 'dot' : outputType;
};

/**
 * Lay dependency-cruiser options over the plugin's defaults: node links that
 * start with the given prefix, no third-party packages, and orthogonal edges.
 *
 * The filter and the edges go where dependency-cruiser looks for them when it
 * draws the graph. A theme that replaces dependency-cruiser's own is left as
 * it is.
 * @function
 * @param {object} options dependency-cruiser options, as read from a config file.
 * @param {object} context
 * @param {string} context.prefix Prefix for node links.
 * @param {string} context.outputType dependency-cruiser reporter that draws the graph.
 * @returns {{options: object, orthogonalByDefault: boolean}} The merged options, and whether
 *   the orthogonal edges come from the defaults.
 */
export const withDefaultOptions = (options, { prefix, outputType }) => {
	const themeSection = sectionOf(options, outputType, 'theme');
	const theme = options.reporterOptions?.[themeSection]?.theme;
	const orthogonalByDefault = !theme?.replace && theme?.graph?.splines === undefined;

	let defaults = {
		...DEFAULT_OPTIONS,
		prefix,
		reporterOptions: { [sectionOf(options, outputType, 'filters')]: { filters: DEFAULT_FILTERS } },
	};
	if (orthogonalByDefault) {
		defaults = deepMerge(defaults, { reporterOptions: { [themeSection]: { theme: ORTHOGONAL } } });
	}

	return { options: deepMerge(defaults, options), orthogonalByDefault };
};
