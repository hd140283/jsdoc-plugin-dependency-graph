import { describe, expect, it } from 'vitest';
import { placeFragment } from '../lib/place-fragment.cjs';

describe('placeFragment', () => {
	const readme = '<p>README</p>';
	const fragment = '<section>graph</section>';

	it('prepends', () => {
		expect(placeFragment(readme, fragment, 'prepend')).toBe(`${fragment}\n${readme}`);
	});

	it('appends', () => {
		expect(placeFragment(readme, fragment, 'append')).toBe(`${readme}\n${fragment}`);
	});

	it('replaces', () => {
		expect(placeFragment(readme, fragment, 'replace')).toBe(fragment);
	});

	it('uses the fragment alone when there is no README', () => {
		expect(placeFragment(undefined, fragment, 'prepend')).toBe(fragment);
		expect(placeFragment('', fragment, 'append')).toBe(fragment);
	});
});
