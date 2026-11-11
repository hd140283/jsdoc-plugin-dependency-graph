import { describe, expect, it } from "vitest";
import { buildFragment, linkNodes, placeFragment } from "../lib/embed.cjs";

describe("linkNodes", () => {
	const urls = new Map([
		["src/index.js", "module-app.html"],
		["src/lib/shout.js", "global.html#shout"],
	]);

	it("rewrites placeholder links to the page URLs", () => {
		const svg =
			'<a xlink:href="jsdoc://src/index.js"><text>index</text></a>' +
			'<a href="jsdoc://src/lib/shout.js"><text>shout</text></a>';
		expect(linkNodes(svg, "jsdoc://", urls)).toBe(
			'<a xlink:href="module-app.html"><text>index</text></a>' +
				'<a href="global.html#shout"><text>shout</text></a>',
		);
	});

	it("drops the href of nodes that have no page", () => {
		const svg = '<a xlink:href="jsdoc://src/lib/plain.js" xlink:title="plain">';
		expect(linkNodes(svg, "jsdoc://", urls)).toBe('<a xlink:title="plain">');
	});

	it("leaves links with another scheme alone", () => {
		const svg = '<a href="https://example.com/">';
		expect(linkNodes(svg, "jsdoc://", urls)).toBe(svg);
	});

	it("does not expand replacement patterns in the URL", () => {
		const svg = '<a href="jsdoc://a.js">';
		expect(linkNodes(svg, "jsdoc://", new Map([["a.js", "$&.html"]]))).toBe(
			'<a href="$&.html">',
		);
	});
});

describe("buildFragment", () => {
	const svg = "<svg></svg>";

	it("includes heading, stats, canvas, stylesheet and script", () => {
		const html = buildFragment({
			svg,
			title: "Modules",
			stats: { modules: 3, dependencies: 2 },
			hoverHighlight: true,
		});
		expect(html).toContain("<h2>Modules</h2>");
		expect(html).toContain(
			'<p class="dependency-graph__stats">3 modules / 2 dependencies</p>',
		);
		expect(html).toContain(
			`<div class="dependency-graph__canvas">${svg}</div>`,
		);
		expect(html).toContain("<style>");
		expect(html).toContain("<script>");
		expect(html.indexOf("<h2>")).toBeLessThan(html.indexOf("<p"));
		expect(html.indexOf("<p")).toBeLessThan(html.indexOf("<div"));
	});

	it("escapes the title", () => {
		const html = buildFragment({
			svg,
			title: 'A & <B> "C"',
			stats: null,
			hoverHighlight: false,
		});
		expect(html).toContain("<h2>A &amp; &lt;B&gt; &quot;C&quot;</h2>");
	});

	it("omits heading, stats and script when turned off", () => {
		const html = buildFragment({
			svg,
			title: false,
			stats: null,
			hoverHighlight: false,
		});
		expect(html).not.toContain("<h2>");
		expect(html).not.toContain('<p class="dependency-graph__stats">');
		expect(html).not.toContain("<script>");
		expect(html).toContain("<style>");
	});
});

describe("placeFragment", () => {
	const readme = "<p>README</p>";
	const fragment = "<section>graph</section>";

	it("prepends by default", () => {
		expect(placeFragment(readme, fragment, "prepend")).toBe(
			`${fragment}\n${readme}`,
		);
	});

	it("appends", () => {
		expect(placeFragment(readme, fragment, "append")).toBe(
			`${readme}\n${fragment}`,
		);
	});

	it("replaces", () => {
		expect(placeFragment(readme, fragment, "replace")).toBe(fragment);
	});

	it("uses the fragment alone when there is no README", () => {
		expect(placeFragment(undefined, fragment, "prepend")).toBe(fragment);
		expect(placeFragment("", fragment, "append")).toBe(fragment);
	});
});
