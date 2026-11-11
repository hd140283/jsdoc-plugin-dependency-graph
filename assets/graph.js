// Hover highlighting and right-click pinning for the embedded dependency graph.
//
// Graphviz emits nodes as <g class="node"><title>src/foo.js</title> and edges as
// <g class="edge"><title>src/foo.js->src/bar.js</title>, so titles tie them together.
//
//   hover        highlight the node, its edges and the nodes at the other end
//   right-click  pin the highlight (right-click the node again, right-click empty
//                space, or press Escape to release)
for (const graph of document.querySelectorAll(".dependency-graph__canvas")) {
	const titleOf = (element) =>
		element.querySelector("title")?.textContent ?? "";

	const nodes = new Map();
	for (const node of graph.querySelectorAll(".node")) {
		nodes.set(titleOf(node), node);
	}

	const edges = [...graph.querySelectorAll(".edge")].map((edge) => {
		const [from, to] = titleOf(edge).split("->");
		return { element: edge, from, to };
	});

	// Name of the pinned node, or null.
	let pinned = null;
	// Name of the node under the pointer, or null. Restores hover highlighting after unpinning.
	let hovered = null;

	const clear = () => {
		graph.classList.remove("is-hovering");
		for (const element of graph.querySelectorAll(".is-current, .is-related")) {
			element.classList.remove("is-current", "is-related");
		}
	};

	const highlight = (name) => {
		clear();
		graph.classList.add("is-hovering");
		nodes.get(name)?.classList.add("is-current");
		for (const { element, from, to } of edges) {
			if (from !== name && to !== name) continue;
			element.classList.add("is-related");
			nodes.get(from === name ? to : from)?.classList.add("is-related");
		}
	};

	const pin = (name) => {
		pinned = name;
		for (const node of nodes.values()) {
			node.classList.toggle("is-pinned", node === nodes.get(name));
		}
		if (name !== null) {
			highlight(name);
		} else if (hovered !== null) {
			highlight(hovered);
		} else {
			clear();
		}
	};

	for (const [name, node] of nodes) {
		node.addEventListener("mouseenter", () => {
			hovered = name;
			if (pinned === null) highlight(name);
		});
		node.addEventListener("mouseleave", () => {
			hovered = null;
			if (pinned === null) clear();
		});
	}

	graph.addEventListener("contextmenu", (event) => {
		const node = event.target.closest(".node");
		if (node) {
			event.preventDefault();
			const name = titleOf(node);
			pin(pinned === name ? null : name);
		} else if (pinned !== null) {
			event.preventDefault();
			pin(null);
		}
	});

	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && pinned !== null) pin(null);
	});
}
