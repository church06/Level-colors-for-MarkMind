# Releasing

## GitHub repository

Upload the contents of this folder to a GitHub repository, for example:

```text
level-colors-for-markmind
```

## GitHub Release

For version `1.0.0`:

1. Commit and push the repository.
2. Create a Git tag/release named `1.0.0`.
3. Attach these three files from the repository root to the GitHub Release:
   - `main.js`
   - `manifest.json`
   - `styles.css`
4. Keep `versions.json` in the repository root.

If you later submit the plugin to the Obsidian Community Plugin directory, keep
the plugin ID stable:

```text
level-colors-for-markmind
```

Do not change the ID after users have installed the public plugin.
