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
	AndroidScreenPowerMode,
	ScrcpyControlMessageType,
	ScrcpySetClipboardControlMessage
} from '@yume-chan/scrcpy'
import { ClipboardStream } from '@yume-chan/scrcpy/esm/3_3_1/impl/index.js'
import { ReadableStream, WritableStream } from '@yume-chan/stream-extra'
import { resourcesPath } from './paths'

// must match the jar in resources/, refresh both with `npm run fetch:server`
const SERVER_VERSION = '3.3.3'
const DEVICE_SERVER_PATH = '/data/local/tmp/scrcpy-server-scrcpygui.jar'

// Tango's AndroidKeyCode stops short of the system keys
const KEY_WAKEUP = 224
const KEY_ALL_APPS = 284

// scrcpy's raw audio codec captures at a fixed 48 kHz stereo s16le
const AUDIO_SAMPLE_RATE = 48000
const AUDIO_CHANNELS = 2

// a click landing this long after the previous input may be hitting a sleeping phone
const WAKE_IDLE = 3000
const HOME_SETTLE = 350
const SWIPE = { from: 0.7, to: 0.3, steps: 12, stepMs: 18 }

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

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
	#clipboardRequestType
	#clipboardSetType
	#clipboardRequest
	#screenOff = false
	#lastInput = 0
	#allAppsKey

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

		const options = new AdbScrcpyOptionsLatest(
			{
				video: true,
				audio: true,
				// raw skips a decoder on the Mac side; the bandwidth (192 kB/s) is noise next to video
				audioCodec: 'raw',
				control: true,
				videoCodec: 'h264',
				maxSize,
				videoBitRate,
				maxFps,
				clipboardAutosync: false,
				powerOn: true,
				cleanup: true
			},
			{ version: SERVER_VERSION }
		)
		this.#clipboardRequestType = options.controlMessageTypes.indexOf(
			ScrcpyControlMessageType.GetClipboard
		)
		this.#clipboardSetType = options.controlMessageTypes.indexOf(
			ScrcpyControlMessageType.SetClipboard
		)
		const deviceClipboard = options.deviceMessageParsers.add(new ClipboardStream())

		this.#client = await AdbScrcpyClient.start(
			this.#adb,
			DEVICE_SERVER_PATH,
			options
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

		deviceClipboard
			.pipeTo(
				new WritableStream({
					write: text => {
						clipboard.writeText(text)
						const request = this.#clipboardRequest
						this.#clipboardRequest = null
						request?.resolve()
					}
				})
			)
			.catch(() => {})

		const video = await this.#client.videoStream
		this.#lastInput = Date.now()
		this.#send('mirror:ready', {
			codec: video.metadata.codec,
			width: video.metadata.width ?? 0,
			height: video.metadata.height ?? 0
		})

		this.#pumpVideo(video.stream)
		this.#pumpAudio()
		return { width: video.metadata.width ?? 0, height: video.metadata.height ?? 0 }
	}

	// audio is best-effort: a device that cannot capture it (Android 10 and older) reports
	// "errored" and the mirror carries on video-only
	async #pumpAudio() {
		try {
			const audio = await this.#client.audioStream
			if (!audio || audio.type !== 'success') {
				if (audio) console.log(`[mirror ${this.#serial}] audio unavailable: ${audio.type}`)
				return
			}

			this.#send('mirror:audio-ready', {
				codec: audio.codec.optionValue,
				sampleRate: AUDIO_SAMPLE_RATE,
				channels: AUDIO_CHANNELS
			})

			await audio.stream.pipeTo(
				new WritableStream({
					write: packet => {
						if (this.#stopped || packet.type !== 'data') return
						this.#send('mirror:audio', packet.data)
					}
				})
			)
		} catch (error) {
			if (!this.#stopped) console.error(`[mirror ${this.#serial}] audio failed:`, error)
		}
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

	// how long the phone has been left alone, which is all a click has to go on when
	// deciding whether it may be arriving at a sleeping screen
	#markInput() {
		const previous = this.#lastInput
		this.#lastInput = Date.now()
		return this.#lastInput - previous
	}

	#injectTouch({ action, x, y, width, height, pressure = 1, buttons = 0 }) {
		return this.#controller.injectTouch({
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
	}

	// A dozing phone ignores injected touches, and `powerOn` only covers the start of
	// the session, so a click that arrives out of the blue has to wake it. The wake is
	// queued behind the touch rather than in front of it: the sleeping phone drops the
	// touch anyway, so it cannot land on whatever the screen wakes up to, and nothing
	// slow ends up between the down event and the moves that follow it. An awake phone
	// treats WAKEUP as a no-op that only pushes its screen timeout back.
	touch(event) {
		const idle = this.#markInput()
		const injected = this.#serialize(() => this.#injectTouch(event))
		const wake =
			!this.#screenOff && idle >= WAKE_IDLE && event.action === AndroidMotionEventAction.Down
		if (wake) this.wake()
		return injected
	}

	scroll({ x, y, width, height, scrollX, scrollY, buttons = 0 }) {
		this.#markInput()
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

	async #injectKey({ keyCode, metaState = 0, repeat = 0 }) {
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
	}

	key(event) {
		this.#markInput()
		return this.#serialize(() => this.#injectKey(event))
	}

	wake() {
		return this.key({ keyCode: KEY_WAKEUP })
	}

	text(text) {
		this.#markInput()
		return this.#serialize(() => this.#controller.injectText(text))
	}

	setScreenOff(off) {
		this.#screenOff = off
		return this.#serialize(() =>
			this.#controller.setScreenPowerMode(
				off ? AndroidScreenPowerMode.Off : AndroidScreenPowerMode.Normal
			)
		)
	}

	copyClipboardToDevice() {
		const content = clipboard.readText()
		return this.#serialize(() => {
			if (this.#clipboardSetType < 0) {
				throw new Error('setting the device clipboard is not supported')
			}
			return this.#controller.write(
				ScrcpySetClipboardControlMessage.serialize({
					type: this.#clipboardSetType,
					content,
					sequence: 0n,
					paste: false
				})
			)
		})
	}

	copyClipboardFromDevice() {
		return this.#serialize(async () => {
			if (this.#clipboardRequestType < 0) {
				throw new Error('device clipboard requests are not supported')
			}

			let resolve
			let reject
			const response = new Promise((onResolve, onReject) => {
				resolve = onResolve
				reject = onReject
			})
			const request = { resolve, reject }
			this.#clipboardRequest = request
			const timeout = setTimeout(() => {
				if (this.#clipboardRequest === request) this.#clipboardRequest = null
				reject(new Error('phone clipboard did not respond'))
			}, 3000)

			try {
				await this.#controller.write(Uint8Array.of(this.#clipboardRequestType, 0))
				await response
			} finally {
				clearTimeout(timeout)
				if (this.#clipboardRequest === request) this.#clipboardRequest = null
			}
		})
	}

	expandNotifications() {
		return this.#serialize(() => this.#controller.expandNotificationPanel())
	}

	rotate() {
		return this.#serialize(() => this.#controller.rotateDevice())
	}

	mediaPlayPause() {
		return this.#shell(['input', 'keyevent', '85'])
	}

	#shell(args) {
		return this.#adb.subprocess.noneProtocol.spawnWaitText(args)
	}

	async #resolvePackage(user, filter) {
		const output = await this.#shell([
			'cmd',
			'package',
			'resolve-activity',
			'--brief',
			'--user',
			user,
			...filter
		])
		const component = output.trim().split('\n').pop().trim()
		return component.includes('/') ? component.split('/')[0] : null
	}

	// KEYCODE_ALL_APPS is handed to whichever launcher is the default home, so it is
	// dropped without a trace under launchers that declare no ALL_APPS activity
	// (Olauncher and other minimal ones). Those open their list on a swipe up instead.
	async #resolveAllAppsKey() {
		try {
			const user = (await this.#shell(['am', 'get-current-user'])).trim()
			if (!/^\d+$/.test(user)) return true
			const home = await this.#resolvePackage(user, [
				'-a',
				'android.intent.action.MAIN',
				'-c',
				'android.intent.category.HOME'
			])
			const allApps = await this.#resolvePackage(user, ['-a', 'android.intent.action.ALL_APPS'])
			return !home || home === allApps
		} catch {
			return true
		}
	}

	#swipeUp({ width, height } = {}) {
		if (!width || !height) throw new Error('the video size is not known yet')
		const x = width / 2
		const start = SWIPE.from * height
		const distance = (SWIPE.from - SWIPE.to) * height
		return this.#serialize(async () => {
			await this.#injectTouch({
				action: AndroidMotionEventAction.Down,
				x,
				y: start,
				width,
				height,
				buttons: 1
			})
			for (let step = 1; step <= SWIPE.steps; step += 1) {
				await delay(SWIPE.stepMs)
				await this.#injectTouch({
					action: AndroidMotionEventAction.Move,
					x,
					y: start - (distance * step) / SWIPE.steps,
					width,
					height,
					buttons: 1
				})
			}
			await this.#injectTouch({
				action: AndroidMotionEventAction.Up,
				x,
				y: SWIPE.to * height,
				width,
				height
			})
		})
	}

	async openAppDrawer(size) {
		if (!this.#screenOff) await this.wake()

		this.#allAppsKey ??= this.#resolveAllAppsKey()
		if (await this.#allAppsKey) {
			await this.#shell(['input', 'keyevent', String(KEY_ALL_APPS)])
			return
		}

		// the swipe only reaches the app list from the launcher's own screen
		await this.key({ keyCode: NAV_KEYS.home })
		await delay(HOME_SETTLE)
		await this.#swipeUp(size)
	}

	async battery() {
		const output = await this.#shell(['dumpsys', 'battery'])
		const level = /level:\s*(\d+)/.exec(output)
		return level ? Number(level[1]) : null
	}

	async stop() {
		this.#stopped = true
		this.#clipboardRequest?.reject(new Error('mirror stopped'))
		this.#clipboardRequest = null
		try {
			await this.#client?.close()
		} catch {
			// the socket is usually already gone when the device disconnects
		}
	}
}
