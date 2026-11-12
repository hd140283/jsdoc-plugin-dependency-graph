# Contributing

## Git

- Write commit messages in the [Conventional Commits](https://www.conventionalcommits.org) format
- Keep each commit small and focused on one purpose
- All development happens on a single branch, `main`
- Contributions are welcome as pull requests against `main`
- Cut a release with `pnpm version <patch|minor|major> -m "chore: release v%s"`, and remember to push the tag too
- Versions follow [Semantic Versioning](https://semver.org)

## Coding Conventions

Code style is enforced by [Biome](https://biomejs.dev/). Run `pnpm lint` before you commit.

The JSDoc plugin entry point, `index.cjs`, and tool config files are shaped by what those tools expect. The rules below apply to everything else.

- One export per file, and name the file after that export
- Use arrow functions instead of classes
- Use async/await for asynchronous code
- Use kebab-case for filenames
- Use camelCase for functions and variables

## Testing

- Unit tests are written with [Vitest](https://vitest.dev)
- Run them with `pnpm test`
- Test files are named `*.test.js` and live in `test/`, apart from `lib/`

## Documentation

- API docs are generated with [JSDoc](https://jsdoc.app). `pnpm run docs` writes them to `docs/`
- Document types and descriptions with JSDoc, and keep the build free of warnings
- Use JSDoc type syntax, not TypeScript syntax: `{*}` for any type, `{Object.<string, function>}` for key-value maps, and `{function(T): R}` for function types
- Tag arrow functions assigned to `const` or `export const` with `@function`. Without it, JSDoc leaves out the parameter and return tables. The name can be omitted because JSDoc infers it from the variable
- Tag file-local functions that are not exported with `@private`, so they stay out of the docs and are not mistaken for public API
