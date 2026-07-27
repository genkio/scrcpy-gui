<template>
	<div class="mirror">
		<header class="titlebar">
			<span class="device-name">{{ headerTitle }}</span>
		</header>

		<main class="stage">
			<div ref="slot" class="phone-slot">
				<div class="phone" :style="phoneStyle">
					<canvas
						ref="canvas"
						class="screen"
						@pointerdown="onPointerDown"
						@pointermove="onPointerMove"
						@pointerup="onPointerUp"
						@pointercancel="onPointerUp"
						@wheel.prevent="onWheel"
						@contextmenu.prevent
					></canvas>
					<div v-if="status" class="status">
						<p>{{ status }}</p>
						<button v-if="failed" class="retry" @click="connect">{{ $t('mirror.retry') }}</button>
					</div>
				</div>
			</div>

			<aside class="sidebar">
				<div class="tile-group">
					<button class="tile" :class="{ active: menuOpen }" @click="menuOpen = !menuOpen">
						<svg viewBox="0 0 24 24" class="glyph">
							<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6" />
							<circle cx="8" cy="12" r="1.3" />
							<circle cx="12" cy="12" r="1.3" />
							<circle cx="16" cy="12" r="1.3" />
						</svg>
						<span class="label">{{ $t('mirror.more') }}</span>
					</button>

					<div v-if="menuOpen" class="menu">
						<button v-for="item in menuItems" :key="item.key" @click="runMenu(item)">
							<span>{{ $t(`mirror.${item.key}`) }}</span>
							<kbd v-if="item.hint">{{ item.hint }}</kbd>
						</button>
					</div>

					<button class="tile" :class="{ active: screenOff }" @click="toggleScreen">
						<svg viewBox="0 0 24 24" class="glyph">
							<rect
								x="7"
								y="3"
								width="10"
								height="18"
								rx="2.5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
							/>
							<line x1="5" y1="21" x2="19" y2="3" stroke="currentColor" stroke-width="1.6" />
						</svg>
						<span class="label">{{ $t('mirror.screenOff') }}</span>
					</button>

					<button
						class="tile"
						:class="{ active: clipboardStatus === 'clipboardToDevice' }"
						@click="syncClipboard('clipboardToDevice')"
					>
						<svg viewBox="0 0 24 24" class="glyph">
							<rect
								x="3"
								y="5"
								width="7"
								height="14"
								rx="1.5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
							/>
							<rect
								x="15"
								y="4"
								width="6"
								height="16"
								rx="2"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
							/>
							<path
								d="M8 12h9m-3-3 3 3-3 3"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<span class="label">{{ $t('mirror.clipboardToDevice') }}</span>
					</button>

					<button
						class="tile"
						:class="{ active: clipboardStatus === 'clipboardFromDevice' }"
						@click="syncClipboard('clipboardFromDevice')"
					>
						<svg viewBox="0 0 24 24" class="glyph">
							<rect
								x="3"
								y="5"
								width="7"
								height="14"
								rx="1.5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
							/>
							<rect
								x="15"
								y="4"
								width="6"
								height="16"
								rx="2"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
							/>
							<path
								d="M16 12H7m3 3-3-3 3-3"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
						<span class="label">{{ $t('mirror.clipboardFromDevice') }}</span>
					</button>
				</div>

				<div class="tile-group nav">
					<button class="tile" @click="nav('appSwitch')">
						<svg viewBox="0 0 24 24" class="glyph">
							<rect
								x="6"
								y="6"
								width="12"
								height="12"
								rx="1.5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
							/>
						</svg>
						<kbd class="label">⇧⌘R</kbd>
					</button>
					<button class="tile" @click="nav('home')">
						<svg viewBox="0 0 24 24" class="glyph">
							<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.8" />
						</svg>
						<kbd class="label">⇧⌘H</kbd>
					</button>
					<button class="tile" @click="openAppDrawer">
						<svg viewBox="0 0 24 24" class="glyph">
							<circle cx="6" cy="6" r="1.7" />
							<circle cx="12" cy="6" r="1.7" />
							<circle cx="18" cy="6" r="1.7" />
							<circle cx="6" cy="12" r="1.7" />
							<circle cx="12" cy="12" r="1.7" />
							<circle cx="18" cy="12" r="1.7" />
							<circle cx="6" cy="18" r="1.7" />
							<circle cx="12" cy="18" r="1.7" />
							<circle cx="18" cy="18" r="1.7" />
						</svg>
						<span class="label">{{ $t('mirror.apps') }}</span>
					</button>
				</div>
			</aside>
		</main>
	</div>
</template>

