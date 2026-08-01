import workletSource from './pcm-worklet.js?raw'

// a blob URL keeps the worklet inside the bundle and loads identically in dev and
// packaged builds, where an emitted asset's relative URL would be fragile; needs
// `blob:` in mirror.html's script-src
const workletUrl = URL.createObjectURL(new Blob([workletSource], { type: 'text/javascript' }))

// plays the raw PCM stream the mirror session forwards; scrcpy's raw audio codec is
// fixed at 48 kHz stereo s16le, so no decoder is involved
export class PcmPlayer {
	#context = null
	#node = null
	#gain = null

	async start({ sampleRate, channels }) {
		this.#context = new AudioContext({ sampleRate, latencyHint: 'interactive' })
		await this.#context.audioWorklet.addModule(workletUrl)
		this.#node = new AudioWorkletNode(this.#context, 'pcm-player', {
			numberOfInputs: 0,
			outputChannelCount: [channels]
		})
		this.#gain = this.#context.createGain()
		this.#node.connect(this.#gain)
		this.#gain.connect(this.#context.destination)
	}

	push(data) {
		if (!this.#node) return
		// structured clone keeps the view's offset, which is not guaranteed s16-aligned
		const bytes = data.byteOffset % 2 === 0 ? data : data.slice()
		const ints = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength >> 1)
		const floats = new Float32Array(ints.length)
		for (let index = 0; index < ints.length; index += 1) floats[index] = ints[index] / 32768
		this.#node.port.postMessage(floats, [floats.buffer])
	}

	setMuted(muted) {
		if (this.#gain) this.#gain.gain.value = muted ? 0 : 1
	}

	stop() {
		this.#node?.disconnect()
		this.#gain?.disconnect()
		this.#context?.close().catch(() => {})
		this.#context = null
		this.#node = null
		this.#gain = null
	}
}
