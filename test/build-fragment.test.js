import { describe, expect, it } from 'vitest';
import { buildFragment } from '../lib/build-fragment.cjs';

describe('buildFragment', () => {
	const svg = '<svg></svg>';

	it('includes heading, stats, canvas, stylesheet and script', () => {
		const html = buildFragment({
			svg,
			title: 'Modules',
			stats: { modules: 3, dependencies: 2 },
			hoverHighlight: true,
		});
		expect(html).toContain('<h2>Modules</h2>');
		expect(html).toContain('<p class="dependency-graph__stats">3 modules / 2 dependencies</p>');
		expect(html).toContain(`<div class="dependency-graph__canvas">${svg}</div>`);
		expect(html).toContain('<style>');
		expect(html).toContain('<script>');
		expect(html.indexOf('<h2>')).toBeLessThan(html.indexOf('<p'));
		expect(html.indexOf('<p')).toBeLessThan(html.indexOf('<div'));
	});

	it('escapes the title', () => {
		const html = buildFragment({
			svg,
			title: 'A & <B> "C"',
			stats: null,
			hoverHighlight: false,
		});
		expect(html).toContain('<h2>A &amp; &lt;B&gt; &quot;C&quot;</h2>');
	});

	it('omits heading, stats and script when turned off', () => {
		const html = buildFragment({
			svg,
			title: false,
			stats: null,
			hoverHighlight: false,
		});
		expect(html).not.toContain('<h2>');
		expect(html).not.toContain('<p class="dependency-graph__stats">');
		expect(html).not.toContain('<script>');
		expect(html).toContain('<style>');
	});
});
