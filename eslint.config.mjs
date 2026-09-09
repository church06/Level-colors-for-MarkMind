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
	},
	{
		files: ['esbuild.config.mjs', 'version-bump.mjs'],
		rules: {
			'obsidianmd/no-nodejs-modules': 'off',
			'no-undef': 'off',
		},
	},
]);
