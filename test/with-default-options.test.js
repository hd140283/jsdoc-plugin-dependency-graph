import { describe, expect, it } from 'vitest';
import { withDefaultOptions } from '../lib/with-default-options.mjs';

const NO_PACKAGES = { exclude: { path: 'node_modules' } };
const ORTHOGONAL = { graph: { splines: 'ortho' } };
const context = { prefix: 'jsdoc://', outputType: 'dot' };

describe('withDefaultOptions', () => {
	it('gives the defaults when the project has no options', () => {
		expect(withDefaultOptions({}, context)).toEqual({
			options: {
				prefix: 'jsdoc://',
				doNotFollow: { path: 'node_modules' },
				reporterOptions: { dot: { filters: NO_PACKAGES, theme: ORTHOGONAL } },
			},
			orthogonalByDefault: true,
		});
	});

	it('keeps the defaults the options do not touch', () => {
		const ruleSet = { forbidden: [{ name: 'no-shouting', from: {}, to: { path: 'shout' } }] };
		const { options } = withDefaultOptions({ ruleSet, validate: true, exclude: { path: 'dist' } }, context);

		expect(options).toEqual({
			prefix: 'jsdoc://',
			doNotFollow: { path: 'node_modules' },
			exclude: { path: 'dist' },
			reporterOptions: { dot: { filters: NO_PACKAGES, theme: ORTHOGONAL } },
			ruleSet,
			validate: true,
		});
	});

	it('lets the options win over the defaults', () => {
		const { options } = withDefaultOptions(
			{
				prefix: 'vscode://file/project/',
				doNotFollow: 'vendor',
				reporterOptions: { dot: { filters: { exclude: { path: '' } } } },
			},
			context,
		);

		expect(options.prefix).toBe('vscode://file/project/');
		expect(options.doNotFollow).toBe('vendor');
		expect(options.reporterOptions.dot.filters).toEqual({ exclude: { path: '' } });
	});

	it('takes an empty prefix in the options as it is', () => {
		expect(withDefaultOptions({ prefix: '' }, context).options.prefix).toBe('');
	});

	it('keeps the other filters in the options', () => {
		const { options } = withDefaultOptions(
			{ reporterOptions: { dot: { filters: { includeOnly: { path: '^src' } } } } },
			context,
		);

		expect(options.reporterOptions.dot.filters).toEqual({ ...NO_PACKAGES, includeOnly: { path: '^src' } });
	});

	it('adds the orthogonal edges to a theme that leaves the edges alone', () => {
		const { options, orthogonalByDefault } = withDefaultOptions(
			{ reporterOptions: { dot: { collapsePattern: '^src/[^/]+', theme: { graph: { bgcolor: 'lightyellow' } } } } },
			context,
		);

		expect(options.reporterOptions.dot).toEqual({
			collapsePattern: '^src/[^/]+',
			filters: NO_PACKAGES,
			theme: { graph: { bgcolor: 'lightyellow', splines: 'ortho' } },
		});
		expect(orthogonalByDefault).toBe(true);
	});

	it('leaves the edges to a theme that sets them', () => {
		const theme = { graph: { splines: 'true' } };
		const { options, orthogonalByDefault } = withDefaultOptions({ reporterOptions: { dot: { theme } } }, context);

		expect(options.reporterOptions.dot.theme).toEqual(theme);
		expect(orthogonalByDefault).toBe(false);
	});

	it('does not count orthogonal edges the options ask for as a default', () => {
		const { orthogonalByDefault } = withDefaultOptions({ reporterOptions: { dot: { theme: ORTHOGONAL } } }, context);

		expect(orthogonalByDefault).toBe(false);
	});

	it('leaves a theme that replaces the one of dependency-cruiser alone', () => {
		const theme = { replace: true, graph: { rankdir: 'TB' } };
		const { options, orthogonalByDefault } = withDefaultOptions({ reporterOptions: { dot: { theme } } }, context);

		expect(options.reporterOptions.dot.theme).toEqual(theme);
		expect(orthogonalByDefault).toBe(false);
	});

	describe('with a reporter other than dot', () => {
		const archi = { prefix: 'jsdoc://', outputType: 'archi' };

		it('puts the defaults in the dot section, which the reporter falls back on', () => {
			const { options } = withDefaultOptions({}, archi);

			expect(options.reporterOptions).toEqual({ dot: { filters: NO_PACKAGES, theme: ORTHOGONAL } });
		});

		it('keeps the dot section in use when the reporter has other options of its own', () => {
			const { options, orthogonalByDefault } = withDefaultOptions(
				{
					reporterOptions: {
						dot: { theme: { graph: { bgcolor: 'lightyellow' } } },
						archi: { collapsePattern: '^src/[^/]+' },
					},
				},
				archi,
			);

			expect(options.reporterOptions).toEqual({
				dot: { filters: NO_PACKAGES, theme: { graph: { bgcolor: 'lightyellow', splines: 'ortho' } } },
				archi: { collapsePattern: '^src/[^/]+' },
			});
			expect(orthogonalByDefault).toBe(true);
		});

		it('puts the edges in the theme of the reporter when it has one', () => {
			const { options, orthogonalByDefault } = withDefaultOptions(
				{
					reporterOptions: {
						dot: { theme: { graph: { splines: 'true' } } },
						archi: { theme: { graph: { bgcolor: 'lightyellow' } } },
					},
				},
				archi,
			);

			expect(options.reporterOptions).toEqual({
				dot: { filters: NO_PACKAGES, theme: { graph: { splines: 'true' } } },
				archi: { theme: { graph: { bgcolor: 'lightyellow', splines: 'ortho' } } },
			});
			expect(orthogonalByDefault).toBe(true);
		});

		it('puts the filter with the filters of the reporter when it has some', () => {
			const { options } = withDefaultOptions(
				{
					reporterOptions: {
						dot: { filters: { includeOnly: { path: '^lib' } } },
						archi: { filters: { includeOnly: { path: '^src' } } },
					},
				},
				archi,
			);

			expect(options.reporterOptions).toEqual({
				dot: { filters: { includeOnly: { path: '^lib' } }, theme: ORTHOGONAL },
				archi: { filters: { ...NO_PACKAGES, includeOnly: { path: '^src' } } },
			});
		});

		it('leaves the edges to the dot theme the reporter falls back on', () => {
			const { options, orthogonalByDefault } = withDefaultOptions(
				{ reporterOptions: { dot: { theme: { graph: { splines: 'true' } } } } },
				archi,
			);

			expect(options.reporterOptions).toEqual({ dot: { filters: NO_PACKAGES, theme: { graph: { splines: 'true' } } } });
			expect(orthogonalByDefault).toBe(false);
		});
	});
});