<script>
import {
	BitmapVideoFrameRenderer,
	WebCodecsVideoDecoder,
	WebGLVideoFrameRenderer
} from '@yume-chan/scrcpy-decoder-webcodecs'
import { KeyCode, MotionAction, isTypingKey, keyCodeFor } from './keys'

const BEZEL = 10

const params = new URLSearchParams(location.search)

const MENU_ITEMS = [
	{ key: 'notifications', action: 'notifications', hint: '⌘N' },
	{ key: 'wake', action: 'wake', hint: '⇧⌘P' },
	{ key: 'power', action: 'nav', payload: { key: 'power' }, hint: '⌘P' },
	{ key: 'volumeUp', action: 'nav', payload: { key: 'volumeUp' }, hint: '⌘↑' },
	{ key: 'volumeDown', action: 'nav', payload: { key: 'volumeDown' }, hint: '⌘↓' },
	{ key: 'menuKey', action: 'nav', payload: { key: 'menu' }, hint: '⌘M' },
	{ key: 'playPause', action: 'mediaPlayPause', hint: 'Space' },
	{ key: 'rotate', action: 'rotate', hint: '⌘R' }
]

export default {
	name: 'MirrorApp',
	data() {
		return {
			serial: params.get('id') || '',
			name: params.get('name') || params.get('id') || '',
			size: { width: 9, height: 19.5 },
			status: this.$t('mirror.connecting'),
			failed: false,
			battery: null,
			screenOff: false,
			clipboardStatus: '',
			menuOpen: false,
			slotSize: { width: 0, height: 0 }
		}
	},
	computed: {
		// kept out of `data` so the payloads stay plain objects: a reactive proxy
		// cannot cross the IPC boundary (structured clone rejects it)
		menuItems() {
			return MENU_ITEMS
		},
		headerTitle() {
			return this.battery === null ? this.name : `${this.name} (${this.battery}%)`
		},
		// the bezel has to hug the video, so the box is measured rather than aspect-ratio'd
		phoneStyle() {
			const available = {
				width: Math.max(this.slotSize.width - BEZEL * 2, 0),
				height: Math.max(this.slotSize.height - BEZEL * 2, 0)
			}
			const scale = Math.min(
				available.width / this.size.width,
				available.height / this.size.height
			)
			if (!Number.isFinite(scale) || scale <= 0) return { width: '0px', height: '0px' }
			return {
				width: `${Math.floor(this.size.width * scale)}px`,
				height: `${Math.floor(this.size.height * scale)}px`
			}
		}
	},
	created() {
		document.title = this.name
		this.decoder = null
		this.writer = null
		this.pending = []
		this.queue = Promise.resolve()
		this.pointerDown = false
		this.batteryTimer = null
		this.clipboardTimer = null
		this.videoOrientation = null

		this.offAction = window.api.mirror.onAction(({ action, payload }) =>
			action === 'screenOffToggle' ? this.toggleScreen() : this.control(action, payload)
		)
		this.offReady = window.api.mirror.onReady(this.onReady)
		this.offPacket = window.api.mirror.onPacket(this.onPacket)
		this.offClosed = window.api.mirror.onClosed(({ reason }) => {
			this.status = this.$t('mirror.disconnected', { reason })
			this.failed = true
		})
	},
	mounted() {
		window.addEventListener('keydown', this.onKeyDown)
		this.observer = new ResizeObserver(([entry]) => {
			const { width, height } = entry.contentRect
			this.slotSize = { width, height }
		})
		this.observer.observe(this.$refs.slot)
		this.connect()
	},
	unmounted() {
		window.removeEventListener('keydown', this.onKeyDown)
		this.observer?.disconnect()
		clearInterval(this.batteryTimer)
		clearTimeout(this.clipboardTimer)
		this.offAction?.()
		this.offReady?.()
		this.offPacket?.()
		this.offClosed?.()
		this.teardownDecoder()
	},
	methods: {
		async connect() {
			this.failed = false
			this.status = this.$t('mirror.connecting')
			const result = await window.api.mirror.start({ serial: this.serial })
			if (!result.ok) {
				this.status = this.$t('mirror.failed', { message: result.message })
				this.failed = true
			}
		},
		onReady({ codec, width, height }) {
			this.teardownDecoder()
			if (width && height) {
				this.size = { width, height }
				this.fitWindow(width, height)
			}

			const canvas = this.$refs.canvas
			const renderer = WebGLVideoFrameRenderer.isSupported
				? new WebGLVideoFrameRenderer(canvas)
				: new BitmapVideoFrameRenderer(canvas)

			this.decoder = new WebCodecsVideoDecoder({ codec, renderer })
			this.decoder.sizeChanged(({ width: w, height: h }) => {
				this.size = { width: w, height: h }
				this.fitWindow(w, h)
			})
			this.writer = this.decoder.writable.getWriter()

			this.status = ''
			this.pending.splice(0).forEach(this.write)
			this.pollBattery()
			this.batteryTimer = setInterval(this.pollBattery, 60000)
		},
		onPacket(packet) {
			if (!this.writer) {
				this.pending.push(packet)
				return
			}
			this.write(packet)
		},
		write(packet) {
			// keep decode order without blocking the IPC listener
			this.queue = this.queue.then(() => this.writer?.write(packet)).catch(() => {})
		},
		teardownDecoder() {
			try {
				this.writer?.releaseLock()
				this.decoder?.dispose()
			} catch {
				// already gone
			}
			this.writer = null
			this.decoder = null
		},
		async control(action, payload = {}) {
			try {
				const result = await window.api.mirror.control(action, payload)
				if (!result?.ok) console.error(`[mirror] ${action}:`, result?.message)
				return result
			} catch (error) {
				console.error(`[mirror] ${action}:`, error)
				return { ok: false }
			}
		},
		fitWindow(width, height) {
			if (width === height) return
			const orientation = width > height ? 'landscape' : 'portrait'
			if (orientation === this.videoOrientation) return
			this.videoOrientation = orientation
			window.api.mirror.fitWindow({ width, height })
		},
		devicePoint(event) {
			const rect = this.$refs.canvas.getBoundingClientRect()
			const scaleX = this.size.width / rect.width
			const scaleY = this.size.height / rect.height
			return {
				x: Math.min(Math.max((event.clientX - rect.left) * scaleX, 0), this.size.width - 1),
				y: Math.min(Math.max((event.clientY - rect.top) * scaleY, 0), this.size.height - 1)
			}
		},
		sendTouch(action, event) {
			const { x, y } = this.devicePoint(event)
			this.control('touch', {
				action,
				x,
				y,
				width: this.size.width,
				height: this.size.height,
				pressure: action === MotionAction.Up ? 0 : 1,
				buttons: action === MotionAction.Up ? 0 : 1
			})
		},
		onPointerDown(event) {
			if (!this.decoder) return
			this.pointerDown = true
			this.$refs.canvas.setPointerCapture(event.pointerId)
			this.sendTouch(MotionAction.Down, event)
		},
		onPointerMove(event) {
			if (!this.pointerDown) return
			// coalesce to one move per frame, a drag otherwise floods the control stream
			this.lastMove = event
			if (this.moveScheduled) return
			this.moveScheduled = true
			requestAnimationFrame(() => {
				this.moveScheduled = false
				if (this.pointerDown && this.lastMove) this.sendTouch(MotionAction.Move, this.lastMove)
			})
		},
		onPointerUp(event) {
			if (!this.pointerDown) return
			this.pointerDown = false
			this.sendTouch(MotionAction.Up, event)
		},
		onWheel(event) {
			if (!this.decoder) return
			const { x, y } = this.devicePoint(event)
			this.control('scroll', {
				x,
				y,
				width: this.size.width,
				height: this.size.height,
				scrollX: Math.max(-1, Math.min(1, -event.deltaX / 100)),
				scrollY: Math.max(-1, Math.min(1, -event.deltaY / 100))
			})
		},
		nav(key) {
			this.menuOpen = false
			return this.control('nav', { key })
		},
		// launchers without an app-drawer key are driven by a swipe, which needs the
		// current video size
		openAppDrawer() {
			return this.control('appDrawer', {
				width: this.size.width,
				height: this.size.height
			})
		},
		async toggleScreen() {
			this.screenOff = !this.screenOff
			await this.control('screenOff', { off: this.screenOff })
		},
		async syncClipboard(action) {
			const result = await this.control(action)
			if (!result?.ok) return

			this.clipboardStatus = action
			clearTimeout(this.clipboardTimer)
			this.clipboardTimer = setTimeout(() => {
				this.clipboardStatus = ''
			}, 600)
		},
		runMenu(item) {
			this.menuOpen = false
			this.control(item.action, item.payload ?? {})
		},
		async pollBattery() {
			const result = await this.control('battery', {})
			if (result?.ok) this.battery = result.level
		},
		// chords belong to the Device menu; Space controls media, other plain keys type
		onKeyDown(event) {
			if (!this.decoder || event.metaKey || event.ctrlKey) return

			const keyCode = keyCodeFor(event)
			if (keyCode !== null) {
				event.preventDefault()
				if (keyCode === KeyCode.MediaPlayPause) {
					if (!event.repeat) this.control('mediaPlayPause')
					return
				}
				return void this.control('key', { keyCode })
			}

			if (isTypingKey(event)) {
				event.preventDefault()
				return void this.control('text', { text: event.key })
			}
		}
	}
}
</script>
