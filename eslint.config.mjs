import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

// correctness rules plus the three style choices the codebase already follows;
// vue's formatting-opinion presets are deliberately not enabled
export default [
	{ ignores: ['out/', 'release/', 'node_modules/', 'bin/'] },
	js.configs.recommended,
	...pluginVue.configs['flat/essential'],
	// page components are single-word by existing convention (Management, Configuration)
	{ rules: { 'vue/multi-word-component-names': 'off' } },
	{
		plugins: { '@stylistic': stylistic },
		languageOptions: {
			ecmaVersion: 'latest',
			globals: { ...globals.node, ...globals.browser }
		},
		rules: {
			'@stylistic/indent': ['error', 'tab'],
			'@stylistic/semi': ['error', 'never'],
			'@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
			'no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
		}
	},
	{
		files: ['src/renderer/src/mirror/pcm-worklet.js'],
		languageOptions: {
			globals: { AudioWorkletProcessor: 'readonly', registerProcessor: 'readonly' }
		}
	}
]
