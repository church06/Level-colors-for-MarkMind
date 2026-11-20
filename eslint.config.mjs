import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		ignores: ['main.js'],
	},
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			// Keep the product name's canonical casing in UI text.
			'obsidianmd/ui/sentence-case': ['warn', { ignoreWords: ['MarkMind'] }],
		},
	},
	{
		files: ['esbuild.config.mjs', 'version-bump.mjs'],
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
			'no-undef': 'off',
		},
	},
]);
