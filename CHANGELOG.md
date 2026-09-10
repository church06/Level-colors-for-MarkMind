# Changelog

## 1.0.4

- Expanded the palette to 24 colours that repeat at deeper levels instead of staying grey.
- Added paired light/dark palettes that prioritise readability, with softer bright colours in dark mode and matching darker hues in light mode.
- Increased colour separation between adjacent levels, including the end-to-start transition of the cycle.
- Filtered unrelated interface mutations and prevented continuous rendering from indefinitely delaying colour updates.
- Removed stale level markers when nodes, branches or underlines can no longer be mapped.
- Paused underline colouring when the tree or underline sequence is incomplete, restoring it after a complete render.
- Added colouring for single-node mind maps.

## 1.0.3

- Node text and underline keep the node's own hierarchy colour.
- Outgoing branches and the node junction/bar use the child hierarchy colour.


Review cleanup release.

- Preserved the stable MarkMind hierarchy-colour overrides required for node, branch and underline rendering.
- Includes the latest diagnostics, deprecated API cleanup and reproducible build metadata.
- Corrected repository ignore rules so TypeScript source remains tracked.

## 1.0.2

Lint/submission cleanup:

- Removed console logging from diagnostics fallback.
- Removed deprecated `workspace.activeLeaf` usage.
- Marked Node.js build scripts separately in ESLint configuration.
- Adjusted diagnostics UI text to sentence case.


Small visual-mapping adjustment.

- Nodes now use their current hierarchy-level colour instead of the next level's colour.
- Branch curves and underline segments use the same current-level mapping.
- Tree reconstruction, traversal order, underline binding, and CSS-only styling are unchanged.

## 1.0.1

Submission-oriented refactor.

- Moved source code to `src/main.ts`.
- Added TypeScript, esbuild and lint scaffolding.
- Moved all visual styling out of JavaScript and into `styles.css`.
- Consolidated repeated node/path/line colour application into one structural level assignment helper.
- Consolidated parent/child edge resolution into one helper.
- Replaced recursive DFS with an iterative preorder traversal.
- Added cleanup when the plugin is disabled.
- Preserved the working branch-traversal and underline-binding behaviour from 1.0.0.

## 1.0.0

Initial public build.
