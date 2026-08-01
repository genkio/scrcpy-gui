import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

const HELP_TIMEOUT = 5000
// cc-imessage's AppleScript send has a hardcoded 30s timeout, and the first ever send can spend
// most of it waiting on the macOS Automation permission dialog
const SEND_TIMEOUT = 45000

// without Full Disk Access the send itself succeeds, but the post-send guid lookup on chat.db
// exits 1, so this stderr means delivered, just unverified
const FDA_HINT = /chat\.db|Full Disk Access/i

let queue = Promise.resolve()

// Messages.app automation is one shared resource across every device and the test flow
const enqueue = task => {
	const result = queue.then(task, task)
	queue = result.then(() => undefined, () => undefined)
	return result
}

export const detectCcImessage = async () => {
	try {
		await run('cc-imessage', ['--help'], { timeout: HELP_TIMEOUT })
		return true
	} catch {
		return false
	}
}

const confirmSent = stdout => {
	try {
		return JSON.parse(stdout.trim())?.sent === true
	} catch {
		return false
	}
}

const send = (address, text) => enqueue(async () => {
	try {
		const { stdout } = await run('cc-imessage', ['send', '--to', address, '--text', text], { timeout: SEND_TIMEOUT })
		return confirmSent(stdout)
			? { ok: true }
			: { ok: false, message: stdout.trim() || 'cc-imessage did not confirm the send' }
	} catch (error) {
		if (error.code === 'ENOENT') return { ok: false, message: 'cc-imessage is not installed' }
		if (error.killed) {
			return { ok: false, message: 'cc-imessage timed out; check the macOS Automation permission for Messages' }
		}
		if (FDA_HINT.test(error.stderr ?? '')) return { ok: true }
		return { ok: false, message: (error.stderr ?? '').trim() || error.message }
	}
})

export const sendTestMessage = address => send(address, 'scrcpy-gui test message')

export const sendForwardMessage = (address, text) => send(address, text)
