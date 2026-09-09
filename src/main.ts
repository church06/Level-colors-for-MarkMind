import { Notice, Plugin } from 'obsidian';

const CONTENT_SELECTOR = '.mm-mindmap-content';
const NODE_SELECTOR = ':scope > .mm-node';
const LEVEL_ATTRIBUTE = 'data-lcfm-level';
const FIRST_UNDERLINE_DEPTH = 2;
const MAX_VISUAL_LEVEL = 13;
const REAPPLY_DELAY_MS = 160;
const MAX_ENDPOINT_NODE_DISTANCE = 90;

type NodeElement = HTMLElement;
type BranchEdge = readonly [NodeElement, NodeElement];

interface ScreenPoint {
	x: number;
	y: number;
}

interface GraphState {
	graph: Map<NodeElement, Set<NodeElement>>;
	pathEdges: Map<SVGPathElement, BranchEdge>;
}

interface TreeState {
	depth: Map<NodeElement, number>;
	parent: Map<NodeElement, NodeElement | null>;
	children: Map<NodeElement, NodeElement[]>;
}

interface PaintStats {
	nodes: number;
	branches: number;
	underlines: number;
	expectedUnderlines: number;
	actualUnderlines: number;
}

export default class LevelColorsForMarkMind extends Plugin {
	private timer: number | null = null;
	private observer: MutationObserver | null = null;

