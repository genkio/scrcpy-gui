import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { clipboard } from 'electron'
import { AdbServerClient } from '@yume-chan/adb'
import { AdbServerNodeTcpConnector } from '@yume-chan/adb-server-node-tcp'
import { AdbScrcpyClient, AdbScrcpyOptionsLatest } from '@yume-chan/adb-scrcpy'
import {
	AndroidKeyCode,
	AndroidKeyEventAction,
	AndroidMotionEventAction,
	AndroidScreenPowerMode
} from '@yume-chan/scrcpy'
import { ReadableStream, WritableStream } from '@yume-chan/stream-extra'
import { resourcesPath } from './paths'

// must match the jar in resources/, refresh both with `npm run fetch:server`
const SERVER_VERSION = '3.3.3'
const DEVICE_SERVER_PATH = '/data/local/tmp/scrcpy-server-scrcpygui.jar'

export const NAV_KEYS = {
	home: AndroidKeyCode.AndroidHome,
	back: AndroidKeyCode.AndroidBack,
	appSwitch: AndroidKeyCode.AndroidAppSwitch,
	menu: AndroidKeyCode.ContextMenu,
	power: AndroidKeyCode.Power,
	volumeUp: AndroidKeyCode.VolumeUp,
	volumeDown: AndroidKeyCode.VolumeDown
}

const serverStream = async () => {
	const binary = await readFile(join(resourcesPath(), 'scrcpy-server'))
	return new ReadableStream({
		start(controller) {
			controller.enqueue(new Uint8Array(binary))
			controller.close()
		}
	})
}

export class MirrorSession {
	#serial
	#send
	#client
	#adb
	#stopped = false
	#tail = Promise.resolve()

	constructor(serial, send) {
		this.#serial = serial
		this.#send = send
	}

	// the control stream has a single writer, so overlapping input events
	// (a drag is a burst of them) have to be sent one at a time
	#serialize(task) {
		const result = this.#tail.then(task, task)
		this.#tail = result.then(
			() => {},
			() => {}
		)
		return result
	}

	async start({ maxSize = 0, videoBitRate = 8000000, maxFps = 0 } = {}) {
		const server = new AdbServerClient(
			new AdbServerNodeTcpConnector({ host: '127.0.0.1', port: 5037 })
		)
		this.#adb = await server.createAdb({ serial: this.#serial })

		await AdbScrcpyClient.pushServer(this.#adb, await serverStream(), DEVICE_SERVER_PATH)

		this.#client = await AdbScrcpyClient.start(
			this.#adb,
			DEVICE_SERVER_PATH,
			new AdbScrcpyOptionsLatest(
				{
					video: true,
					audio: false,
					control: true,
					videoCodec: 'h264',
					maxSize,
					videoBitRate,
					maxFps,
					clipboardAutosync: true,
					powerOn: true,
					cleanup: true
				},
				{ version: SERVER_VERSION }
			)
		)

		this.#client.output.pipeTo(
			new WritableStream({
				write: line => console.log(`[scrcpy-server ${this.#serial}] ${line}`)
			})
		).catch(() => {})

		this.#client.exited.then(
			() => this.#send('mirror:closed', { reason: 'exited' }),
			error => this.#send('mirror:closed', { reason: String(error) })
		)

		// device copies land on the computer clipboard, matching scrcpy's autosync
		this.#client.clipboard
			?.pipeTo(
				new WritableStream({
					write: text => clipboard.writeText(text)
				})
			)
			.catch(() => {})

		const video = await this.#client.videoStream
		this.#send('mirror:ready', {
			codec: video.metadata.codec,
			width: video.metadata.width ?? 0,
			height: video.metadata.height ?? 0
		})

		this.#pumpVideo(video.stream)
		return { width: video.metadata.width ?? 0, height: video.metadata.height ?? 0 }
	}

	async #pumpVideo(stream) {
		try {
			await stream.pipeTo(
				new WritableStream({
					write: packet => {
						if (this.#stopped) return
						// structured clone keeps the Uint8Array, so the renderer can feed
						// it straight into WebCodecs without a copy on our side
						this.#send('mirror:packet', {
							type: packet.type,
							data: packet.data,
							keyframe: packet.keyframe,
							pts: packet.pts
						})
					}
				})
			)
		} catch (error) {
			if (!this.#stopped) this.#send('mirror:closed', { reason: String(error) })
		}
	}

	get #controller() {
		const controller = this.#client?.controller
		if (!controller) throw new Error('control is not available')
		return controller
	}

	touch({ action, x, y, width, height, pressure = 1, buttons = 0 }) {
		return this.#serialize(() =>
			this.#controller.injectTouch({
				action,
				pointerId: 0n,
				pointerX: Math.round(x),
				pointerY: Math.round(y),
				videoWidth: width,
				videoHeight: height,
				pressure: action === AndroidMotionEventAction.Up ? 0 : pressure,
				actionButton: buttons,
				buttons
			})
		)
	}

	scroll({ x, y, width, height, scrollX, scrollY, buttons = 0 }) {
		return this.#serialize(() =>
			this.#controller.injectScroll({
				pointerX: Math.round(x),
				pointerY: Math.round(y),
				videoWidth: width,
				videoHeight: height,
				scrollX,
				scrollY,
				buttons
			})
		)
	}

	key({ keyCode, metaState = 0, repeat = 0 }) {
		return this.#serialize(async () => {
			await this.#controller.injectKeyCode({
				action: AndroidKeyEventAction.Down,
				keyCode,
				repeat,
				metaState
			})
			await this.#controller.injectKeyCode({
				action: AndroidKeyEventAction.Up,
				keyCode,
				repeat: 0,
				metaState
			})
		})
	}

	text(text) {
		return this.#serialize(() => this.#controller.injectText(text))
	}

	setScreenOff(off) {
		return this.#serialize(() =>
			this.#controller.setScreenPowerMode(
				off ? AndroidScreenPowerMode.Off : AndroidScreenPowerMode.Normal
			)
		)
	}

	paste() {
		const content = clipboard.readText()
		if (!content) return Promise.resolve()
		return this.#serialize(() =>
			this.#controller.setClipboard({ content, sequence: 0n, paste: true })
		)
	}

	expandNotifications() {
		return this.#serialize(() => this.#controller.expandNotificationPanel())
	}

	rotate() {
		return this.#serialize(() => this.#controller.rotateDevice())
	}

	async battery() {
		const output = await this.#adb.subprocess.noneProtocol.spawnWaitText(['dumpsys', 'battery'])
		const level = /level:\s*(\d+)/.exec(output)
		return level ? Number(level[1]) : null
	}

	async stop() {
		this.#stopped = true
		try {
			await this.#client?.close()
		} catch {
			// the socket is usually already gone when the device disconnects
		}
	}
}
