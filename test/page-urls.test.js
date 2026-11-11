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
		['is not given', undefined, false, ['plain', 'open', 'guarded', 'internal']],
		['is "all"', 'all', false, ['plain', 'open', 'guarded', 'internal', 'secret']],
		['is "public"', 'public', false, ['open']],
		['is "undefined"', 'undefined', false, ['plain']],
		['is "private"', 'private', false, ['secret']],
		['is "public,undefined"', 'public,undefined', false, ['plain', 'open']],
		['is "protected,package"', 'protected,package', false, ['guarded', 'internal']],
		['is given twice', ['public', 'undefined'], false, ['plain', 'open']],
		['is "public" next to --private', 'public', true, ['open', 'secret']],
	])('links the doclets JSDoc publishes when --access %s', (_description, access, includePrivate, published) => {
		const global = (name, extra) =>
			doclet(`src/${name}.js`, { kind: 'function', longname: name, name, scope: 'global', ...extra });
		const urls = pageUrls({
			cwd,
			access,
			includePrivate,
			doclets: [
				global('plain'),
				global('open', { access: 'public' }),
				global('guarded', { access: 'protected' }),
				global('internal', { access: 'package' }),
				global('secret', { access: 'private' }),
			],
		});
		expect([...urls.keys()]).toEqual(published.map((name) => `src/${name}.js`));
	});

	it('links members to the source page when their container is not published', () => {
		const doclets = [
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
				access: 'public',
			}),
			doclet('src/lib/extra.js', {
				kind: 'function',
				longname: 'module:app.extra',
				name: 'extra',
				scope: 'static',
				memberof: 'module:app',
				access: 'public',
			}),
		];
		const urls = pageUrls({ cwd, doclets, access: 'public' });
		expect(urls.get('src/index.js')).toBe('index.js.html');
		expect(urls.get('src/lib/extra.js')).toBe('lib_extra.js.html');
		expect(pageUrls({ cwd, doclets, access: 'public', sourcePages: false }).size).toBe(0);
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