	onload(): void {
		this.registerEvent(this.app.workspace.on('layout-change', () => this.schedule()));
		this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.schedule()));

		this.observer = new MutationObserver((records) => {
			const shouldReapply = records.some((record) =>
				record.type === 'childList' ||
				(record.type === 'attributes' &&
					(record.attributeName === 'd' || record.attributeName === 'class'))
			);

			if (shouldReapply) {
				this.schedule();
			}
		});

		this.observer.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['d', 'class'],
		});

		this.register(() => this.observer?.disconnect());

		this.addCommand({
			id: 'reapply-level-colors',
			name: 'Re-apply markmind level colours',
			callback: () => this.apply(true),
		});

		this.addCommand({
			id: 'copy-level-color-diagnostics',
			name: 'Copy level colors diagnostics',
			callback: async () => {
				const report = this.makeDiagnostics();
				try {
					await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
					new Notice('Level colors diagnostics copied');
				} catch {
					new Notice('Could not copy diagnostics to clipboard');
				}
			},
		});

		this.schedule();
	}

	onunload(): void {
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
			this.timer = null;
		}

		this.clearAppliedLevels(document);
	}

	private schedule(): void {
		if (this.timer !== null) {
			window.clearTimeout(this.timer);
		}

		this.timer = window.setTimeout(() => {
			this.timer = null;
			this.apply(false);
		}, REAPPLY_DELAY_MS);
	}

	private apply(showNotice: boolean): void {
		const host: ParentNode = document;

		const totals: PaintStats = {
			nodes: 0,
			branches: 0,
			underlines: 0,
			expectedUnderlines: 0,
			actualUnderlines: 0,
		};

		for (const content of this.queryAll<HTMLElement>(host, CONTENT_SELECTOR)) {
			const stats = this.applyToMindMap(content);

			totals.nodes += stats.nodes;
			totals.branches += stats.branches;
			totals.underlines += stats.underlines;
			totals.expectedUnderlines += stats.expectedUnderlines;
			totals.actualUnderlines += stats.actualUnderlines;
		}

		if (showNotice) {
			const underlineStatus =
				totals.expectedUnderlines === totals.actualUnderlines
					? 'exact'
					: 'count mismatch';

			new Notice(
				`Level Colors for MarkMind: ${totals.nodes} nodes, ` +
				`${totals.branches} branches, ${totals.underlines} underlines; ` +
				`underline mapping ${underlineStatus}.`
			);
		}
	}

	private applyToMindMap(content: HTMLElement): PaintStats {
		const empty: PaintStats = {
			nodes: 0,
			branches: 0,
			underlines: 0,
			expectedUnderlines: 0,
			actualUnderlines: 0,
		};

		const nodes = this.queryAll<NodeElement>(content, NODE_SELECTOR);
		if (nodes.length < 2) {
			return empty;
		}

		const svg = this.findMainBranchSvg(content);
		if (svg === null) {
			return empty;
		}

		const paths = this.queryAll<SVGPathElement>(svg, 'path');
		const lines = this.queryAll<SVGLineElement>(svg, 'line');
		if (paths.length === 0) {
			return empty;
		}

		const root = this.findRootNode(nodes);
		if (root === null) {
			return empty;
		}

		const rects = new Map<NodeElement, DOMRect>(
			nodes.map((node) => [node, node.getBoundingClientRect()])
		);

		const graphState = this.buildGraph(nodes, paths, rects);
		const treeState = this.orientTree(root, graphState, paths);
		const traversal = this.preorderTraversal(root, treeState.children);

		for (const node of traversal) {
			const nodeDepth = treeState.depth.get(node);
			if (nodeDepth !== undefined) {
				this.assignVisualLevel(node, nodeDepth);
			}
		}

		let branchCount = 0;
		for (const path of paths) {
			const edge = graphState.pathEdges.get(path);
			if (edge === undefined) {
				continue;
			}

			const oriented = this.resolveOrientedEdge(
				edge,
				treeState.parent,
				treeState.depth
			);

			if (oriented === null) {
				continue;
			}

			const childDepth = treeState.depth.get(oriented.child);
			if (childDepth === undefined) {
				continue;
			}

			this.assignVisualLevel(path, childDepth);
			branchCount++;
		}

		const underlineNodes = traversal.filter(
			(node) => (treeState.depth.get(node) ?? -1) >= FIRST_UNDERLINE_DEPTH
		);

		const pairCount = Math.min(lines.length, underlineNodes.length);
		for (let index = 0; index < pairCount; index++) {
			const nodeDepth = treeState.depth.get(underlineNodes[index]);
			if (nodeDepth !== undefined) {
				this.assignVisualLevel(lines[index], nodeDepth);
			}
		}

		return {
			nodes: traversal.length,
			branches: branchCount,
			underlines: pairCount,
			expectedUnderlines: underlineNodes.length,
			actualUnderlines: lines.length,
		};
	}

	private buildGraph(
		nodes: NodeElement[],
		paths: SVGPathElement[],
		rects: Map<NodeElement, DOMRect>
	): GraphState {
		const graph = new Map<NodeElement, Set<NodeElement>>(
			nodes.map((node) => [node, new Set<NodeElement>()])
		);
		const pathEdges = new Map<SVGPathElement, BranchEdge>();

		for (const path of paths) {
			const endpoints = this.getPathEndpoints(path);
			if (endpoints === null) {
				continue;
			}

			const first = this.findNearestNode(endpoints[0], nodes, rects);
			const second = this.findNearestNode(endpoints[1], nodes, rects);

			if (
				first.node === null ||
				second.node === null ||
				first.node === second.node ||
				first.distance > MAX_ENDPOINT_NODE_DISTANCE ||
				second.distance > MAX_ENDPOINT_NODE_DISTANCE
			) {
				continue;
			}

			graph.get(first.node)?.add(second.node);
			graph.get(second.node)?.add(first.node);
			pathEdges.set(path, [first.node, second.node]);
		}

		return { graph, pathEdges };
	}

	private orientTree(
		root: NodeElement,
		graphState: GraphState,
		paths: SVGPathElement[]
	): TreeState {
		const depth = new Map<NodeElement, number>([[root, 0]]);
		const parent = new Map<NodeElement, NodeElement | null>([[root, null]]);
		const queue: NodeElement[] = [root];

		for (let index = 0; index < queue.length; index++) {
			const current = queue[index];
			const currentDepth = depth.get(current);
			if (currentDepth === undefined) {
				continue;
			}

			for (const next of graphState.graph.get(current) ?? []) {
				if (depth.has(next)) {
					continue;
				}

				depth.set(next, currentDepth + 1);
				parent.set(next, current);
				queue.push(next);
			}
		}

		const children = new Map<NodeElement, NodeElement[]>(
			[...graphState.graph.keys()].map((node) => [node, []])
		);
		const seenChildren = new Set<NodeElement>();

		// Preserve MarkMind's branch render order. That order is later reused
		// for the depth >= 2 underline sequence.
		for (const path of paths) {
			const edge = graphState.pathEdges.get(path);
			if (edge === undefined) {
				continue;
			}

			const oriented = this.resolveOrientedEdge(edge, parent, depth);
			if (oriented === null || seenChildren.has(oriented.child)) {
				continue;
			}

			children.get(oriented.parent)?.push(oriented.child);
			seenChildren.add(oriented.child);
		}

		return { depth, parent, children };
	}

	private resolveOrientedEdge(
		edge: BranchEdge,
		parent: Map<NodeElement, NodeElement | null>,
		depth: Map<NodeElement, number>
	): { parent: NodeElement; child: NodeElement } | null {
		const [first, second] = edge;

		if (parent.get(first) === second) {
			return { parent: second, child: first };
		}

		if (parent.get(second) === first) {
			return { parent: first, child: second };
		}

		const firstDepth = depth.get(first);
		const secondDepth = depth.get(second);

		if (
			firstDepth === undefined ||
			secondDepth === undefined ||
			firstDepth === secondDepth
		) {
			return null;
		}

		return firstDepth < secondDepth
			? { parent: first, child: second }
			: { parent: second, child: first };
	}

	private preorderTraversal(
		root: NodeElement,
		children: Map<NodeElement, NodeElement[]>
	): NodeElement[] {
		const output: NodeElement[] = [];
		const stack: NodeElement[] = [root];

		while (stack.length > 0) {
			const node = stack.pop();
			if (node === undefined) {
				break;
			}

			output.push(node);

			const nodeChildren = children.get(node) ?? [];
			for (let index = nodeChildren.length - 1; index >= 0; index--) {
				stack.push(nodeChildren[index]);
			}
		}

		return output;
	}

	private assignVisualLevel(element: Element, depth: number): void {
		const visualLevel = this.visualLevelForDepth(depth);
		const value = String(visualLevel);

		if (element.getAttribute(LEVEL_ATTRIBUTE) !== value) {
			element.setAttribute(LEVEL_ATTRIBUTE, value);
		}
	}

	private visualLevelForDepth(depth: number): number {
		return Math.min(Math.max(depth, 0), MAX_VISUAL_LEVEL);
	}

	private clearAppliedLevels(root: ParentNode): void {
		for (const element of this.queryAll<Element>(
			root,
			`[${LEVEL_ATTRIBUTE}]`
		)) {
			element.removeAttribute(LEVEL_ATTRIBUTE);
		}
	}

	private findMainBranchSvg(content: HTMLElement): SVGSVGElement | null {
		const svgs = this.queryAll<SVGSVGElement>(content, ':scope > svg');
		if (svgs.length === 0) {
			return null;
		}

		let best = svgs[0];
		let bestCount = -1;

		for (const svg of svgs) {
			const count = svg.querySelectorAll('path,line').length;
			if (count > bestCount) {
				best = svg;
				bestCount = count;
			}
		}

		return best;
	}

	private findRootNode(nodes: NodeElement[]): NodeElement | null {
		return (
			nodes.find(
				(node) =>
					!node.classList.contains('mm-node-left') &&
					!node.classList.contains('mm-node-right')
			) ??
			nodes[0] ??
			null
		);
	}

	private getPathEndpoints(
		path: SVGPathElement
	): readonly [ScreenPoint, ScreenPoint] | null {
		try {
			const length = path.getTotalLength();
			if (!Number.isFinite(length) || length <= 0) {
				return null;
			}

			const start = this.pathPointToScreen(path, path.getPointAtLength(0));
			const end = this.pathPointToScreen(path, path.getPointAtLength(length));

			return start !== null && end !== null ? [start, end] : null;
		} catch {
			return null;
		}
	}

	private pathPointToScreen(
		path: SVGPathElement,
		point: DOMPoint
	): ScreenPoint | null {
		const svg = path.ownerSVGElement;
		const ctm = path.getScreenCTM();

		if (svg === null || ctm === null) {
			return null;
		}

		try {
			const svgPoint = svg.createSVGPoint();
			svgPoint.x = point.x;
			svgPoint.y = point.y;

			const transformed = svgPoint.matrixTransform(ctm);
			return { x: transformed.x, y: transformed.y };
		} catch {
			return null;
		}
	}

	private findNearestNode(
		point: ScreenPoint,
		nodes: NodeElement[],
		rects: Map<NodeElement, DOMRect>
	): { node: NodeElement | null; distance: number } {
		let bestNode: NodeElement | null = null;
		let bestDistance = Number.POSITIVE_INFINITY;

		for (const node of nodes) {
			const rect = rects.get(node);
			if (rect === undefined) {
				continue;
			}

			const distance = this.pointToRectDistance(point, rect);
			if (distance < bestDistance) {
				bestNode = node;
				bestDistance = distance;
			}
		}

		return { node: bestNode, distance: bestDistance };
	}

	private pointToRectDistance(point: ScreenPoint, rect: DOMRect): number {
		const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
		const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
		return Math.hypot(dx, dy);
	}

	private makeDiagnostics(): unknown[] {
		const host: ParentNode = document;
		const reports: unknown[] = [];

		for (const content of this.queryAll<HTMLElement>(host, CONTENT_SELECTOR)) {
			const nodes = this.queryAll<NodeElement>(content, NODE_SELECTOR);
			const svg = this.findMainBranchSvg(content);
			const paths = svg ? this.queryAll<SVGPathElement>(svg, 'path') : [];
			const lines = svg ? this.queryAll<SVGLineElement>(svg, 'line') : [];

			if (nodes.length === 0 || svg === null) {
				reports.push({
					nodes: nodes.length,
					branchSVGPaths: paths.length,
					svgLines: lines.length,
					error: 'No complete MarkMind tree found',
				});
				continue;
			}

			const root = this.findRootNode(nodes);
			if (root === null) {
				reports.push({
					nodes: nodes.length,
					branchSVGPaths: paths.length,
					svgLines: lines.length,
					error: 'Root node not found',
				});
				continue;
			}

			const rects = new Map<NodeElement, DOMRect>(
				nodes.map((node) => [node, node.getBoundingClientRect()])
			);

			const graphState = this.buildGraph(nodes, paths, rects);
			const treeState = this.orientTree(root, graphState, paths);
			const traversal = this.preorderTraversal(root, treeState.children);
			const underlineNodes = traversal.filter(
				(node) => (treeState.depth.get(node) ?? -1) >= FIRST_UNDERLINE_DEPTH
			);

			const nodeLevels: Record<string, number> = {};
			for (const depth of treeState.depth.values()) {
				const key = String(depth);
				nodeLevels[key] = (nodeLevels[key] ?? 0) + 1;
			}

			reports.push({
				nodes: nodes.length,
				reachedNodesFromRoot: treeState.depth.size,
				branchSVGPaths: paths.length,
				matchedPaths: graphState.pathEdges.size,
				svgLines: lines.length,
				expectedUnderlineNodes: underlineNodes.length,
				lineCountMatches: lines.length === underlineNodes.length,
				nodeLevels,
				nodeSamples: traversal.slice(0, 20).map((node) => ({
					depth: treeState.depth.get(node) ?? null,
					visualLevel: node.getAttribute(LEVEL_ATTRIBUTE),
					text: node.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) ?? null,
					computedColor: getComputedStyle(node).color,
				})),
				pathSamples: paths.slice(0, 20).map((path, index) => ({
					index,
					visualLevel: path.getAttribute(LEVEL_ATTRIBUTE),
					computedStroke: getComputedStyle(path).stroke,
				})),
				lineSamples: lines.slice(0, 20).map((line, index) => ({
					index,
					visualLevel: line.getAttribute(LEVEL_ATTRIBUTE),
					expectedNodeDepth: underlineNodes[index]
						? treeState.depth.get(underlineNodes[index]) ?? null
						: null,
					computedStroke: getComputedStyle(line).stroke,
				})),
			});
		}

		return reports;
	}

	private queryAll<T extends Element>(
		root: ParentNode,
		selector: string
	): T[] {
		return Array.from(root.querySelectorAll<T>(selector));
	}
}
