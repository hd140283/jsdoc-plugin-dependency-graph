'use strict';

/**
 * Point the SVG's placeholder links at the generated pages. Nodes whose file has
 * no page lose their `href` and render as plain text.
 * @function
 * @param {string} svg
 * @param {string} prefix Placeholder scheme the links start with.
 * @param {Map<string, string>} urls Source path → page URL.
 * @returns {string}
 */
const linkNodes = (svg, prefix, urls) => {
	return svg.replaceAll(/\s(?:xlink:)?href="([^"]*)"/g, (match, href) => {
		if (!href.startsWith(prefix)) return match;
		const url = urls.get(href.slice(prefix.length));
		return url ? match.replace(href, () => url) : '';
	});
};

module.exports = { linkNodes };
