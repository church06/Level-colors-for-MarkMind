import { defineConfig } from 'eslint/config';
import obsidianmd from 'eslint-plugin-obsidianmd';

export default defineConfig([
	...obsidianmd.configs.recommended,
	{
		ignores: ['main.js'],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: [
						'eslint.config.mjs',
						'esbuild.config.mjs',
						'version-bump.mjs',
					],
				},
			},
		},
	},
]);
