import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commonPrefix, fragmentId, pageFileName, pageUrls } from '../lib/page-urls.cjs';

const cwd = path.resolve('/project');

function doclet(file, extra) {
	return {
		meta: {
			path: path.join(cwd, path.dirname(file)),
			filename: path.basename(file),
		},
		...extra,
	};
}

describe('pageFileName', () => {
	it('turns namespace prefixes into dashes', () => {
		expect(pageFileName('module:app')).toBe('module-app.html');
		expect(pageFileName('external:jQuery')).toBe('external-jQuery.html');
	});

	it('replaces path separators and inner/instance markers', () => {
		expect(pageFileName('module:lib/util')).toBe('module-lib_util.html');
		expect(pageFileName('module:lib/util~Helper')).toBe('module-lib_util-Helper.html');
		expect(pageFileName('Foo#bar')).toBe('Foo_bar.html');
	});

	it('names source pages after the shortened path', () => {
		expect(pageFileName('lib/plain.js')).toBe('lib_plain.js.html');
	});
});

describe('fragmentId', () => {
	it('prefixes static and inner scopes but not instance', () => {
		expect(fragmentId({ name: 'x', scope: 'static' })).toBe('.x');
		expect(fragmentId({ name: 'x', scope: 'inner' })).toBe('~x');
		expect(fragmentId({ name: 'x', scope: 'instance' })).toBe('x');
		expect(fragmentId({ name: 'x', scope: 'global' })).toBe('x');
	});

	it('prefixes event kinds', () => {
		expect(fragmentId({ name: 'ready', kind: 'event', scope: 'global' })).toBe('event:ready');
	});
});

describe('commonPrefix', () => {
	it('uses the directory of a single file', () => {
		expect(commonPrefix([path.join(cwd, 'src', 'a.js')], cwd)).toBe(path.join(cwd, 'src') + path.sep);
	});

	it('finds the shared directory of several files', () => {
		expect(
			commonPrefix(
				[path.join(cwd, 'src', 'a.js'), path.join(cwd, 'src', 'lib', 'b.js'), path.join(cwd, 'src', 'lib', 'c.js')],
				cwd,
			),
		).toBe(path.join(cwd, 'src') + path.sep);
	});
});

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
});
