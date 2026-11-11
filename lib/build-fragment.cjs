'use strict';

// Assemble the HTML that goes into the Home page.

const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
const style = fs.readFileSync(path.join(ASSETS, 'graph.css'), 'utf8');
const script = fs.readFileSync(path.join(ASSETS, 'graph.js'), 'utf8');

/**
 * Escape text for use in HTML content and attribute values.
 * @function
 * @private
 * @param {*} text
 * @returns {string}
 */
const escapeHtml = (text) => {
	return String(text)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
};

/**
 * Assemble the HTML fragment for the Home page: heading, counts, graph, stylesheet and script.
 * @function
 * @param {object} input
 * @param {string} input.svg The graph as SVG markup.
 * @param {string|false} input.title Heading text, or `false` for none.
 * @param {{modules: number, dependencies: number}|null} input.stats Counts to show under the heading, or `null`.
 * @param {boolean} input.hoverHighlight Whether to include the hover/pin script.
 * @returns {string}
 */
const buildFragment = ({ svg, title, stats, hoverHighlight }) => {
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
};

module.exports = { buildFragment };
