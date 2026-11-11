import { describe, expect, it } from 'vitest';
import { dropExternalModules } from '../lib/drop-external-modules.mjs';

describe('dropExternalModules', () => {
	const result = {
		summary: { violations: [] },
		modules: [
			{
				source: 'src/a.js',
				dependencies: [
					{ resolved: 'src/b.js' },
					{ resolved: 'fs', coreModule: true },
					{ resolved: 'not-installed', couldNotResolve: true },
				],
			},
			{ source: 'src/b.js', dependencies: [] },
			{ source: 'fs', coreModule: true, dependencies: [] },
			{ source: 'not-installed', couldNotResolve: true, dependencies: [] },
		],
	};

	it('keeps only the modules of the project', () => {
		expect(dropExternalModules(result).modules.map((entry) => entry.source)).toEqual(['src/a.js', 'src/b.js']);
	});

	it('removes the dependencies that point at dropped modules', () => {
		expect(dropExternalModules(result).modules[0].dependencies).toEqual([{ resolved: 'src/b.js' }]);
	});

	it('keeps the rest of the result and leaves the input untouched', () => {
		expect(dropExternalModules(result).summary).toBe(result.summary);
		expect(result.modules).toHaveLength(4);
		expect(result.modules[0].dependencies).toHaveLength(3);
	});
});
