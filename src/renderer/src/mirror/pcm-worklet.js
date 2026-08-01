// interleaved f32 ring buffer; underruns emit silence, and a full buffer drops the
// oldest frames so latency can never build past the capacity (~170ms at 48kHz)
const CAPACITY_FRAMES = 8192

class PcmPlayerProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super()
		this.channels = options.outputChannelCount?.[0] ?? 2
		this.capacity = CAPACITY_FRAMES * this.channels
		this.samples = new Float32Array(this.capacity)
		this.start = 0
		this.length = 0
		this.port.onmessage = ({ data }) => this.enqueue(data)
	}

	enqueue(chunk) {
		if (chunk.length > this.capacity) chunk = chunk.subarray(chunk.length - this.capacity)

		const overflow = this.length + chunk.length - this.capacity
		if (overflow > 0) {
			this.start = (this.start + overflow) % this.capacity
			this.length -= overflow
		}

		const end = (this.start + this.length) % this.capacity
		const tailRoom = this.capacity - end
		if (chunk.length <= tailRoom) {
			this.samples.set(chunk, end)
		} else {
			this.samples.set(chunk.subarray(0, tailRoom), end)
			this.samples.set(chunk.subarray(tailRoom), 0)
		}
		this.length += chunk.length
	}

	process(_inputs, outputs) {
		const output = outputs[0]
		for (let frame = 0; frame < output[0].length; frame += 1) {
			for (let channel = 0; channel < output.length; channel += 1) {
				if (this.length > 0) {
					output[channel][frame] = this.samples[this.start]
					this.start = (this.start + 1) % this.capacity
					this.length -= 1
				} else {
					output[channel][frame] = 0
				}
			}
		}
		return true
	}
}

registerProcessor('pcm-player', PcmPlayerProcessor)
