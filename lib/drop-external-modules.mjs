/**
 * Remove Node.js built-ins and unresolvable imports from a dependency-cruiser
 * result, together with the dependencies that point at them.
 * @function
 * @param {object} result Cruise result, as returned by dependency-cruiser's `cruise()`.
 * @param {object} [keep]
 * @param {boolean} [keep.coreModules=false] Keep Node.js built-ins (`coreModule`).
 * @param {boolean} [keep.unresolvableModules=false] Keep unresolvable imports (`couldNotResolve`).
 * @returns {object} A copy of the result.
 */
export const dropExternalModules = (result, { coreModules = false, unresolvableModules = false } = {}) => {
	const isDropped = (item) =>
		Boolean((!coreModules && item.coreModule) || (!unresolvableModules && item.couldNotResolve));

	return {
		...result,
		modules: result.modules
			.filter((entry) => !isDropped(entry))
			.map((entry) => ({ ...entry, dependencies: entry.dependencies.filter((dependency) => !isDropped(dependency)) })),
	};
};
