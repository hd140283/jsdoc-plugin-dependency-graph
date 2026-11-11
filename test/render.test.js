import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render } from "../lib/render.mjs";

const fixture = fileURLToPath(new URL("./fixtures/basic/", import.meta.url));
const files = ["src/index.js"];

// dependency-cruiser resolves paths against process.cwd(), so the fixture has
// to be the working directory while render() runs.
let originalCwd;
beforeAll(() => {
	originalCwd = process.cwd();
	process.chdir(fixture);
});
afterAll(() => {
	process.chdir(originalCwd);
});

describe("render", { timeout: 60_000 }, () => {
	it("draws the project's modules as SVG with counts", async () => {
		const { svg, stats, violations } = await render({ files, cwd: fixture });

		expect(svg.startsWith("<svg")).toBe(true);
		expect(svg).not.toContain("<?xml");
		// index.js, greeting.js, plain.js, shout.js
		expect(stats).toEqual({ modules: 4, dependencies: 3 });
		expect(svg).toContain("src/lib/shout.js");
		expect(violations).toBeNull();
	});

	it("prefixes node links so they can be rewritten later", async () => {
		const { svg } = await render({ files, cwd: fixture, prefix: "jsdoc://" });

		expect(svg).toContain('href="jsdoc://src/index.js"');
		expect(svg).toContain('href="jsdoc://src/lib/greeting.js"');
	});

	it("links nodes to the bare source path without a prefix", async () => {
		const { svg } = await render({ files, cwd: fixture });

		expect(svg).toContain('href="src/index.js"');
	});

	it("reports rule violations from a dependency-cruiser config", async () => {
		const { violations, stats } = await render({
			files,
			cwd: fixture,
			config: "dependency-cruiser.strict.json",
		});

		expect(stats.modules).toBe(4);
		expect(violations).not.toBeNull();
		expect(violations.report).toContain("no-shouting");
		expect(violations.report).toContain("src/lib/shout.js");
	});

	it("fails on a missing config file", async () => {
		await expect(
			render({ files, cwd: fixture, config: "nope.json" }),
		).rejects.toThrow(/dependency-cruiser config not found: .*nope\.json/);
	});
});
