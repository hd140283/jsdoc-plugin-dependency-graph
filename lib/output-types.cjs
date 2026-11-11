'use strict';

/**
 * Values accepted as `outputType`: the dependency-cruiser reporters that emit
 * Graphviz dot, named as `depcruise --output-type` takes them.
 * @type {string[]}
 */
const OUTPUT_TYPES = ['dot', 'flat', 'ddot', 'archi'];

module.exports = { OUTPUT_TYPES };
