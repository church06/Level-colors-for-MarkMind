const { Plugin, Notice } = require('obsidian');

module.exports = class LevelColorsForMarkMind extends Plugin {
  async onload() {
    this.palette = [
      '#E65C87', '#3D91D4', '#42B883', '#F29A2E', '#9A72D8',
      '#43A9A0', '#D7A93B', '#E06F5C', '#6574C4', '#78A83B',
      '#C060A1', '#4E9FB5', '#A46F4C', '#7A8A99'
    ];

    this.timer = null;

    this.schedule = this.schedule.bind(this);
    this.apply = this.apply.bind(this);

    this.registerEvent(this.app.workspace.on('layout-change', this.schedule));
    this.registerEvent(this.app.workspace.on('active-leaf-change', this.schedule));

    this.observer = new MutationObserver((records) => {
      for (const record of records) {
        if (
          record.type === 'childList' ||
          (record.type === 'attributes' &&
            ['d', 'class'].includes(record.attributeName))
        ) {
          this.schedule();
          break;
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['d', 'class']
    });

    this.register(() => this.observer?.disconnect());

    this.addCommand({
      id: 'reapply-level-colors',
      name: 'Re-apply MarkMind level colours',
      callback: () => this.apply(true)
    });

    this.schedule();
  }

  onunload() {
    if (this.timer) {
      window.clearTimeout(this.timer);
    }
  }

  schedule() {
    if (this.timer) {
      window.clearTimeout(this.timer);
    }

    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.apply(false);
    }, 160);
  }

  colourFor(index) {
    const i = Math.max(
      0,
      Math.min(this.palette.length - 1, Number(index) || 0)
    );
    return this.palette[i];
  }

  // The current visual convention intentionally shifts non-root nodes by +1.
  // This aligns node styling with the branch level that visually follows it.
  nodeVisualIndex(depth) {
    if (depth === 0) {
      return 0;
    }
    return depth + 1;
  }

  pointToRectDistance(point, rect) {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    return Math.hypot(dx, dy);
  }

  pathPointToScreen(path, point) {
    const svg = path.ownerSVGElement;
    const ctm = path.getScreenCTM?.();

    if (!svg || !ctm) {
      return null;
    }

    try {
      const svgPoint = svg.createSVGPoint();
      svgPoint.x = point.x;
      svgPoint.y = point.y;

      const output = svgPoint.matrixTransform(ctm);
      return { x: output.x, y: output.y };
    } catch {
      return null;
    }
  }

  getPathEndpoints(path) {
    try {
      const length = path.getTotalLength();

      if (!Number.isFinite(length) || length <= 0) {
        return null;
      }

      const start = this.pathPointToScreen(
        path,
        path.getPointAtLength(0)
      );
      const end = this.pathPointToScreen(
        path,
        path.getPointAtLength(length)
      );

      return start && end ? [start, end] : null;
    } catch {
      return null;
    }
  }

  nearestNode(point, nodes, rects) {
    let best = null;
    let bestDistance = Infinity;

    for (const node of nodes) {
      const distance = this.pointToRectDistance(point, rects.get(node));

      if (distance < bestDistance) {
        bestDistance = distance;
        best = node;
      }
    }

    return {
      node: best,
      distance: bestDistance
    };
  }

  findMainBranchSVG(content) {
    const svgs = [...content.querySelectorAll(':scope > svg')];

    if (!svgs.length) {
      return null;
    }

    svgs.sort((a, b) => {
      const aCount = a.querySelectorAll('path,line').length;
      const bCount = b.querySelectorAll('path,line').length;
      return bCount - aCount;
    });

    return svgs[0];
  }

  rootNode(nodes) {
    return (
      nodes.find(
        (node) =>
          !node.classList.contains('mm-node-left') &&
          !node.classList.contains('mm-node-right')
      ) || nodes[0]
    );
  }

  // Branch endpoints are used only to reconstruct the parent/child graph.
  // Underline assignment is traversal-based rather than text/row matching.
  buildGraph(nodes, paths, rects) {
    const graph = new Map(nodes.map((node) => [node, new Set()]));
    const pathEdge = new Map();

    for (const path of paths) {
      const endpoints = this.getPathEndpoints(path);

      if (!endpoints) {
        continue;
      }

      const a = this.nearestNode(endpoints[0], nodes, rects);
      const b = this.nearestNode(endpoints[1], nodes, rects);

      if (
        a.node &&
        b.node &&
        a.node !== b.node &&
        a.distance <= 90 &&
        b.distance <= 90
      ) {
        graph.get(a.node).add(b.node);
        graph.get(b.node).add(a.node);
        pathEdge.set(path, [a.node, b.node]);
      }
    }

    return { graph, pathEdge };
  }

  orientTree(root, graph, paths, pathEdge) {
    const depth = new Map([[root, 0]]);
    const parent = new Map([[root, null]]);
    const queue = [root];

    while (queue.length) {
      const current = queue.shift();
      const currentDepth = depth.get(current);

      for (const next of graph.get(current) || []) {
        if (!depth.has(next)) {
          depth.set(next, currentDepth + 1);
          parent.set(next, current);
          queue.push(next);
        }
      }
    }

    // Preserve child order from MarkMind's actual branch render order.
    const children = new Map(
      [...graph.keys()].map((node) => [node, []])
    );
    const seenChildren = new Set();

    for (const path of paths) {
      const edge = pathEdge.get(path);

      if (!edge) {
        continue;
      }

      const [a, b] = edge;
      let parentNode = null;
      let childNode = null;

      if (parent.get(a) === b) {
        parentNode = b;
        childNode = a;
      } else if (parent.get(b) === a) {
        parentNode = a;
        childNode = b;
      } else {
        const aDepth = depth.get(a);
        const bDepth = depth.get(b);

        if (
          aDepth == null ||
          bDepth == null ||
          aDepth === bDepth
        ) {
          continue;
        }

        if (aDepth < bDepth) {
          parentNode = a;
          childNode = b;
        } else {
          parentNode = b;
          childNode = a;
        }
      }

      if (!seenChildren.has(childNode)) {
        children.get(parentNode)?.push(childNode);
        seenChildren.add(childNode);
      }
    }

    return {
      depth,
      parent,
      children
    };
  }

  dfsPreorder(root, children) {
    const output = [];

    const visit = (node) => {
      output.push(node);

      for (const child of children.get(node) || []) {
        visit(child);
      }
    };

    visit(root);
    return output;
  }

  styleNode(node, depth) {
    const visualIndex = this.nodeVisualIndex(depth);
    const colour = this.colourFor(visualIndex);

    node.setAttribute('data-lcfm-depth', String(depth));
    node.setAttribute('data-lcfm-visual', String(visualIndex));
    node.style.setProperty('color', colour, 'important');

    const content = node.querySelector('.mm-node-content');

    if (content) {
      content.style.setProperty('color', colour, 'important');
      content.style.setProperty('border-color', colour, 'important');

      content.querySelectorAll('span,p,li,ol').forEach((element) => {
        element.style.setProperty('color', colour, 'important');
        element.style.setProperty('border-color', colour, 'important');
      });
    }

    const bar = node.querySelector('.mm-node-bar');

    if (bar) {
      bar.style.setProperty('background', colour, 'important');
      bar.style.setProperty('background-color', colour, 'important');
      bar.style.setProperty('border-color', colour, 'important');
      bar.style.setProperty('color', colour, 'important');
      bar.style.removeProperty('box-shadow');
    }
  }

  stylePath(path, childDepth) {
    const visualIndex = this.nodeVisualIndex(childDepth);
    const colour = this.colourFor(visualIndex);

    path.style.setProperty('stroke', colour, 'important');
    path.style.setProperty('color', colour, 'important');
    path.setAttribute('data-lcfm-child-depth', String(childDepth));
    path.setAttribute('data-lcfm-visual', String(visualIndex));
  }

  styleLine(line, nodeDepth) {
    const visualIndex = this.nodeVisualIndex(nodeDepth);
    const colour = this.colourFor(visualIndex);

    line.style.setProperty('stroke', colour, 'important');
    line.style.setProperty('color', colour, 'important');
    line.setAttribute('data-lcfm-node-depth', String(nodeDepth));
    line.setAttribute('data-lcfm-visual', String(visualIndex));
  }

  apply(showNotice) {
    const activeLeaf = this.app.workspace.activeLeaf;
    const host = activeLeaf?.view?.containerEl || document;
    const contents = [
      ...host.querySelectorAll('.mm-mindmap-content')
    ];

    let nodesPainted = 0;
    let pathsPainted = 0;
    let linesPainted = 0;
    let expectedLines = 0;
    let actualLines = 0;

    for (const content of contents) {
      const nodes = [
        ...content.querySelectorAll(':scope > .mm-node')
      ];

      if (nodes.length < 2) {
        continue;
      }

      const svg = this.findMainBranchSVG(content);

      if (!svg) {
        continue;
      }

      const paths = [...svg.querySelectorAll('path')];
      const lines = [...svg.querySelectorAll('line')];

      if (!paths.length) {
        continue;
      }

      const rects = new Map(
        nodes.map((node) => [node, node.getBoundingClientRect()])
      );

      const root = this.rootNode(nodes);
      const { graph, pathEdge } = this.buildGraph(
        nodes,
        paths,
        rects
      );
      const { depth, parent, children } = this.orientTree(
        root,
        graph,
        paths,
        pathEdge
      );

      const traversal = this.dfsPreorder(root, children);

      // In MarkMind Basic, underline SVG lines correspond to traversal
      // nodes at depth >= 2. Pairing is therefore structural and ordered,
      // rather than inferred from node text or screen-row geometry.
      const underlineNodes = traversal.filter(
        (node) => (depth.get(node) ?? -1) >= 2
      );

      expectedLines += underlineNodes.length;
      actualLines += lines.length;

      for (const node of traversal) {
        const nodeDepth = depth.get(node);

        if (nodeDepth == null) {
          continue;
        }

        this.styleNode(node, nodeDepth);
        nodesPainted++;
      }

      for (const path of paths) {
        const edge = pathEdge.get(path);

        if (!edge) {
          continue;
        }

        const [a, b] = edge;
        let child = null;

        if (parent.get(a) === b) {
          child = a;
        } else if (parent.get(b) === a) {
          child = b;
        } else {
          const aDepth = depth.get(a);
          const bDepth = depth.get(b);

          if (
            aDepth != null &&
            bDepth != null &&
            aDepth !== bDepth
          ) {
            child = aDepth > bDepth ? a : b;
          }
        }

        const childDepth = child ? depth.get(child) : null;

        if (childDepth == null) {
          continue;
        }

        this.stylePath(path, childDepth);
        pathsPainted++;
      }

      const pairCount = Math.min(
        lines.length,
        underlineNodes.length
      );

      for (let index = 0; index < pairCount; index++) {
        const node = underlineNodes[index];
        const nodeDepth = depth.get(node);

        if (nodeDepth == null) {
          continue;
        }

        this.styleLine(lines[index], nodeDepth);
        linesPainted++;
      }
    }

    if (showNotice) {
      const lineStatus =
        expectedLines === actualLines ? 'exact' : 'count mismatch';

      new Notice(
        `Level Colors for MarkMind: ${nodesPainted} nodes, ` +
        `${pathsPainted} branches, ${linesPainted} underlines; ` +
        `underline mapping ${lineStatus}.`
      );
    }
  }
};
