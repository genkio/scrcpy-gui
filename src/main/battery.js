import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'
import { PAUSE_FROM, RESUME_BELOW } from '@shared/battery'

const run = promisify(execFile)

const POLL_INTERVAL = 10 * 60 * 1000
const FALLBACK_PORT = 'port0'

const watchers = new Map()

const adb = (serial, args) => run('adb', ['-s', serial, ...args])

// sourcing power is the only way to refuse a charge over USB-C; there is no "neither" role
const roleArgs = (portId, charging) => [
	'shell',
	'dumpsys',
	'usb',
	'set-port-roles',
	portId,
	charging ? 'sink' : 'source',
	'device'
]

const readLevel = async serial => {
	const { stdout } = await adb(serial, ['shell', 'dumpsys', 'battery'])
	const match = /^\s*level:\s*(\d+)/m.exec(stdout)
	return match ? Number(match[1]) : null
}

const readPort = async serial => {
	const { stdout } = await adb(serial, ['shell', 'dumpsys', 'usb'])
	// role_combinations repeats power_role for every supported pair, so only status= holds the live one
	const status = stdout.slice(stdout.indexOf('status={'))
	const role = /power_role=(\w+)/.exec(status)
	const id = /\bid=(port\d+)/.exec(stdout)
	return {
		portId: id ? id[1] : FALLBACK_PORT,
		charging: role ? role[1] === 'sink' : null
	}
}

const stale = (serial, watcher) => watchers.get(serial) !== watcher

const tick = async (serial, notify) => {
	const watcher = watchers.get(serial)
	if (!watcher) return

	const level = await readLevel(serial)
	if (level === null || stale(serial, watcher)) return
	watcher.level = level

	// between the thresholds the last decision stands, which is what makes it a band and not a flap
	const target = level >= PAUSE_FROM ? false : level < RESUME_BELOW ? true : watcher.charging

	if (target !== null) {
		// reapplied every tick so a role changed behind our back heals itself
		await adb(serial, roleArgs(watcher.portId, target))
		watcher.charging = target
	}

	if (stale(serial, watcher)) return
	notify({ serial, level: watcher.level, charging: watcher.charging })
}

const runTick = (serial, notify) => {
	const watcher = watchers.get(serial)
	if (!watcher) return Promise.resolve()

	watcher.pending = tick(serial, notify).catch(error => console.error('[battery] tick failed:', error))
	return watcher.pending
}

export const startBatteryCare = async (serial, notify) => {
	await stopBatteryCare(serial)

	const { portId, charging } = await readPort(serial)
	watchers.set(serial, { portId, charging, level: null, timer: null, pending: null })

	await runTick(serial, notify)

	const watcher = watchers.get(serial)
	watcher.timer = setInterval(() => runTick(serial, notify), POLL_INTERVAL)

	return { level: watcher.level, charging: watcher.charging }
}

export const stopBatteryCare = async serial => {
	const watcher = watchers.get(serial)
	if (!watcher) return

	clearInterval(watcher.timer)
	watchers.delete(serial)

	// a tick already writing `source` would otherwise land after the restore and strand the phone
	await watcher.pending

	// a phone left sourcing power never charges again, so this must happen even if the app is going away
	try {
		await adb(serial, roleArgs(watcher.portId, true))
	} catch (error) {
		console.error('[battery] failed to restore charging:', error)
	}
}

export const pruneBatteryCare = activeSerials => {
	for (const [serial, watcher] of [...watchers]) {
		// an unplugged phone renegotiates its role on reconnect, so there is nothing left to restore
		if (!activeSerials.includes(serial)) {
			clearInterval(watcher.timer)
			watchers.delete(serial)
		}
	}
}

export const batteryCareStates = () =>
	[...watchers].map(([serial, { level, charging }]) => ({ serial, level, charging }))

// will-quit cannot await, and losing the restore is the one failure that strands a phone
export const restoreChargingSync = () => {
	for (const [serial, watcher] of watchers) {
		clearInterval(watcher.timer)
		try {
			execFileSync('adb', ['-s', serial, ...roleArgs(watcher.portId, true)], { timeout: 3000 })
		} catch {
			// quitting regardless; replugging the cable also restores the sink role
		}
	}
	watchers.clear()
}
