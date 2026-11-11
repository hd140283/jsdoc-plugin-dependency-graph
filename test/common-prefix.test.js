import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { commonPrefix } from '../lib/common-prefix.cjs';

const cwd = path.resolve('/project');

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
