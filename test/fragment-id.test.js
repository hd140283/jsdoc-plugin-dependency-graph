import { describe, expect, it } from 'vitest';
import { fragmentId } from '../lib/fragment-id.cjs';

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
