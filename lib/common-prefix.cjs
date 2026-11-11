'use strict';

const path = require('node:path');

/**
 * Common directory prefix of a set of paths, trailing separator included
 * (jsdoc/path.commonPrefix). Templates strip it to get the "shortened" path
 * that names source pages.
 * @function
 * @param {string[]} paths
 * @param {string} cwd
 * @returns {string}
 */
const commonPrefix = (paths, cwd) => {
	if (paths.length === 0) return '';
	if (paths.length === 1) {
		let prefix = path.resolve(cwd, paths[0]);
		if (path.extname(prefix)) prefix = path.dirname(prefix);
		return prefix + path.sep;
	}

	let segments;
	for (const candidate of paths) {
		const current = path.resolve(cwd, candidate).split(path.sep);
		if (segments === undefined) {
			segments = current;
			continue;
		}
		if (segments.length === 0) break;
		let shared = 0;
		while (shared < segments.length && shared < current.length && segments[shared] === current[shared]) {
			shared++;
		}
		segments = segments.slice(0, shared);
	}
	if (segments.length && (segments.length > 1 || segments[0] !== '')) {
		segments.push('');
	}
	return segments.join(path.sep);
};

module.exports = { commonPrefix };
