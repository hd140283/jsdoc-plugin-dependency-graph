/**
 * Whether dependency-cruiser placed a module or dependency outside the
 * project's own files: a Node.js built-in, or an import it could not resolve.
 * @function
 * @private
 * @param {object} item A module or dependency from a cruise result.
 * @returns {boolean}
 */
const isExternal = (item) => Boolean(item.coreModule || item.couldNotResolve);

/**
 * Remove Node.js built-ins and unresolvable imports from a dependency-cruiser
 * result, together with the dependencies that point at them.
 * @function
 * @param {object} result Cruise result, as returned by dependency-cruiser's `cruise()`.
 * @returns {object} A copy of the result that holds only the project's own modules.
 */
export const dropExternalModules = (result) => ({
	...result,
	modules: result.modules
		.filter((entry) => !isExternal(entry))
		.map((entry) => ({ ...entry, dependencies: entry.dependencies.filter((dependency) => !isExternal(dependency)) })),
});
