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
});
