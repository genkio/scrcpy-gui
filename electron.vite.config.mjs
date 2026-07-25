import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

const shared = resolve('src/shared')

const TANGO = [
	'@yume-chan/adb',
	'@yume-chan/adb-scrcpy',
	'@yume-chan/adb-server-node-tcp',
	'@yume-chan/scrcpy',
	'@yume-chan/stream-extra'
]

export default defineConfig({
	main: {
		// the tango packages are ESM-only, so bundle them instead of require()-ing at runtime
		plugins: [externalizeDepsPlugin({ exclude: TANGO })],
		resolve: {
			alias: { '@shared': shared }
		}
	},
	preload: {
		plugins: [externalizeDepsPlugin()]
	},
	renderer: {
		resolve: {
			alias: {
				'@': resolve('src/renderer/src'),
				'@shared': shared
			}
		},
		build: {
			rollupOptions: {
				input: {
					index: resolve('src/renderer/index.html'),
					mirror: resolve('src/renderer/mirror.html')
				}
			}
		},
		plugins: [vue()]
	}
})
