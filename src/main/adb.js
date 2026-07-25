import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const POLL_INTERVAL = 2000
const DEFAULT_PORT = 5555

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const withPort = ip => (ip.includes(':') ? ip : `${ip}:${DEFAULT_PORT}`)

export const listDevices = async () => {
	const { stdout } = await run('adb', ['devices'])
	return stdout
		.split('\n')
		.slice(1)
		.map(line => line.trim().split(/\s+/))
		.filter(([id, state]) => id && state === 'device')
		.map(([id]) => ({ id }))
}

let timer = null

export const watchDevices = send => {
	let lastSignature = null
	let reportedFailure = false

	const tick = async () => {
		try {
			const devices = await listDevices()
			reportedFailure = false
			const signature = devices.map(({ id }) => id).sort().join(',')
			if (signature !== lastSignature) {
				lastSignature = signature
				send('devices', devices)
			}
		} catch (err) {
			if (!reportedFailure) {
				reportedFailure = true
				send('error', { type: 'adbNotFound', detail: err.message })
			}
		}
	}

	tick()
	timer = setInterval(tick, POLL_INTERVAL)
}

export const stopWatchingDevices = () => {
	clearInterval(timer)
	timer = null
}

export const connect = async ({ id, ip }) => {
	const target = withPort(ip)

	// A USB-attached device has to be flipped into tcpip mode before it listens
	if (id) {
		try {
			await run('adb', ['-s', id, 'tcpip', String(DEFAULT_PORT)])
			await delay(1000)
		} catch {
			// device may already be listening, or be a wireless device itself
		}
	}

	try {
		const { stdout } = await run('adb', ['connect', target])
		const message = stdout.trim()
		return { success: /connected to/i.test(message), message }
	} catch (err) {
		return { success: false, message: err.message }
	}
}

export const disconnect = async ip => {
	try {
		const { stdout } = await run('adb', ['disconnect', withPort(ip)])
		return { success: true, message: stdout.trim() }
	} catch (err) {
		return { success: false, message: err.message }
	}
}
