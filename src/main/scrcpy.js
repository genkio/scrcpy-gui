import { spawn } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BINARY = process.platform === 'win32' ? 'scrcpy.exe' : 'scrcpy'

// `source` may be either the binary itself or the folder holding it
const resolveBinary = source => {
	if (!source) return BINARY
	if (!existsSync(source)) return null
	const candidate = statSync(source).isDirectory() ? join(source, BINARY) : source
	return existsSync(candidate) ? candidate : null
}

export const buildArgs = config => {
	const {
		title, record, screen, fixed, control, touch, audio, bitRate,
		maxSize, maxFps, orientation, crop, window, border, fullscreen, awake
	} = config

	const args = ['--shortcut-mod=lctrl,rctrl']

	if (title) args.push(`--window-title=${title}`)

	if (record.open) {
		if (!record.openMirror) args.push('--no-playback')
		args.push(`--record=${record.filepath}`)
	}

	if (screen) args.push('--turn-screen-off')
	if (fixed) args.push('--always-on-top')
	if (!border) args.push('--window-borderless')
	if (fullscreen) args.push('--fullscreen')
	if (awake) args.push('--stay-awake')
	if (!control) args.push('--no-control')
	if (touch) args.push('--show-touches')
	if (!audio) args.push('--no-audio')

	if (bitRate !== 8) args.push(`--video-bit-rate=${bitRate}M`)
	if (maxSize !== 0) args.push(`--max-size=${maxSize}`)
	if (maxFps !== 0) args.push(`--max-fps=${maxFps}`)
	if (orientation !== 0) args.push(`--orientation=${orientation}`)

	const { x: cropX, y: cropY, height: cropHeight, width: cropWidth } = crop
	if (cropHeight !== 0 || cropWidth !== 0) {
		args.push(`--crop=${cropWidth}:${cropHeight}:${cropX}:${cropY}`)
	}

	const { x, y, height, width } = window
	if (x !== 0 || y !== 0) {
		args.push(`--window-x=${x}`, `--window-y=${y}`)
	}
	if (height !== 0 || width !== 0) {
		args.push(`--window-width=${width}`, `--window-height=${height}`)
	}

	return args
}

export const open = (send, { config, devices }) => {
	const command = resolveBinary(config.source)
	if (!command) {
		send('error', { type: 'unknownScrcpyPathException' })
		return
	}

	const args = buildArgs(config)

	devices.forEach(({ id }) => {
		const child = spawn(command, [...args, '--serial', id])
		let exited = false

		child.on('spawn', () => send('scrcpy:opened', id))

		child.stderr.on('data', data => console.log(`[scrcpy ${id}] ${data}`.trimEnd()))

		child.on('error', err => {
			exited = true
			console.error(`[scrcpy ${id}]`, err)
			send('error', { type: 'unknownScrcpyPathException', detail: err.message })
		})

		child.on('exit', code => {
			if (exited) return
			exited = true
			send('scrcpy:closed', { success: code === 0, id })
		})
	})
}
