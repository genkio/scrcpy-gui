import { execFile, spawn } from 'node:child_process'
import { createReadStream, createWriteStream } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { basename, posix } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { promisify } from 'node:util'

const run = promisify(execFile)

const POLL_INTERVAL = 2000
const DEFAULT_PORT = 5555
const OWNER_USER_ID = 0
const DOCUMENTS_AUTHORITY = 'com.android.externalstorage.documents'
const DIRECTORY_MIME_TYPE = 'vnd.android.document/directory'
const MEDIA_FILES_URI = 'content://media/external/file'

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

const withPort = ip => (ip.includes(':') ? ip : `${ip}:${DEFAULT_PORT}`)

export const quoteShell = value => `'${value.replaceAll('\'', `'\"'\"'`)}'`

const normalizeUserId = userId => {
	const normalized = Number(userId)
	if (!Number.isSafeInteger(normalized) || normalized < 0) {
		throw new Error('Invalid Android profile')
	}
	return normalized
}

const storageRoot = userId => `/storage/emulated/${normalizeUserId(userId)}`

const normalizeStoragePath = (path, userId) => {
	const root = storageRoot(userId)
	const normalized = posix.normalize(path || root)
	if (normalized !== root && !normalized.startsWith(`${root}/`)) {
		throw new Error('Storage path must stay inside shared storage')
	}
	return normalized
}

