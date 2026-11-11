'use strict';

const { NAMESPACES } = require('./namespaces.cjs');

// Scope punctuation that templateHelper prepends to fragment ids (`#` is skipped).
const SCOPE_PUNCTUATION = { inner: '~', static: '.' };

/**
 * Fragment id of a doclet inside its container page (templateHelper.formatNameForLink).
 * @param {object} doclet
 * @returns {string}
 */
function fragmentId(doclet) {
	const namespace = NAMESPACES.includes(doclet.kind) ? `${doclet.kind}:` : '';
	const punctuation = SCOPE_PUNCTUATION[doclet.scope] ?? '';
	return punctuation + namespace + (doclet.name || '') + (doclet.variation || '');
}

module.exports = { fragmentId };
