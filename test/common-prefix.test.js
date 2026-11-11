import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commonPrefix } from '../lib/common-prefix.cjs';

const cwd = path.resolve('/project');

describe('commonPrefix', () => {
	it('is empty when there are no paths', () => {
		expect(commonPrefix([], cwd)).toBe('');
	});

	it('uses the directory of a single file', () => {
		expect(commonPrefix([path.join(cwd, 'src', 'a.js')], cwd)).toBe(path.join(cwd, 'src') + path.sep);
	});

	it('uses a single directory as it is', () => {
		expect(commonPrefix([path.join(cwd, 'src')], cwd)).toBe(path.join(cwd, 'src') + path.sep);
	});

	it('resolves relative paths against the working directory', () => {
		expect(commonPrefix(['src/a.js', 'src/lib/b.js'], cwd)).toBe(path.join(cwd, 'src') + path.sep);
	});

	// What is left when files share nothing depends on how the platform writes a root.
	it.runIf(process.platform === 'win32')('stops at the drive when files share nothing else', () => {
		expect(commonPrefix(['C:\\one\\a.js', 'C:\\two\\b.js'], cwd)).toBe('C:\\');
	});

	it.runIf(process.platform === 'win32')('is empty when files are on different drives', () => {
		expect(commonPrefix(['C:\\one\\a.js', 'D:\\two\\b.js', 'D:\\two\\c.js'], cwd)).toBe('');
	});

	it.runIf(process.platform !== 'win32')('is empty when files share only the root', () => {
		expect(commonPrefix(['/one/a.js', '/two/b.js'], cwd)).toBe('');
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
