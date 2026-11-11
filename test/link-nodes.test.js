import { describe, expect, it } from 'vitest';
import { linkNodes } from '../lib/link-nodes.cjs';

describe('linkNodes', () => {
	const urls = new Map([
		['src/index.js', 'module-app.html'],
		['src/lib/shout.js', 'global.html#shout'],
	]);

	it('rewrites placeholder links to the page URLs', () => {
		const svg =
			'<a xlink:href="jsdoc://src/index.js"><text>index</text></a>' +
			'<a href="jsdoc://src/lib/shout.js"><text>shout</text></a>';
		expect(linkNodes(svg, 'jsdoc://', urls)).toBe(
			'<a xlink:href="module-app.html"><text>index</text></a>' + '<a href="global.html#shout"><text>shout</text></a>',
		);
	});

	it('drops the href of nodes that have no page', () => {
		const svg = '<a xlink:href="jsdoc://src/lib/plain.js" xlink:title="plain">';
		expect(linkNodes(svg, 'jsdoc://', urls)).toBe('<a xlink:title="plain">');
	});

	it('leaves links with another scheme alone', () => {
		const svg = '<a href="https://example.com/">';
		expect(linkNodes(svg, 'jsdoc://', urls)).toBe(svg);
	});

	it('does not expand replacement patterns in the URL', () => {
		const svg = '<a href="jsdoc://a.js">';
		expect(linkNodes(svg, 'jsdoc://', new Map([['a.js', '$&.html']]))).toBe('<a href="$&.html">');
	});
});
