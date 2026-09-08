# Level Colors for MarkMind

A tiny, lazy companion plugin for Obsidian that automatically colours **MarkMind Basic** mind maps by hierarchy level.

It is intentionally narrow in scope: install it, enable it, and let it assign colours to nodes and branches based on their level in the tree.

> [!NOTE]
> **Unofficial companion plugin.** This project is not affiliated with or endorsed by MarkMind or Obsidian.
>
> MarkMind must be installed separately. This plugin does not include, redistribute, unlock, or modify MarkMind source code or paid features.

## What it does

- Automatically colours MarkMind Basic nodes by hierarchy level.
- Colours rendered branch curves to match the relevant level.
- Colours MarkMind's underline segments using logical tree traversal.
- Re-applies colours after layout changes and node edits.
- Works without changing the Markdown content of the note.
- Designed to work on both desktop and mobile Obsidian.

The plugin does **not** try to be a full styling system or theme editor. It is just a lightweight automatic level-colouring helper.

## How it works

MarkMind Basic renders a tree as nodes plus SVG branch elements.

Level Colors for MarkMind:

1. Identifies the rendered MarkMind Basic tree.
2. Reconstructs the parent/child graph from the branch connections.
3. Traverses the tree from the root.
4. Assigns a hierarchy depth to each node.
5. Applies a palette automatically by level.
6. Uses logical traversal order to bind the rendered underline segments to their nodes.

Underline assignment does not rely on note text or screen-row matching.

## Installation

### Manual installation

1. Install and enable **MarkMind** in Obsidian.
2. Download the latest release of this plugin.
3. Create this folder inside your vault:

   ```text
   .obsidian/plugins/level-colors-for-markmind/
   ```

4. Put these files inside it:

   ```text
   main.js
   manifest.json
   styles.css
   ```

5. Reload Obsidian.
6. Open **Settings → Community plugins**.
7. Enable **Level Colors for MarkMind**.

### Android

The plugin is not marked as desktop-only and uses browser/Obsidian DOM APIs.

If your vault configuration is synced, sync:

```text
.obsidian/plugins/level-colors-for-markmind/
```

to Android and enable the plugin there as well.

## Usage

Normally there is nothing to configure.

Open a MarkMind Basic mind map and the colours should be applied automatically.

A command is also available from the Command Palette:

```text
Re-apply MarkMind level colours
```

## Palette

The current built-in palette is defined near the top of `main.js`.

The plugin provides distinct colours for deep trees as well as shallow ones. If a tree becomes deeper than the built-in palette, the last colour is reused.

There is currently no settings UI. This is deliberate: the plugin is intended to remain small and low-maintenance.

## Compatibility

- **Target:** MarkMind Basic mode
- **Obsidian:** minimum version declared in `manifest.json`
- **Desktop:** supported
- **Mobile / Android:** intended to be supported
- **MarkMind Rich mode:** not supported or tested

This plugin depends on MarkMind Basic's rendered DOM/SVG structure. A future MarkMind update may require compatibility changes.

## Development

This plugin was **vibe-coded with ChatGPT**, then refined through iterative manual testing and debugging against MarkMind Basic.

Maintained by **SDesolator**.

## Privacy

This plugin does not make network requests, collect analytics, or transmit note content.

It only inspects and styles the MarkMind view currently rendered inside Obsidian.

## License

MIT. See [LICENSE](LICENSE).
