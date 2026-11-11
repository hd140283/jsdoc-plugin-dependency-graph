/** @module app */

import { greet } from './lib/greeting.js';
import './lib/plain.js';
import { shout } from './lib/shout.js';

/**
 * Run the app.
 * @returns {string}
 */
export function main() {
	return shout(greet('world'));
}
