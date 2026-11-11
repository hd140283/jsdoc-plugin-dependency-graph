import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { pageUrls } from '../lib/page-urls.cjs';

const cwd = path.resolve('/project');

const doclet = (file, extra) => {
	return {
		meta: {
			path: path.join(cwd, path.dirname(file)),
			filename: path.basename(file),
		},
		...extra,
	};
};

describe('pageUrls', () => {
	it('links @module files to their module page', () => {
		const urls = pageUrls({
			cwd,
			doclets: [
				doclet('src/index.js', {
					kind: 'module',
					longname: 'module:app',
					name: 'app',
				}),
				doclet('src/index.js', {
					kind: 'function',
					longname: 'module:app.main',
					name: 'main',
					scope: 'static',
					memberof: 'module:app',
				}),
				doclet('src/lib/b.js', {
					kind: 'module',
					longname: 'module:lib/b',
					name: 'lib/b',
				}),
			],
		});
		expect(urls.get('src/index.js')).toBe('module-app.html');
		expect(urls.get('src/lib/b.js')).toBe('module-lib_b.html');
	});

	it('links files of globals to the global page, preferring the one named like the file', () => {
		const urls = pageUrls({
			cwd,
			doclets: [
				doclet('src/index.js', {
					kind: 'module',
					longname: 'module:app',
					name: 'app',
				}),
				doclet('src/shout-loud.js', {
					kind: 'function',
					longname: 'helper',
					name: 'helper',
					scope: 'global',
				}),
				doclet('src/shout-loud.js', {
					kind: 'function',
					longname: 'shoutLoud',
					name: 'shoutLoud',
					scope: 'global',
				}),
			],
		});
		expect(urls.get('src/shout-loud.js')).toBe('global.html#shoutLoud');
	});

	it('links files that only extend a container defined elsewhere to that container', () => {
		const urls = pageUrls({
			cwd,
			doclets: [
				doclet('src/Foo.js', { kind: 'class', longname: 'Foo', name: 'Foo' }),
				doclet('src/foo-extra.js', {
					kind: 'function',
					longname: 'Foo#extra',
					name: 'extra',
					scope: 'instance',
					memberof: 'Foo',
				}),
			],
		});
		expect(urls.get('src/Foo.js')).toBe('Foo.html');
		expect(urls.get('src/foo-extra.js')).toBe('Foo.html#extra');
	});

	it('falls back to the source page, unless the template does not emit them', () => {
		const doclets = [
			doclet('src/index.js', {
				kind: 'module',
				longname: 'module:app',
				name: 'app',
			}),
			doclet('src/lib/notes.js', {
				kind: 'constant',
				longname: 'module:other.x',
				name: 'x',
				scope: 'static',
			}),
		];
		// `memberof` is missing on purpose: this doclet has no container we can point at.
		expect(pageUrls({ cwd, doclets }).get('src/lib/notes.js')).toBe('lib_notes.js.html');
		expect(pageUrls({ cwd, doclets, sourcePages: false }).has('src/lib/notes.js')).toBe(false);
	});

	it('ignores undocumented, private and package doclets', () => {
		const urls = pageUrls({
			cwd,
			doclets: [
				{ kind: 'package', longname: 'package:x', name: 'x' },
				doclet('src/plain.js', {
					kind: 'constant',
					longname: 'nothing',
					name: 'nothing',
					scope: 'global',
					undocumented: true,
				}),
				doclet('src/secret.js', {
					kind: 'function',
					longname: 'hide',
					name: 'hide',
					scope: 'global',
					access: 'private',
				}),
			],
		});
		expect(urls.size).toBe(0);
	});

	it('ignores package doclets, ignored doclets and members of anonymous scopes', () => {
		const urls = pageUrls({
			cwd,
			doclets: [
				doclet('package.json', { kind: 'package', longname: 'package:x', name: 'x' }),
				doclet('src/skipped.js', {
					kind: 'function',
					longname: 'skipped',
					name: 'skipped',
					scope: 'global',
					ignore: true,
				}),
				doclet('src/anonymous.js', {
					kind: 'function',
					longname: '<anonymous>~inner',
					name: 'inner',
					scope: 'inner',
					memberof: '<anonymous>',
				}),
			],
		});
		expect(urls.size).toBe(0);
	});

	it('links private doclets when they are published', () => {
		const urls = pageUrls({
			cwd,
			includePrivate: true,
			doclets: [
				doclet('src/secret.js', {
					kind: 'function',
					longname: 'hide',
					name: 'hide',
					scope: 'global',
					access: 'private',
				}),
			],
		});
		expect(urls.get('src/secret.js')).toBe('global.html#hide');
	});

	it.each([
		['no directory', undefined],
		['the string "null" as directory', 'null'],
	])('takes the file name alone when the doclet has %s', (_description, directory) => {
		const urls = pageUrls({
			cwd,
			doclets: [
				{
					meta: { path: directory, filename: path.join(cwd, 'src', 'loose.js') },
					kind: 'function',
					longname: 'loose',
					name: 'loose',
					scope: 'global',
				},
			],
		});
		expect(urls.get('src/loose.js')).toBe('global.html#loose');
	});
});
