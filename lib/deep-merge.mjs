/**
 * Whether a value is a plain object.
 * @function
 * @private
 * @param {*} value
 * @returns {boolean}
 */
const isPlainObject = (value) => {
	if (value === null || typeof value !== 'object') return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
};

/**
 * Lay one value over another. Plain objects are merged key by key, all the way
 * down; any other value, arrays included, replaces the one underneath.
 * @function
 * @param {*} base
 * @param {*} override
 * @returns {*}
 */
export const deepMerge = (base, override) => {
	if (!isPlainObject(base) || !isPlainObject(override)) return override;
	const merged = { ...base };
	for (const [key, value] of Object.entries(override)) {
		merged[key] = deepMerge(base[key], value);
	}
	return merged;
};
