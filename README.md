# Level Colors for MarkMind

A tiny, lazy companion plugin for Obsidian that automatically colours **MarkMind Basic** mind maps by hierarchy level.

It is intentionally narrow in scope: install it, enable it, and let it assign colours to nodes and branches based on their level in the tree.

> [!NOTE]
> **Unofficial companion plugin.** This project is not affiliated with or endorsed by MarkMind or Obsidian.
>
> MarkMind must be installed separately. This plugin does not include, redistribute, unlock, or modify MarkMind source code or paid features.

## What it does

- Automatically colours MarkMind Basic nodes by hierarchy level.
- Colours branch curves to match the corresponding hierarchy level.
- Colours MarkMind's underline segments using logical tree traversal.
- Re-applies colours after relevant layout or render changes.
- Does not modify note contents.
- Uses CSS for all visual styling; runtime code only assigns structural level markers.
- Intended to support desktop and mobile Obsidian.

The plugin does **not** try to be a full styling system or theme editor. It is a small automatic level-colouring helper.

## How it works

MarkMind Basic renders a tree as node elements plus SVG branch elements.

Level Colors for MarkMind:

1. Finds the rendered MarkMind Basic tree.
2. Reconstructs the parent/child graph from branch connections.
3. Orients the graph from the root.
4. Traverses the tree in branch-render order.
5. Calculates hierarchy depth.
6. Assigns a `data-lcfm-level` marker to each node, branch and underline.
7. Lets `styles.css` handle all colours.

Underline assignment uses the logical traversal sequence rather than node text or screen-row matching.

## Manual installation

Copy these three release files into:

```text
.obsidian/plugins/level-colors-for-markmind/
```

Files:

```text
main.js
manifest.json
styles.css
```

Reload Obsidian and enable **Level Colors for MarkMind** under Community plugins.

## Development

Requirements:

- Node.js 18 or newer
- npm

Install dependencies:

```bash
npm install
```

Development build:

```bash
npm run dev
```

Production build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

The production build writes `main.js` in the repository root. `main.js` is ignored by Git and should be attached to the corresponding GitHub Release instead.

## Release files

Each GitHub Release should contain:

```text
main.js
manifest.json
styles.css
```

The release tag must match the version in `manifest.json`, without a `v` prefix.

## Compatibility

- Target: MarkMind Basic mode
- MarkMind Rich mode: not supported or tested
- Desktop: supported
- Mobile / Android: intended to be supported
- Minimum Obsidian version: see `manifest.json`

This plugin depends on MarkMind Basic's rendered DOM/SVG structure. A future MarkMind update may require compatibility changes.

## Privacy

This plugin does not make network requests, collect analytics, or transmit note contents.

It only inspects the currently rendered MarkMind view and assigns local DOM level markers used by the bundled stylesheet.

## Development note

This plugin was **vibe-coded with ChatGPT**, then refined through iterative manual testing and debugging against MarkMind Basic.

Maintained by **SDesolator**.

## License

MIT. See [LICENSE](LICENSE).
