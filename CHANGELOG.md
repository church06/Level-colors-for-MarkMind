# Changelog

## 1.0.5

- Branch-to-node matching now scales with the map's zoom, so zooming far in or out no longer drops or mismatches branch colors.
- Maps in pop-out windows are now colored.
- Hidden maps (background tabs) keep their colors instead of being cleared, so there is no uncolored flash when switching back.
- Only maps that actually changed are recolored; unrelated interface class changes no longer trigger a full rescan.
- Command renamed to "Re-apply MarkMind level colors"; user-facing text now consistently uses "colors".
- Pinned development dependency versions.

## 1.0.4

- Expanded the palette to 24 colors that repeat at deeper levels instead of staying grey.
- Added paired light/dark palettes that prioritise readability, with softer bright colors in dark mode and matching darker hues in light mode.
- Increased color separation between adjacent levels, including the end-to-start transition of the cycle.
- Filtered unrelated interface mutations and prevented continuous rendering from indefinitely delaying color updates.
- Removed stale level markers when nodes, branches or underlines can no longer be mapped.
- Paused underline coloring when the tree or underline sequence is incomplete, restoring it after a complete render.
- Added coloring for single-node mind maps.

## 1.0.3

Review cleanup release.

- Node text and underline keep the node's own hierarchy color.
- Outgoing branches and the node junction/bar use the child hierarchy color.
- Preserved the stable MarkMind hierarchy-color overrides required for node, branch and underline rendering.
- Includes the latest diagnostics, deprecated API cleanup and reproducible build metadata.
- Corrected repository ignore rules so TypeScript source remains tracked.

## 1.0.2

Lint/submission cleanup and a small visual-mapping adjustment.

- Removed console logging from diagnostics fallback.
- Removed deprecated `workspace.activeLeaf` usage.
- Marked Node.js build scripts separately in ESLint configuration.
- Adjusted diagnostics UI text to sentence case.
- Nodes now use their current hierarchy-level color instead of the next level's color.
- Branch curves and underline segments use the same current-level mapping.

## 1.0.1

Submission-oriented refactor.

- Moved source code to `src/main.ts`.
- Added TypeScript, esbuild and lint scaffolding.
- Moved all visual styling out of JavaScript and into `styles.css`.
- Consolidated repeated node/path/line color application into one structural level assignment helper.
- Consolidated parent/child edge resolution into one helper.
- Replaced recursive DFS with an iterative preorder traversal.
- Added cleanup when the plugin is disabled.

## 1.0.0

Initial public build.