const storageDocumentId = (path, userId) => {
	const root = storageRoot(userId)
	const relative = normalizeStoragePath(path, userId).slice(root.length).replace(/^\//, '')
	return relative ? `primary:${relative}` : 'primary:'
}

const encodeDocumentId = value =>
	encodeURIComponent(value).replace(
		/[!'()*]/g,
		character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
	)

const documentUri = (path, userId, children = false) => {
	const id = encodeDocumentId(storageDocumentId(path, userId))
	const suffix = children ? '/children' : ''
	return `content://${DOCUMENTS_AUTHORITY}/document/${id}${suffix}`
}

const profileUnavailable = detail => {
	const error = new Error(detail)
	error.code = 'PROFILE_UNAVAILABLE'
	return error
}

const ensureContentResult = ({ stdout, stderr }) => {
	const output = `${stdout}${stderr}`.trim()
	if (
		/Error while accessing provider|Could not find provider|SecurityException|FileNotFoundException/.test(output)
	) {
		throw profileUnavailable(output)
	}
	if (/\[ERROR\]|Exception occurred while executing/.test(output)) throw new Error(output)
	return stdout
}

export const runContent = async (serial, args, options = {}) => {
	const result = await run('adb', ['-s', serial, 'shell', 'content', ...args], options)
	return ensureContentResult(result)
}

const streamContent = async ({ serial, args, inputPath, outputPath }) => {
	const transport = inputPath ? 'shell' : 'exec-out'
	const child = spawn('adb', ['-s', serial, transport, 'content', ...args], {
		stdio: ['pipe', 'pipe', 'pipe']
	})
	let stderr = ''
	let stdout = ''
	child.stderr.setEncoding('utf8')
	child.stderr.on('data', chunk => {
		stderr += chunk
	})
	if (inputPath) {
		child.stdout.setEncoding('utf8')
		child.stdout.on('data', chunk => {
			stdout += chunk
		})
	}

	const exit = new Promise((resolve, reject) => {
		child.once('error', reject)
		child.once('close', code => resolve(code))
	})
	const transfer = inputPath
		? pipeline(createReadStream(inputPath), child.stdin)
		: pipeline(child.stdout, createWriteStream(outputPath))

	let code
	try {
		const results = await Promise.all([exit, transfer])
		code = results[0]
	} catch (error) {
		child.kill()
		if (outputPath) await unlink(outputPath).catch(() => {})
		throw error
	}
	const output = `${stdout}${stderr}`
	if (
		code !== 0 ||
		/Error while accessing provider|Could not find provider|SecurityException|FileNotFoundException/.test(
			output
		)
	) {
		if (outputPath) await unlink(outputPath).catch(() => {})
		if (/Could not find provider|SecurityException|FileNotFoundException/.test(output)) {
			throw profileUnavailable(output.trim())
		}
		throw new Error(output.trim() || `ADB transfer failed with exit code ${code}`)
	}
}

const parseDocumentRows = output => {
	if (output.trim() === 'No result found.') return []

	const rows = []
	const pattern =
		/^Row: \d+ document_id=([\s\S]*?), mime_type=([^\r\n,]+), last_modified=(\d+|NULL), _size=(\d+|NULL)(?=\r?\nRow: \d+ |\r?\n?$)/gm
	let match
	while ((match = pattern.exec(output))) {
		const [, documentId, mimeType, modified, size] = match
		rows.push({
			documentId,
			directory: mimeType === DIRECTORY_MIME_TYPE,
			modified: Number(modified) || 0,
			size: Number(size) || 0
		})
	}

	if (rows.length === 0 && output.trim()) throw new Error('Could not read the folder listing')
	return rows
}

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

export const listStorageProfiles = async serial => {
	if (!serial) throw new Error('No device selected')

	const [{ stdout: usersOutput }, { stdout: currentOutput }] = await Promise.all([
		run('adb', ['-s', serial, 'shell', 'pm', 'list', 'users']),
		run('adb', ['-s', serial, 'shell', 'am', 'get-current-user'])
	])
	const currentUserId = Number(currentOutput.trim())
	const profiles = usersOutput
		.split('\n')
		.map(line => {
			const match = line.match(/UserInfo\{(\d+):(.*):([0-9a-f]+)\}(.*)$/i)
			if (!match) return null
			const [, id, name, , state] = match
			const userId = Number(id)
			return {
				id: userId,
				name: name || `Profile ${userId}`,
				root: storageRoot(userId),
				current: userId === currentUserId,
				running: /\brunning\b/.test(state)
			}
		})
		.filter(Boolean)

	if (profiles.length === 0) throw new Error('Could not read Android profiles')
	return { profiles }
}

const listOwnerStorage = async (serial, directory) => {
	const script = `
		path=${quoteShell(directory)}
		if [ ! -d "$path" ]; then
			echo "Folder not found" >&2
			exit 2
		fi
		for entry in "$path"/* "$path"/.[!.]* "$path"/..?*; do
			[ -e "$entry" ] || continue
			if [ -d "$entry" ]; then
				kind=d
				size=0
			else
				kind=f
				size=$(stat -c %s "$entry" 2>/dev/null || printf 0)
			fi
			modified=$(stat -c %Y "$entry" 2>/dev/null || printf 0)
			name=\${entry##*/}
			printf '%s\\0%s\\0%s\\0%s\\0' "$kind" "$name" "$size" "$modified"
		done
	`
	const { stdout } = await run(
		'adb',
		['-s', serial, 'exec-out', script],
		{ encoding: 'buffer', maxBuffer: 20 * 1024 * 1024 }
	)
	const fields = stdout.toString('utf8').split('\0')
	if (fields.at(-1) === '') fields.pop()
	if (fields.length % 4 !== 0) throw new Error('Could not read the folder listing')

	const entries = []
	for (let index = 0; index < fields.length; index += 4) {
		const [kind, name, size, modified] = fields.slice(index, index + 4)
		entries.push({
			name,
			path: posix.join(directory, name),
			directory: kind === 'd',
			size: Number(size) || 0,
			modified: Number(modified) || 0
		})
	}

	entries.sort((left, right) => {
		if (left.directory !== right.directory) return left.directory ? -1 : 1
		return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
	})

	return { path: directory, entries }
}

const listProfileStorage = async (serial, userId, directory) => {
	const output = await runContent(serial, [
		'query',
		'--user',
		String(userId),
		'--uri',
		documentUri(directory, userId, true),
		'--projection',
		'document_id:mime_type:last_modified:_size'
	])
	const parentId = storageDocumentId(directory, userId)
	const prefix = parentId.endsWith(':') ? parentId : `${parentId}/`
	const entries = parseDocumentRows(output).map(row => {
		if (!row.documentId.startsWith(prefix)) throw new Error('Invalid folder listing')
		const name = row.documentId.slice(prefix.length)
		if (!name || name.includes('/')) throw new Error('Invalid folder listing')
		return {
			name,
			path: posix.join(directory, name),
			directory: row.directory,
			size: row.size,
			modified: Math.floor(row.modified / 1000)
		}
	})

	entries.sort((left, right) => {
		if (left.directory !== right.directory) return left.directory ? -1 : 1
		return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
	})
	return { path: directory, entries }
}

export const listStorage = async (serial, userId, path) => {
	if (!serial) throw new Error('No device selected')
	const profileId = normalizeUserId(userId)
	const directory = normalizeStoragePath(path, profileId)
	return profileId === OWNER_USER_ID
		? listOwnerStorage(serial, directory)
		: listProfileStorage(serial, profileId, directory)
}

export const downloadStorageFile = async (serial, userId, remotePath, localPath) => {
	if (!serial) throw new Error('No device selected')
	const profileId = normalizeUserId(userId)
	const source = normalizeStoragePath(remotePath, profileId)
	if (profileId === OWNER_USER_ID) {
		await run('adb', ['-s', serial, 'pull', source, localPath], { maxBuffer: 5 * 1024 * 1024 })
		return
	}

	const sourceUri = documentUri(source, profileId)
	const result = await runContent(serial, [
		'query',
		'--user',
		String(profileId),
		'--uri',
		sourceUri,
		'--projection',
		'document_id'
	])
	if (result.trim() === 'No result found.') throw new Error('File not found')
	await streamContent({
		serial,
		args: ['read', '--user', String(profileId), '--uri', sourceUri],
		outputPath: localPath
	})
}

const insertProfileFile = async (serial, userId, directory, name) => {
	const relative = directory.slice(storageRoot(userId).length).replace(/^\//, '')
	const relativePath = relative ? `${relative}/` : '/'
	await runContent(serial, [
		'insert',
		'--user',
		String(userId),
		'--uri',
		MEDIA_FILES_URI,
		'--bind',
		quoteShell(`_display_name:s:${name}`),
		'--bind',
		'mime_type:s:application/octet-stream',
		'--bind',
		quoteShell(`relative_path:s:${relativePath}`)
	])

	const escapedName = name.replaceAll('\'', '\'\'')
	const escapedPath = relativePath.replaceAll('\'', '\'\'')
	const selection = `_display_name='${escapedName}' AND relative_path='${escapedPath}'`
	const output = await runContent(serial, [
		'query',
		'--user',
		String(userId),
		'--uri',
		MEDIA_FILES_URI,
		'--projection',
		'_id',
		'--where',
		quoteShell(selection),
		'--sort',
		quoteShell('_id DESC')
	])
	const id = output.match(/^Row: 0 _id=(\d+)$/m)?.[1]
	if (!id) throw new Error('Could not create the file on the phone')
	return `${MEDIA_FILES_URI}/${id}`
}

export const uploadStorageFiles = async (
	serial,
	userId,
	remoteDirectory,
	localPaths,
	existingNames = []
) => {
	if (!serial) throw new Error('No device selected')
	const profileId = normalizeUserId(userId)
	const directory = normalizeStoragePath(remoteDirectory, profileId)

	for (const localPath of localPaths) {
		const name = basename(localPath)
		const target = posix.join(directory, name)
		if (profileId === OWNER_USER_ID) {
			await run('adb', ['-s', serial, 'push', localPath, target], {
				maxBuffer: 5 * 1024 * 1024
			})
			continue
		}

		const createdUri = existingNames.includes(name)
			? ''
			: await insertProfileFile(serial, profileId, directory, name)
		try {
			await streamContent({
				serial,
				args: [
					'write',
					'--user',
					String(profileId),
					'--uri',
					createdUri || documentUri(target, profileId)
				],
				inputPath: localPath
			})
		} catch (error) {
			if (createdUri) {
				await runContent(serial, [
					'delete',
					'--user',
					String(profileId),
					'--uri',
					createdUri
				]).catch(() => {})
			}
			throw error
		}
	}
}
