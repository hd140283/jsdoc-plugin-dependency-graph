'use strict';

/**
 * Combine the fragment with the README HTML JSDoc already prepared.
 * @function
 * @param {string|undefined} readme
 * @param {string} fragment
 * @param {"prepend"|"append"|"replace"} placement
 * @returns {string}
 */
const placeFragment = (readme, fragment, placement) => {
	const existing = readme ?? '';
	if (placement === 'replace' || !existing) return fragment;
	if (placement === 'append') return `${existing}\n${fragment}`;
	return `${fragment}\n${existing}`;
};

module.exports = { placeFragment };
