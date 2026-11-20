'use strict';

/**
 * Values accepted as `placement`, each with the way it combines the README
 * HTML and the fragment.
 * @type {Object.<string, function(string, string): string>}
 */
const PLACEMENTS = {
	prepend: (readme, fragment) => `${fragment}\n${readme}`,
	append: (readme, fragment) => `${readme}\n${fragment}`,
	replace: (_readme, fragment) => fragment,
};

module.exports = { PLACEMENTS };
