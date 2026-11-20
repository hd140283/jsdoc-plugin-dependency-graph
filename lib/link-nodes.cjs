'use strict';

// Characters Graphviz writes as entities in the attribute values of the SVG.
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

/**
 * Turn the entities in an attribute value of the SVG back into characters.
 * @function
 * @private
 * @param {string} value
 * @returns {string}
 */
const unescapeAttribute = (value) => {
	return value.replace(/&(?:amp|lt|gt|quot|#39);/g, (entity) => ENTITIES[entity]);
};

/**
 * Point the SVG's placeholder links at the generated pages. Nodes whose file has
 * no page lose their `href` and render as plain text.
 * @function
 * @param {string} svg
 * @param {string} prefix Placeholder scheme the links start with.
 * @param {Map.<string, string>} urls Source path → page URL.
 * @returns {string}
 */
const linkNodes = (svg, prefix, urls) => {
	return svg.replaceAll(/\s(?:xlink:)?href="([^"]*)"/g, (match, href) => {
		if (!href.startsWith(prefix)) return match;
		const url = urls.get(unescapeAttribute(href.slice(prefix.length)));
		return url ? match.replace(href, () => url) : '';
	});
};

module.exports = { linkNodes };
