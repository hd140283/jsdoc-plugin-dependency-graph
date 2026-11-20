'use strict';

const { PLACEMENTS } = require('./placements.cjs');

/**
 * Combine the fragment with the README HTML JSDoc already prepared.
 * @function
 * @param {string|undefined} readme
 * @param {string} fragment
 * @param {string} placement One of the keys of `PLACEMENTS`.
 * @returns {string}
 */
const placeFragment = (readme, fragment, placement) => {
	if (!readme) return fragment;
	return PLACEMENTS[placement](readme, fragment);
};

module.exports = { placeFragment };
