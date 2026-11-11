import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// index.cjs loads lib/*.cjs through Node's own require(). Load them the
		// same way from tests too, so v8 sees one copy of each file and coverage
		// is not merged from two differently mapped sources.
		server: { deps: { external: [/\.cjs$/] } },
		coverage: {
			provider: 'v8',
			include: ['index.cjs', 'lib/**', 'assets/**/*.js'],
			reporter: ['text', 'html', 'lcov'],
		},
	},
});
