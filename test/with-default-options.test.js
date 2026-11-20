import { describe, expect, it } from 'vitest';
import { withDefaultOptions } from '../lib/with-default-options.mjs';

const ORTHOGONAL = { theme: { graph: { splines: 'ortho' } } };
const context = { prefix: 'jsdoc://', outputType: 'dot' };

describe('withDefaultOptions', () => {
	it('gives the defaults when the project has no options', () => {
		expect(withDefaultOptions({}, context)).toEqual({
			options: {
				prefix: 'jsdoc://',
				doNotFollow: { path: 'node_modules' },
				exclude: { path: 'node_modules' },
				reporterOptions: { dot: ORTHOGONAL },
			},
			orthogonalByDefault: true,
		});
	});

	it('keeps the defaults the options do not touch', () => {
		const ruleSet = { forbidden: [{ name: 'no-shouting', from: {}, to: { path: 'shout' } }] };
		const { options } = withDefaultOptions({ ruleSet, validate: true, exclude: { dynamic: true } }, context);

		expect(options).toEqual({
			prefix: 'jsdoc://',
			doNotFollow: { path: 'node_modules' },
			exclude: { path: 'node_modules', dynamic: true },
			reporterOptions: { dot: ORTHOGONAL },
			ruleSet,
			validate: true,
		});
	});

	it('lets the options win over the defaults', () => {
		const { options } = withDefaultOptions(
			{ prefix: 'vscode://file/project/', doNotFollow: 'vendor', exclude: { path: '' } },
			context,
		);

		expect(options.prefix).toBe('vscode://file/project/');
		expect(options.doNotFollow).toBe('vendor');
		expect(options.exclude).toEqual({ path: '' });
	});

	it('takes an empty prefix in the options as it is', () => {
		expect(withDefaultOptions({ prefix: '' }, context).options.prefix).toBe('');
	});

	it('adds the orthogonal edges to a theme that leaves the edges alone', () => {
		const { options, orthogonalByDefault } = withDefaultOptions(
			{ reporterOptions: { dot: { collapsePattern: '^src/[^/]+', theme: { graph: { bgcolor: 'lightyellow' } } } } },
			context,
		);

		expect(options.reporterOptions).toEqual({
			dot: { collapsePattern: '^src/[^/]+', theme: { graph: { bgcolor: 'lightyellow', splines: 'ortho' } } },
		});
		expect(orthogonalByDefault).toBe(true);
	});

	it('leaves the edges to a theme that sets them', () => {
		const reporterOptions = { dot: { theme: { graph: { splines: 'true' } } } };
		const { options, orthogonalByDefault } = withDefaultOptions({ reporterOptions }, context);

		expect(options.reporterOptions).toEqual(reporterOptions);
		expect(orthogonalByDefault).toBe(false);
	});

	it('does not count orthogonal edges the options ask for as a default', () => {
		const { orthogonalByDefault } = withDefaultOptions({ reporterOptions: { dot: ORTHOGONAL } }, context);

		expect(orthogonalByDefault).toBe(false);
	});

	it('leaves a theme that replaces the one of dependency-cruiser alone', () => {
		const reporterOptions = { dot: { theme: { replace: true, graph: { rankdir: 'TB' } } } };
		const { options, orthogonalByDefault } = withDefaultOptions({ reporterOptions }, context);

		expect(options.reporterOptions).toEqual(reporterOptions);
		expect(orthogonalByDefault).toBe(false);
	});

	describe('with a reporter other than dot', () => {
		const archi = { prefix: 'jsdoc://', outputType: 'archi' };

		it('puts the edges in the dot theme, which the reporter falls back on', () => {
			const { options } = withDefaultOptions({}, archi);

			expect(options.reporterOptions).toEqual({ dot: ORTHOGONAL });
		});

		it('keeps the dot theme in use when the reporter has options but no theme', () => {
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
				dot: { theme: { graph: { bgcolor: 'lightyellow', splines: 'ortho' } } },
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
				dot: { theme: { graph: { splines: 'true' } } },
				archi: { theme: { graph: { bgcolor: 'lightyellow', splines: 'ortho' } } },
			});
			expect(orthogonalByDefault).toBe(true);
		});

		it('leaves the edges to the dot theme the reporter falls back on', () => {
			const reporterOptions = { dot: { theme: { graph: { splines: 'true' } } } };
			const { options, orthogonalByDefault } = withDefaultOptions({ reporterOptions }, archi);

			expect(options.reporterOptions).toEqual(reporterOptions);
			expect(orthogonalByDefault).toBe(false);
		});
	});
});
