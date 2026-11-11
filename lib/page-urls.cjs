"use strict";

// Work out which generated page documents each source file.
//
// JSDoc's templateHelper can compute these URLs, but it memoises file names to
// keep them unique, and calling it before the template does would shift the
// template's own results (e.g. `global.html` would become `global_.html`). So we
// replicate the naming rules here as pure functions and accept that the rare
// case-insensitive collision is not handled.

const path = require("node:path");

// Doclet kinds that get a page of their own (templateHelper `containers`).
const CONTAINERS = new Set([
	"class",
	"module",
	"external",
	"namespace",
	"mixin",
	"interface",
]);

// Tag-dictionary namespaces: `module:foo` becomes `module-foo.html`.
const NAMESPACES = ["module", "external", "event"];

// Scope punctuation that templateHelper prepends to fragment ids (`#` is skipped).
const SCOPE_PUNCTUATION = { inner: "~", static: "." };

/**
 * File name of the page generated for a longname, following
 * templateHelper.getUniqueFilename minus the de-duplication cache.
 * @param {string} longname
 * @returns {string}
 */
function pageFileName(longname) {
	const base = (longname || "")
		.replace(new RegExp(`^(${NAMESPACES.join("|")}):`), "$1-")
		.replace(/[\\/?*:|'"<>]/g, "_")
		.replace(/~/g, "-")
		.replace(/#/g, "_")
		.replace(/\([\s\S]*\)$/, "")
		.replace(/^[.-]/, "");
	return `${base.length ? base : "_"}.html`;
}

/**
 * Fragment id of a doclet inside its container page (templateHelper.formatNameForLink).
 * @param {object} doclet
 * @returns {string}
 */
function fragmentId(doclet) {
	const namespace = NAMESPACES.includes(doclet.kind) ? `${doclet.kind}:` : "";
	const punctuation = SCOPE_PUNCTUATION[doclet.scope] ?? "";
	return (
		punctuation + namespace + (doclet.name || "") + (doclet.variation || "")
	);
}

/**
 * Common directory prefix of a set of paths, trailing separator included
 * (jsdoc/path.commonPrefix). Templates strip it to get the "shortened" path
 * that names source pages.
 * @param {string[]} paths
 * @param {string} cwd
 * @returns {string}
 */
function commonPrefix(paths, cwd) {
	if (paths.length === 0) return "";
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
		while (
			shared < segments.length &&
			shared < current.length &&
			segments[shared] === current[shared]
		) {
			shared++;
		}
		segments = segments.slice(0, shared);
	}
	if (segments.length && (segments.length > 1 || segments[0] !== "")) {
		segments.push("");
	}
	return segments.join(path.sep);
}

function camelCase(name) {
	return name.replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Pick the page that best represents a file, given its documented doclets.
 * @param {object[]} doclets
 * @param {string} shortened Source path relative to the common prefix, forward slashes.
 * @param {boolean} sourcePages Whether the template emits source pages at all.
 * @returns {string|null}
 */
function pageUrlFor(doclets, shortened, sourcePages) {
	const container =
		doclets.find((doclet) => doclet.kind === "module") ??
		doclets.find((doclet) => CONTAINERS.has(doclet.kind));
	if (container) return encodeURI(pageFileName(container.longname));

	const globals = doclets.filter((doclet) => doclet.scope === "global");
	const stem = camelCase(
		path.posix.basename(shortened).replace(/\.[^.]+$/, ""),
	);
	const main = globals.find((doclet) => doclet.name === stem) ?? globals[0];
	if (main) return encodeURI(`${pageFileName("global")}#${fragmentId(main)}`);

	const member = doclets.find((doclet) => doclet.memberof);
	if (member) {
		return encodeURI(`${pageFileName(member.memberof)}#${fragmentId(member)}`);
	}

	return sourcePages ? encodeURI(pageFileName(shortened)) : null;
}

/**
 * Map every documented source file to the URL of the page that documents it.
 *
 * Preference order per file: its `@module` page; any other container (class,
 * namespace, ...); the global page anchored at a global whose name matches the
 * file name (or the first global); the container page of a member defined in
 * another file; finally the file's own source page. Files without documented
 * doclets are absent from the map, because templates do not emit pages for them.
 *
 * @param {object} input
 * @param {object[]} input.doclets Doclets as passed to `processingComplete`.
 * @param {string} input.cwd JSDoc's working directory (`env.pwd`).
 * @param {boolean} [input.includePrivate=false] Whether `@private` doclets are published (`--private`).
 * @param {boolean} [input.sourcePages=true] Whether the template emits source pages (`templates.default.outputSourceFiles`).
 * @returns {Map<string, string>} Source path relative to `cwd` with forward slashes → URL relative to the output directory.
 */
function pageUrls({
	doclets,
	cwd,
	includePrivate = false,
	sourcePages = true,
}) {
	const byFile = new Map();
	for (const doclet of doclets) {
		if (doclet.undocumented || doclet.ignore || !doclet.meta) continue;
		if (doclet.kind === "package") continue;
		if (doclet.access === "private" && !includePrivate) continue;
		if (doclet.memberof === "<anonymous>") continue;

		const file =
			doclet.meta.path && doclet.meta.path !== "null"
				? path.join(doclet.meta.path, doclet.meta.filename)
				: doclet.meta.filename;
		if (!byFile.has(file)) byFile.set(file, []);
		byFile.get(file).push(doclet);
	}

	const prefix = commonPrefix([...byFile.keys()], cwd);
	const urls = new Map();
	for (const [file, fileDoclets] of byFile) {
		const relative = path.relative(cwd, file).replaceAll("\\", "/");
		const shortened = file.replace(prefix, "").replaceAll("\\", "/");
		const url = pageUrlFor(fileDoclets, shortened, sourcePages);
		if (url) urls.set(relative, url);
	}
	return urls;
}

module.exports = { pageUrls, pageFileName, fragmentId, commonPrefix };
