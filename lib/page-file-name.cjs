'use strict';

const { NAMESPACES } = require('./namespaces.cjs');

/**
 * File name of the page generated for a longname, following
 * templateHelper.getUniqueFilename minus the de-duplication cache.
 * @function
 * @param {string} longname
 * @returns {string}
 */
const pageFileName = (longname) => {
	const base = (longname || '')
		.replace(new RegExp(`^(${NAMESPACES.join('|')}):`), '$1-')
		.replace(/[\\/?*:|'"<>]/g, '_')
		.replace(/~/g, '-')
		.replace(/#/g, '_')
		.replace(/\([\s\S]*\)$/, '')
		.replace(/^[.-]/, '');
	return `${base.length ? base : '_'}.html`;
};

module.exports = { pageFileName };
