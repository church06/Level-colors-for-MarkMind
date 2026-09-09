# Changelog

## 1.0.2

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
