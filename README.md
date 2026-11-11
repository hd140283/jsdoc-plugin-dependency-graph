# jsdoc-plugin-dependency-graph

English | [日本語](README.ja.md)

A [JSDoc](https://jsdoc.app/) plugin that draws your project's module dependency
graph and puts it on the Home page. Every node links to the page that documents
that file. Hover a node to highlight its neighbours; right-click to pin.

The graph is produced by [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
and rendered with a WebAssembly build of Graphviz, so there is nothing to install
besides this package.

## Install

```sh
npm install --save-dev jsdoc-plugin-dependency-graph
```

Add it to your JSDoc configuration:

```json
{
	"plugins": ["node_modules/jsdoc-plugin-dependency-graph"]
}
```

That's it. Run `jsdoc` as usual and the graph appears above your README on the
Home page. If you have no README, the graph becomes the Home page.

## Options

Put them under `dependencyGraph` in the JSDoc configuration:

```json
{
	"plugins": ["node_modules/jsdoc-plugin-dependency-graph"],
	"dependencyGraph": {
		"config": ".dependency-cruiser.cjs",
		"placement": "prepend",
		"title": "Dependency graph",
		"stats": true,
		"hoverHighlight": true,
		"failOnViolation": false
	}
}
```

| Option            | Default              | Description                                                                                                                                                                                                                                                                                                        |
| ----------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config`          | auto                 | dependency-cruiser config file. By default `.dependency-cruiser.{json,js,cjs,mjs}` is looked up in the working directory. Without one, the graph shows only your own modules: packages in `node_modules`, Node.js built-ins and imports that cannot be resolved are left out. Add a config file to draw those too. |
| `placement`       | `"prepend"`          | Where the graph goes relative to the README: `"prepend"`, `"append"` or `"replace"`.                                                                                                                                                                                                                               |
| `title`           | `"Dependency graph"` | Heading above the graph. `false` for none.                                                                                                                                                                                                                                                                         |
| `stats`           | `true`               | Show the module and dependency counts under the heading.                                                                                                                                                                                                                                                           |
| `hoverHighlight`  | `true`               | Include the small script that highlights neighbours on hover and pins on right-click.                                                                                                                                                                                                                              |
| `failOnViolation` | `false`              | Report dependency-cruiser rule violations as JSDoc errors (non-zero exit) instead of warnings.                                                                                                                                                                                                                     |

Everything about the graph itself, such as which files to include, folder
collapsing, colours and rules, is configured through dependency-cruiser. The
plugin passes your config straight to it and uses the `dot` reporter, so the
`reporterOptions.dot` section applies.

## How nodes are linked

For each source file, the plugin picks the page JSDoc generates for it:

1. the `@module` page, if the file declares one;
2. otherwise the page of a class, namespace, mixin, interface or external defined in the file;
3. otherwise the global page, anchored at the global whose name matches the file name (or the first one);
4. otherwise the page of the container a member in the file belongs to;
5. otherwise the file's own source page.

Files with no documented symbols get no page from JSDoc, so their nodes are
drawn without a link.

The URLs are computed from JSDoc's naming rules rather than asked from the
template, because JSDoc's helper de-duplicates file names as a side effect and
cannot be consulted early without disturbing the template's own output. The one
case this misses is two symbols whose page names differ only in case.

## How it works

JSDoc's plugin hooks are synchronous and dependency-cruiser is not, so the graph
is rendered in a child process (`lib/render.mjs`) and handed back as SVG. At
`processingComplete` the plugin resolves the node links from the doclets and
inserts the result into `env.opts.readme`, which is what the template prints on
the Home page.

`lib/render.mjs` does not depend on JSDoc. It can be imported as
`jsdoc-plugin-dependency-graph/render` to produce the same SVG for other tools.

## Compatibility

JSDoc 4. Tested with the default template and docdash. Other templates should
work as long as they render `opts.readme` on the Home page, which all the
common ones do.

## License

[MIT](LICENSE)
