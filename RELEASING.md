# Releasing

1. Run:
   ```bash
   npm install
   npm run lint
   npm run build
   ```
2. Confirm `manifest.json` and `versions.json` contain the intended version.
3. Commit the source repository. Do not commit generated `main.js`.
4. Create a GitHub Release whose tag exactly matches `manifest.json`, for example:
   `1.0.4`
5. Attach:
   - `main.js`
   - `manifest.json`
   - `styles.css`

Before an Obsidian Community submission, commit the generated `package-lock.json`
created by `npm install` so builds are reproducible with `npm ci`.
