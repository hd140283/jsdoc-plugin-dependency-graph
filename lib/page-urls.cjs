'use strict';

// Work out which generated page documents each source file.
//
// JSDoc's templateHelper can compute these URLs, but it memoises file names to
// keep them unique, and calling it before the template does would shift the
// template's own results (e.g. `global.html` would become `global_.html`). So we
// replicate the naming rules here as pure functions and accept that the rare
// case-insensitive collision is not handled.

const path = require('node:path');
const { commonPrefix } = require('./common-prefix.cjs');
const { fragmentId } = require('./fragment-id.cjs');
const { pageFileName } = require('./page-file-name.cjs');

// Doclet kinds that get a page of their own (templateHelper `containers`).
const CONTAINERS = new Set(['class', 'module', 'external', 'namespace', 'mixin', 'interface']);

/**
 * Convert a kebab-case or snake_case name to camelCase.
 * @function
 * @private
 * @param {string} name
 * @returns {string}
 */
const camelCase = (name) => {
	return name.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
};

/**
 * Whether JSDoc publishes doclets of the given access level. Follows the rules
 * of templateHelper `prune`.
 * @function
 * @private
 * @param {string} [level] The doclet's `access`; absent when it has no access tag.
 * @param {(string|string[])} [access] Access levels to publish (`--access`).
 * @param {boolean} includePrivate Whether `@private` doclets are published (`--private`).
 * @returns {boolean}
 */
const isPublished = (level, access, includePrivate) => {
	if (access?.includes('all')) return true;
	if (level === 'private') return includePrivate || Boolean(access?.includes('private'));
	return !access || access.includes(level ?? 'undefined');
};

/**
 * Pick the page that best represents a file, given its documented doclets.
 * @function
 * @private
 * @param {object[]} doclets
 * @param {string} shortened Source path relative to the common prefix, forward slashes.
 * @param {boolean} sourcePages Whether the template emits source pages at all.
 * @param {Set<string>} containers Longnames of the doclets that get a page of their own.
 * @returns {string|null}
 */
const pageUrlFor = (doclets, shortened, sourcePages, containers) => {
	const container =
		doclets.find((doclet) => doclet.kind === 'module') ?? doclets.find((doclet) => CONTAINERS.has(doclet.kind));
	if (container) return encodeURI(pageFileName(container.longname));

	const globals = doclets.filter((doclet) => doclet.scope === 'global');
	const stem = camelCase(path.posix.basename(shortened).replace(/\.[^.]+$/, ''));
	const main = globals.find((doclet) => doclet.name === stem) ?? globals[0];
	if (main) return encodeURI(`${pageFileName('global')}#${fragmentId(main)}`);

	const member = doclets.find((doclet) => containers.has(doclet.memberof));
	if (member) {
		return encodeURI(`${pageFileName(member.memberof)}#${fragmentId(member)}`);
	}

	return sourcePages ? encodeURI(pageFileName(shortened)) : null;
};

/**
 * Map every documented source file to the URL of the page that documents it.
 *
 * Preference order per file: its `@module` page; any other container (class,
 * namespace, ...); the global page anchored at a global whose name matches the
 * file name (or the first global); the container page of a member defined in
 * another file; finally the file's own source page. Files without published
 * doclets are absent from the map, because templates do not emit pages for them.
 *
 * @function
 * @param {object} input
 * @param {object[]} input.doclets Doclets as passed to `processingComplete`.
 * @param {string} input.cwd JSDoc's working directory (`env.pwd`).
 * @param {(string|string[])} [input.access] Access levels to publish (`--access`).
 * @param {boolean} [input.includePrivate=false] Whether `@private` doclets are published (`--private`).
 * @param {boolean} [input.sourcePages=true] Whether the template emits source pages (`templates.default.outputSourceFiles`).
 * @returns {Map<string, string>} Source path relative to `cwd` with forward slashes → URL relative to the output directory.
 */
const pageUrls = ({ doclets, cwd, access, includePrivate = false, sourcePages = true }) => {
	const byFile = new Map();
	const containers = new Set();
	for (const doclet of doclets) {
		if (doclet.undocumented || doclet.ignore || !doclet.meta) continue;
		if (doclet.kind === 'package') continue;
		if (!isPublished(doclet.access, access, includePrivate)) continue;
		if (doclet.memberof === '<anonymous>') continue;
		if (CONTAINERS.has(doclet.kind)) containers.add(doclet.longname);

		const file =
			doclet.meta.path && doclet.meta.path !== 'null'
				? path.join(doclet.meta.path, doclet.meta.filename)
				: doclet.meta.filename;
		if (!byFile.has(file)) byFile.set(file, []);
		byFile.get(file).push(doclet);
	}

	const prefix = commonPrefix([...byFile.keys()], cwd);
	const urls = new Map();
	for (const [file, fileDoclets] of byFile) {
		const relative = path.relative(cwd, file).replaceAll('\\', '/');
		const shortened = file.replace(prefix, '').replaceAll('\\', '/');
		const url = pageUrlFor(fileDoclets, shortened, sourcePages, containers);
		if (url) urls.set(relative, url);
	}
	return urls;
};

module.exports = { pageUrls };
