'use strict';

// Assemble the HTML that goes into the Home page.

const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
const style = fs.readFileSync(path.join(ASSETS, 'graph.css'), 'utf8');
const script = fs.readFileSync(path.join(ASSETS, 'graph.js'), 'utf8');

function escapeHtml(text) {
	return String(text)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

/**
 * Point the SVG's placeholder links at the generated pages. Nodes whose file has
 * no page lose their `href` and render as plain text.
 * @param {string} svg
 * @param {string} prefix Placeholder scheme the links start with.
 * @param {Map<string, string>} urls Source path → page URL.
 * @returns {string}
 */
function linkNodes(svg, prefix, urls) {
	return svg.replaceAll(/\s(?:xlink:)?href="([^"]*)"/g, (match, href) => {
		if (!href.startsWith(prefix)) return match;
		const url = urls.get(href.slice(prefix.length));
		return url ? match.replace(href, () => url) : '';
	});
}

/**
 * @param {object} input
 * @param {string} input.svg
 * @param {string|false} input.title Heading text, or `false` for none.
 * @param {{modules: number, dependencies: number}|null} input.stats Counts to show under the heading, or `null`.
 * @param {boolean} input.hoverHighlight Whether to include the hover/pin script.
 * @returns {string}
 */
function buildFragment({ svg, title, stats, hoverHighlight }) {
	const parts = ['<section class="dependency-graph">'];
	if (title) parts.push(`<h2>${escapeHtml(title)}</h2>`);
	if (stats) {
		parts.push(`<p class="dependency-graph__stats">${stats.modules} modules / ${stats.dependencies} dependencies</p>`);
	}
	parts.push(`<div class="dependency-graph__canvas">${svg}</div>`);
	parts.push('</section>');
	parts.push(`<style>\n${style}</style>`);
	if (hoverHighlight) parts.push(`<script>\n${script}</script>`);
	return parts.join('\n');
}

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

module.exports = { buildFragment, linkNodes, placeFragment };
