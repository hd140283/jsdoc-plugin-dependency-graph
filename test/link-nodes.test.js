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

	it('reads the characters Graphviz writes as entities', () => {
		const svg =
			'<a xlink:href="jsdoc://src/a&amp;b.js">' +
			'<a xlink:href="jsdoc://src/it&#39;s.js">' +
			'<a xlink:href="jsdoc://src/&lt;x&gt;&quot;.js">' +
			'<a xlink:href="jsdoc://src/&amp;lt;.js">';
		const pages = new Map([
			['src/a&b.js', 'global.html#a'],
			["src/it's.js", 'global.html#b'],
			['src/<x>".js', 'global.html#c'],
			['src/&lt;.js', 'global.html#d'],
		]);
		expect(linkNodes(svg, 'jsdoc://', pages)).toBe(
			'<a xlink:href="global.html#a">' +
				'<a xlink:href="global.html#b">' +
				'<a xlink:href="global.html#c">' +
				'<a xlink:href="global.html#d">',
		);
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
