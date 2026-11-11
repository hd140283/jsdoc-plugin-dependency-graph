'use strict';

/**
 * Combine the fragment with the README HTML JSDoc already prepared.
 * @param {string|undefined} readme
 * @param {string} fragment
 * @param {"prepend"|"append"|"replace"} placement
 * @returns {string}
 */
function placeFragment(readme, fragment, placement) {
	const existing = readme ?? '';
	if (placement === 'replace' || !existing) return fragment;
	if (placement === 'append') return `${existing}\n${fragment}`;
	return `${fragment}\n${existing}`;
}

module.exports = { placeFragment };
