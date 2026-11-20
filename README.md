# jsdoc-plugin-dependency-graph

[![CI](https://github.com/hd140283/jsdoc-plugin-dependency-graph/actions/workflows/ci.yml/badge.svg)](https://github.com/hd140283/jsdoc-plugin-dependency-graph/actions/workflows/ci.yml)

English | [日本語](https://github.com/hd140283/jsdoc-plugin-dependency-graph/blob/main/README.ja.md)

A [JSDoc](https://jsdoc.app/) plugin that draws your project's module dependency
graph and puts it on the Home page. Every node links to the page that documents
that file. Hover over a node to highlight its neighbours; right-click to pin.

See it in action in [this plugin's own API docs](https://hd140283.github.io/jsdoc-plugin-dependency-graph/).

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
		"outputType": "dot",
		"placement": "prepend",
		"title": "Dependency graph",
		"stats": true,
		"hoverHighlight": true,
		"failOnViolation": false,
		"coreModules": false,
		"unresolvableModules": false
	}
}
```

| Option                | Default              | Description                                                                                                                                   |
| --------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `config`              | auto                 | dependency-cruiser config file. By default, the plugin looks for `.dependency-cruiser.{json,js,cjs,mjs,ts,cts,mts}` in the working directory. |
| `outputType`          | `"dot"`              | Which dependency-cruiser reporter draws the graph: `"dot"`, `"flat"`, `"ddot"` or `"archi"`.                                                  |
| `placement`           | `"prepend"`          | Where the graph goes relative to the README: `"prepend"`, `"append"` or `"replace"`.                                                          |
| `title`               | `"Dependency graph"` | Heading above the graph. `false` for none.                                                                                                    |
| `stats`               | `true`               | Show the module and dependency counts under the heading.                                                                                      |
| `hoverHighlight`      | `true`               | Highlight a node's neighbours on hover, and pin the highlight on right-click.                                                                 |
| `failOnViolation`     | `false`              | Treat dependency-cruiser rule violations of `error` severity as errors, so that JSDoc exits with a failure.                                   |
| `coreModules`         | `false`              | Keep Node.js built-in modules in the graph.                                                                                                   |
| `unresolvableModules` | `false`              | Keep the imports dependency-cruiser could not resolve in the graph.                                                                           |

Everything about the graph itself, such as which files to include, folder
collapsing, colours and rules, is configured through dependency-cruiser. The
`reporterOptions` of the reporter you picked apply too.

The plugin starts from the dependency-cruiser options below and merges your
config over them, so whatever you set yourself wins:

```json
{
	"options": {
		"doNotFollow": { "path": "node_modules" },
		"reporterOptions": {
			"dot": {
				"filters": { "exclude": { "path": "node_modules" } },
				"theme": { "graph": { "splines": "ortho" } }
			}
		}
	}
}
```

The filter only keeps the packages in `node_modules` out of the graph; your
rules still apply to them. To draw the packages, set that `path` to `""` in
your config.

When a graph is too large for the default right-angled edges, the plugin draws
curves instead.

Even with `coreModules` or `unresolvableModules` set to `true`, whatever your
dependency-cruiser config filters out stays out. Turn them on when a `focus`
or `reaches` in that config names a built-in module or an unresolvable import.

## How nodes are linked

For each source file, the plugin picks the page JSDoc generates for it:

1. the `@module` page, if the file declares one;
2. otherwise the page of a class, namespace, mixin, interface or external defined in the file;
3. otherwise the global page, anchored at the global named after the file, or at the first global if none is;
4. otherwise the page of the container a member in the file belongs to;
5. otherwise the file's own source page.

Files with no documented symbols get no page from JSDoc, so their nodes are
drawn without a link. The same goes for nodes that stand for a folder, which
is what `"ddot"`, `"archi"` and a `collapsePattern` draw.

When two pages would get the same file name, for example names that differ
only in case, the link may point to the wrong page.

If your dependency-cruiser config sets a `prefix`, every node links to that
prefix followed by the source path, just as in dependency-cruiser's own
output, rather than to a page in the docs.

## Compatibility

JSDoc 4. Tested with the default template. Other templates should work as long
as they render `opts.readme` on the Home page.

## License

[MIT](https://github.com/hd140283/jsdoc-plugin-dependency-graph/blob/main/LICENSE)
