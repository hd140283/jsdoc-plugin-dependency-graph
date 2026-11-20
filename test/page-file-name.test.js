import { describe, expect, it } from 'vitest';
import { pageFileName } from '../lib/page-file-name.cjs';

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

	it('drops a trailing variation', () => {
		expect(pageFileName('Foo(2)')).toBe('Foo.html');
	});

	it('drops a leading dot or dash', () => {
		expect(pageFileName('.hidden')).toBe('hidden.html');
		expect(pageFileName('~inner')).toBe('inner.html');
	});

	it('puts a dash in front of a leading underscore', () => {
		expect(pageFileName('_Foo')).toBe('-_Foo.html');
		expect(pageFileName('_loose.js')).toBe('-_loose.js.html');
		expect(pageFileName('module:_mod')).toBe('module-_mod.html');
	});

	it('falls back to an underscore behind a dash when nothing is left', () => {
		expect(pageFileName('')).toBe('-_.html');
		expect(pageFileName(undefined)).toBe('-_.html');
		expect(pageFileName('.')).toBe('-_.html');
	});
});
