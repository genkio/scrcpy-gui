import { quoteShell, runContent } from './adb'
import { sendForwardMessage } from './imessage'

const POLL_INTERVAL = 10000
const INBOX_URI = 'content://sms/inbox'
// metadata only, a few dozen bytes a row, but inboxes can be years deep
const QUERY_OPTIONS = { maxBuffer: 4 * 1024 * 1024 }

const watchers = new Map()

// SMS lands in the Owner profile; raw adb cannot reach secondary-user providers anyway
const metadataArgs = ['query', '--user', '0', '--uri', INBOX_URI, '--projection', '_id:address:date']

// address is free-form (short codes, alphanumeric senders), so it is matched lazily up to the
// date field, which is projected only to give the match a fixed end anchor
const ROW_PATTERN = /^Row: \d+ _id=(\d+), address=(.*?), date=(?:\d+|NULL)$/gm

const parseRows = output =>
	[...output.matchAll(ROW_PATTERN)].map(match => ({ id: Number(match[1]), address: match[2] }))

const queryRows = serial => runContent(serial, metadataArgs, QUERY_OPTIONS).then(parseRows)

// body is the one sender-controlled field, so it is queried alone per id: everything after the
// prefix IS the body, and there is no field delimiter for a message to spoof
const queryBody = async (serial, id) => {
	const output = await runContent(serial, [
		'query', '--user', '0', '--uri', INBOX_URI, '--projection', 'body', '--where', quoteShell(`_id=${id}`)
	])
	const prefix = 'Row: 0 body='
	return output.startsWith(prefix) ? output.slice(prefix.length).replace(/\r?\n$/, '') : null
}

const maxIdOf = rows => rows.reduce((max, { id }) => Math.max(max, id), 0)

const stateOf = (serial, { forwarded, lastError }) => ({ serial, forwarded, lastError })

const stale = (serial, watcher) => watchers.get(serial) !== watcher

const forwardOne = async (serial, watcher, { id, address }) => {
	const body = await queryBody(serial, id)
	if (body === null) return `message ${id} disappeared before it could be read`

	const label = watcher.name ? `[${watcher.name}] ${address}` : address
	const { ok, message } = await sendForwardMessage(watcher.address, `${label}: ${body}`)
	return ok ? null : message
}

const tick = async (serial, notify) => {
	const watcher = watchers.get(serial)
	if (!watcher) return

	let rows
	try {
		rows = await queryRows(serial)
	} catch (error) {
		if (stale(serial, watcher)) return
		watcher.lastError = error?.message ?? String(error)
		notify(stateOf(serial, watcher))
		return
	}
	if (stale(serial, watcher)) return

	// the id sequence went backwards (restore, telephony data wipe): resync instead of replaying
	// the whole inbox as new
	const maxId = maxIdOf(rows)
	if (maxId < watcher.maxSeenId) watcher.maxSeenId = maxId

	const fresh = rows.filter(({ id }) => id > watcher.maxSeenId).sort((a, b) => a.id - b.id)
	for (const row of fresh) {
		if (stale(serial, watcher)) return
		try {
			watcher.lastError = await forwardOne(serial, watcher, row)
			if (!watcher.lastError) watcher.forwarded += 1
		} catch (error) {
			watcher.lastError = error?.message ?? String(error)
		}
		// advance regardless, or a permanently failing send would retry the same message forever
		watcher.maxSeenId = row.id
	}

	if (stale(serial, watcher)) return
	notify(stateOf(serial, watcher))
}

const runTick = (serial, notify) => {
	tick(serial, notify).catch(error => console.error('[forward] tick failed:', error))
}

export const startForwarding = async (serial, { address, name }, notify) => {
	stopForwarding(serial)

	// whatever is already in the inbox was seen on the phone, not missed
	const maxSeenId = maxIdOf(await queryRows(serial))
	const watcher = { address, name, maxSeenId, forwarded: 0, lastError: null, timer: null }
	watchers.set(serial, watcher)
	watcher.timer = setInterval(() => runTick(serial, notify), POLL_INTERVAL)

	return stateOf(serial, watcher)
}

export const stopForwarding = serial => {
	const watcher = watchers.get(serial)
	if (!watcher) return

	clearInterval(watcher.timer)
	watchers.delete(serial)
	// an in-flight tick no-ops through stale(); nothing on the phone needs restoring
}

export const pruneForwarding = activeSerials => {
	for (const serial of [...watchers.keys()]) {
		if (!activeSerials.includes(serial)) stopForwarding(serial)
	}
}

export const forwardStates = () => [...watchers].map(([serial, watcher]) => stateOf(serial, watcher))

// a freshly saved address should reach watchers that are already running
export const updateForwardAddress = address => {
	for (const watcher of watchers.values()) watcher.address = address
}

// will-quit cannot await; there is nothing to restore, only timers to stop
export const stopForwardingSync = () => {
	for (const { timer } of watchers.values()) clearInterval(timer)
	watchers.clear()
}
