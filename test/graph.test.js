// @vitest-environment jsdom

// assets/graph.js is the script the plugin embeds in the Home page. It has no
// exports and wires itself to the graphs it finds when it runs, so every test
// builds a page first and then runs the script against it.

import { describe, expect, it, vi } from 'vitest';

// A graph the way Graphviz draws it: a -> b -> c, and d on its own.
const GRAPH = `
	<div class="dependency-graph__canvas">
		<svg>
			<g class="node"><title>a.js</title><path /></g>
			<g class="node"><title>b.js</title><path /></g>
			<g class="node"><title>c.js</title><path /></g>
			<g class="node"><title>d.js</title><path /></g>
			<g class="edge"><title>a.js-&gt;b.js</title><path /></g>
			<g class="edge"><title>b.js-&gt;c.js</title><path /></g>
		</svg>
	</div>`;

const load = async (html = GRAPH) => {
	document.body.innerHTML = html;
	vi.resetModules();
	await import('../assets/graph.js');
};

const titled = (selector, name, root = document) => {
	return [...root.querySelectorAll(selector)].find((element) => element.querySelector('title')?.textContent === name);
};
const node = (name, root) => titled('.node', name, root);
const edge = (name, root) => titled('.edge', name, root);
const canvas = () => document.querySelector('.dependency-graph__canvas');

// State classes the script put on an element, in a stable order.
const state = (element) => [...element.classList].filter((name) => name.startsWith('is-')).sort();

const hover = (element) => element.dispatchEvent(new MouseEvent('mouseenter'));
const leave = (element) => element.dispatchEvent(new MouseEvent('mouseleave'));
const rightClick = (element) => {
	const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
	element.dispatchEvent(event);
	return event;
};
const press = (key) => document.dispatchEvent(new KeyboardEvent('keydown', { key }));

describe('hovering a node', () => {
	it('highlights the node, its edges and the nodes at the other end', async () => {
		await load();
		hover(node('b.js'));

		expect(state(canvas())).toEqual(['is-hovering']);
		expect(state(node('b.js'))).toEqual(['is-current']);
		expect(state(node('a.js'))).toEqual(['is-related']);
		expect(state(node('c.js'))).toEqual(['is-related']);
		expect(state(edge('a.js->b.js'))).toEqual(['is-related']);
		expect(state(edge('b.js->c.js'))).toEqual(['is-related']);
		expect(state(node('d.js'))).toEqual([]);
	});

	it('leaves edges that do not touch the node alone', async () => {
		await load();
		hover(node('a.js'));

		expect(state(edge('a.js->b.js'))).toEqual(['is-related']);
		expect(state(edge('b.js->c.js'))).toEqual([]);
		expect(state(node('c.js'))).toEqual([]);
	});

	it('moves the highlight to the next node', async () => {
		await load();
		hover(node('a.js'));
		leave(node('a.js'));
		hover(node('c.js'));

		expect(state(node('a.js'))).toEqual([]);
		expect(state(node('c.js'))).toEqual(['is-current']);
		expect(state(node('b.js'))).toEqual(['is-related']);
	});

	it('clears the highlight when the pointer leaves', async () => {
		await load();
		hover(node('b.js'));
		leave(node('b.js'));

		expect(state(canvas())).toEqual([]);
		expect(document.querySelectorAll('.is-current, .is-related')).toHaveLength(0);
	});

	it('copes with an edge whose other end is not a node', async () => {
		await load(`
			<div class="dependency-graph__canvas">
				<svg>
					<g class="node"><title>a.js</title><path /></g>
					<g class="edge"><title>a.js-&gt;elsewhere</title><path /></g>
				</svg>
			</div>`);
		hover(node('a.js'));

		expect(state(node('a.js'))).toEqual(['is-current']);
		expect(state(edge('a.js->elsewhere'))).toEqual(['is-related']);
	});

	it('copes with a node that has no title', async () => {
		await load(`
			<div class="dependency-graph__canvas">
				<svg>
					<g class="node"><path /></g>
				</svg>
			</div>`);
		const untitled = document.querySelector('.node');
		hover(untitled);

		expect(state(untitled)).toEqual(['is-current']);
	});
});

describe('right-clicking', () => {
	it('pins the highlight of a node and suppresses the context menu', async () => {
		await load();
		const event = rightClick(node('a.js'));

		expect(event.defaultPrevented).toBe(true);
		expect(state(node('a.js'))).toEqual(['is-current', 'is-pinned']);
		expect(state(node('b.js'))).toEqual(['is-related']);
		expect(state(canvas())).toEqual(['is-hovering']);
	});

	it('keeps the pinned highlight while the pointer visits other nodes', async () => {
		await load();
		rightClick(node('a.js'));
		hover(node('c.js'));
		leave(node('c.js'));

		expect(state(node('a.js'))).toEqual(['is-current', 'is-pinned']);
		expect(state(node('c.js'))).toEqual([]);
	});

	it('moves the pin to another node', async () => {
		await load();
		rightClick(node('a.js'));
		rightClick(node('c.js'));

		expect(state(node('a.js'))).toEqual([]);
		expect(state(node('c.js'))).toEqual(['is-current', 'is-pinned']);
	});

	it('releases the pin on the pinned node and falls back to plain hovering', async () => {
		await load();
		hover(node('a.js'));
		rightClick(node('a.js'));
		const event = rightClick(node('a.js'));

		expect(event.defaultPrevented).toBe(true);
		expect(state(node('a.js'))).toEqual(['is-current']);
	});

	it('releases the pin on empty space and suppresses the context menu', async () => {
		await load();
		rightClick(node('a.js'));
		const event = rightClick(canvas());

		expect(event.defaultPrevented).toBe(true);
		expect(state(canvas())).toEqual([]);
		expect(document.querySelectorAll('.is-pinned, .is-current, .is-related')).toHaveLength(0);
	});

	it('leaves the context menu alone when nothing is pinned', async () => {
		await load();
		const event = rightClick(canvas());

		expect(event.defaultPrevented).toBe(false);
	});

	it('highlights the node under the pointer once the pin is released', async () => {
		await load();
		rightClick(node('a.js'));
		hover(node('c.js'));
		rightClick(canvas());

		expect(state(node('c.js'))).toEqual(['is-current']);
		expect(state(node('a.js'))).toEqual([]);
	});
});

describe('pressing a key', () => {
	it('releases the pin on Escape', async () => {
		await load();
		rightClick(node('a.js'));
		press('Escape');

		expect(document.querySelectorAll('.is-pinned, .is-current')).toHaveLength(0);
	});

	it('ignores other keys', async () => {
		await load();
		rightClick(node('a.js'));
		press('Enter');

		expect(state(node('a.js'))).toEqual(['is-current', 'is-pinned']);
	});

	it('ignores Escape when nothing is pinned', async () => {
		await load();
		hover(node('a.js'));
		press('Escape');

		expect(state(node('a.js'))).toEqual(['is-current']);
	});
});

describe('a page with two graphs', () => {
	it('keeps their highlights apart', async () => {
		await load(GRAPH + GRAPH);
		const [first, second] = document.querySelectorAll('.dependency-graph__canvas');
		hover(node('a.js', first));

		expect(state(first)).toEqual(['is-hovering']);
		expect(state(node('a.js', first))).toEqual(['is-current']);
		expect(state(second)).toEqual([]);
		expect(state(node('a.js', second))).toEqual([]);
	});
});
