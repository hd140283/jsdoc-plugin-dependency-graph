import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const jsdoc = require.resolve('jsdoc/jsdoc.js');
const fixture = fileURLToPath(new URL('./fixtures/basic/', import.meta.url));

const runJsdoc = (config) => {
	const out = fs.mkdtempSync(path.join(os.tmpdir(), 'jsdoc-plugin-dependency-graph-'));
	execFileSync(process.execPath, [jsdoc, 'src', '-r', '-c', config, '-R', 'README.md', '-d', out], {
		cwd: fixture,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	return fs.readFileSync(path.join(out, 'index.html'), 'utf8');
};

describe('running jsdoc on a project', { timeout: 60_000 }, () => {
	it('puts a linked graph in front of the README on the Home page', () => {
		const html = runJsdoc('jsdoc.json');

		expect(html).toContain('<h2>Modules</h2>');
		expect(html).toContain('<svg');
		expect(html).toMatch(/\d+ modules \/ \d+ dependencies/);
		expect(html).toContain('dependency-graph__canvas');

		// Links resolve to the pages jsdoc generated.
		expect(html).toContain('href="module-app.html"');
		expect(html).toContain('href="module-greeting.html"');
		expect(html).toContain('href="global.html#shout"');
		expect(html).not.toContain('jsdoc://');

		// Graph first, README after.
		expect(html.indexOf('<svg')).toBeLessThan(html.indexOf('Hello from the README'));
	});

	it('can replace the README and skip the hover script', () => {
		const html = runJsdoc('jsdoc.replace.json');

		expect(html).toContain('<svg');
		expect(html).not.toContain('Hello from the README');
		expect(html).not.toContain('<h2>Dependency graph</h2>');
		// The stylesheet is always included; the script (with its contextmenu handler) is not.
		expect(html).toContain('dependency-graph__canvas {');
		expect(html).not.toContain('contextmenu');
	});

	it('draws the graph with the reporter named by outputType', () => {
		const html = runJsdoc('jsdoc.archi.json');

		// src/index.js and the src/lib folder
		expect(html).toContain('2 modules / 1 dependencies');
		expect(html).toContain('href="module-app.html"');
	});

	it('fails the run when outputType is not supported', () => {
		expect(() => runJsdoc('jsdoc.unsupported.json')).toThrow(
			'dependency-graph: unsupported outputType "mermaid". Use one of: dot, flat, ddot, archi.',
		);
	});
});
