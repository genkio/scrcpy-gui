import { app } from 'electron'
import { join } from 'node:path'
import { homedir } from 'node:os'

const EXTRA_PATHS = {
	darwin: [
		'/opt/homebrew/bin',
		'/usr/local/bin',
		'/opt/local/bin',
		join(homedir(), '.local/bin'),
		join(homedir(), 'Library/Android/sdk/platform-tools')
	],
	linux: ['/usr/local/bin', '/snap/bin', join(homedir(), '.local/bin')],
	win32: []
}

// A GUI process launched from Finder/Dock inherits a bare PATH, so `adb` and
// `scrcpy` installed by homebrew are invisible unless we add them back.
export const ensurePath = () => {
	const separator = process.platform === 'win32' ? ';' : ':'
	const current = (process.env.PATH || '').split(separator).filter(Boolean)
	const missing = (EXTRA_PATHS[process.platform] || []).filter(dir => !current.includes(dir))
	if (missing.length) {
		process.env.PATH = [...current, ...missing].join(separator)
	}
}

export const resourcesPath = () =>
	app.isPackaged ? process.resourcesPath : join(__dirname, '../../resources')

export const icon = name => join(resourcesPath(), 'icons', name)
