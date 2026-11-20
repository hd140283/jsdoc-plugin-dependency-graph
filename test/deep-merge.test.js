import { describe, expect, it } from 'vitest';
import { deepMerge } from '../lib/deep-merge.mjs';

describe('deepMerge', () => {
	it('merges objects key by key, all the way down', () => {
		const base = {
			exclude: { path: 'node_modules' },
			reporterOptions: { dot: { theme: { graph: { splines: 'ortho' } } } },
		};
		const override = {
			exclude: { dynamic: true },
			reporterOptions: { dot: { theme: { graph: { bgcolor: 'lightyellow' } } } },
			maxDepth: 2,
		};

		expect(deepMerge(base, override)).toEqual({
			exclude: { path: 'node_modules', dynamic: true },
			reporterOptions: { dot: { theme: { graph: { splines: 'ortho', bgcolor: 'lightyellow' } } } },
			maxDepth: 2,
		});
	});

	it('lets the override win where both set a value', () => {
		expect(
			deepMerge({ prefix: 'jsdoc://', exclude: { path: 'node_modules' } }, { prefix: '', exclude: { path: '' } }),
		).toEqual({ prefix: '', exclude: { path: '' } });
	});

	it.each([
		['a string', 'node_modules'],
		['an array', ['node_modules', 'dist']],
		['null', null],
		['a regular expression', /node_modules/],
	])('replaces an object with %s instead of merging', (_description, value) => {
		expect(deepMerge({ exclude: { path: 'node_modules' } }, { exclude: value })).toEqual({ exclude: value });
	});

	it('replaces arrays instead of joining them', () => {
		expect(deepMerge({ exclude: { path: ['a', 'b'] } }, { exclude: { path: ['c'] } })).toEqual({
			exclude: { path: ['c'] },
		});
	});

	it('leaves both arguments untouched', () => {
		const base = { exclude: { path: 'node_modules' } };
		const override = { exclude: { dynamic: true } };
		deepMerge(base, override);

		expect(base).toEqual({ exclude: { path: 'node_modules' } });
		expect(override).toEqual({ exclude: { dynamic: true } });
	});
});
