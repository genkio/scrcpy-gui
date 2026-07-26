import { app, BrowserWindow, ipcMain, Menu, screen, shell } from 'electron'
import { join } from 'node:path'
import { version } from '../../package.json'
import { resolveLocale } from '@shared/lang'
import { connect, disconnect, stopWatchingDevices, watchDevices } from './adb'
import { applyMenus, destroyTray, mirrorMenu } from './menu'
import { MirrorSession, NAV_KEYS } from './mirror'
import { ensurePath, icon } from './paths'
import { open as openScrcpy } from './scrcpy'

ensurePath()
app.setName('Scrcpy GUI')

let mainWindow = null
let locale = resolveLocale(app.getLocale())
let hideOnClose = false
let quitting = false

const send = (channel, payload) => {
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send(channel, payload)
	}
}

const showWindow = () => {
	if (!mainWindow) createWindow()
	else {
		mainWindow.show()
		mainWindow.focus()
	}
}

const hideWindow = () => mainWindow?.hide()

const setLocale = next => {
	if (next === locale) return
	locale = next
	refreshMenus()
	send('locale', locale)
}

const refreshMenus = () => applyMenus({ locale, onSelectLocale: setLocale, showWindow, hideWindow })

const createWindow = () => {
	mainWindow = new BrowserWindow({
		width: 513,
		height: 800,
		minWidth: 460,
		minHeight: 560,
		title: 'Scrcpy',
		center: true,
		show: false,
		fullscreenable: false,
		autoHideMenuBar: true,
		icon: icon('256x256.png'),
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
		trafficLightPosition: { x: 12, y: 13 },
		webPreferences: {
			preload: join(__dirname, '../preload/index.js'),
			sandbox: false,
			backgroundThrottling: false
		}
	})

	mainWindow.once('ready-to-show', () => mainWindow.show())

	mainWindow.on('close', event => {
		if (hideOnClose && !quitting) {
			event.preventDefault()
			mainWindow.hide()
		}
	})

	mainWindow.on('closed', () => {
		mainWindow = null
	})

	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (/^https?:/.test(url)) shell.openExternal(url)
		return { action: 'deny' }
	})

	// restart on every load so a reloaded renderer gets the current device list
	mainWindow.webContents.on('did-finish-load', () => {
		stopWatchingDevices()
		watchDevices(send)
	})

	loadRenderer(mainWindow, 'index')
}

const loadRenderer = (window, entry, query = '') => {
	const devServer = process.env.ELECTRON_RENDERER_URL
	if (devServer) {
		window.loadURL(`${devServer}/${entry}.html${query}`)
	} else {
		window.loadFile(join(__dirname, `../renderer/${entry}.html`), {
			search: query.replace(/^\?/, '')
		})
	}
}

// renderer errors are invisible from the terminal otherwise
const forwardConsole = window => {
	if (app.isPackaged) return
	window.webContents.on('console-message', ({ level, message, lineNumber, sourceId }) => {
		if (level === 'error' || level === 'warning') {
			console.log(`[renderer:${level}] ${message} (${sourceId}:${lineNumber})`)
		}
	})
}

const mirrorSessions = new Map()

const fitMirrorWindow = (window, { width, height }) => {
	if (!window || window.isDestroyed() || window.isFullScreen()) return
	if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return

	const bounds = window.getBounds()
	const videoLandscape = width > height
	const windowLandscape = bounds.width > bounds.height
	if (videoLandscape === windowLandscape) return

	const workArea = screen.getDisplayMatching(bounds).workArea
	const targetWidth = Math.min(bounds.height, workArea.width)
	const targetHeight = Math.min(bounds.width, workArea.height)
	const x = Math.max(
		workArea.x,
		Math.min(
			Math.round(bounds.x + (bounds.width - targetWidth) / 2),
			workArea.x + workArea.width - targetWidth
		)
	)
	const y = Math.max(
		workArea.y,
		Math.min(
			Math.round(bounds.y + (bounds.height - targetHeight) / 2),
			workArea.y + workArea.height - targetHeight
		)
	)

	window.setBounds({ x, y, width: targetWidth, height: targetHeight }, true)
}

const createMirrorWindow = ({ id, name }) => {
	const window = new BrowserWindow({
		width: 480,
		height: 900,
		minWidth: 360,
		minHeight: 520,
		title: name || id,
		show: false,
		backgroundColor: '#d4d4d4',
		titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
		trafficLightPosition: { x: 14, y: 16 },
		webPreferences: {
			preload: join(__dirname, '../preload/index.js'),
			sandbox: false,
			backgroundThrottling: false
		}
	})

	window.once('ready-to-show', () => window.show())
	forwardConsole(window)

	const deviceMenu = mirrorMenu(locale, window)
	window.on('focus', () => Menu.setApplicationMenu(deviceMenu))
	window.on('blur', () => refreshMenus())

	window.on('closed', async () => {
		const session = mirrorSessions.get(window.webContents.id)
		mirrorSessions.delete(window.webContents.id)
		await session?.stop()
	})

	loadRenderer(window, 'mirror', `?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name || id)}`)
}

app.whenReady().then(() => {
	app.setAppUserModelId('com.genkio.scrcpygui')
	app.setAboutPanelOptions({
		applicationName: 'Scrcpy GUI',
		applicationVersion: version,
		version: `Electron ${process.versions.electron}`,
		website: 'https://github.com/genkio/scrcpy-gui'
	})
	// unpackaged runs otherwise show the stock Electron dock icon
	if (process.platform === 'darwin' && !app.isPackaged) app.dock?.setIcon(icon('256x256.png'))

	createWindow()
	refreshMenus()

	app.on('activate', showWindow)
})

app.on('before-quit', () => {
	quitting = true
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
	stopWatchingDevices()
	destroyTray()
})

ipcMain.on('scrcpy:open', (_event, payload) => openScrcpy(send, payload))
ipcMain.handle('adb:connect', (_event, payload) => connect(payload))
ipcMain.handle('adb:disconnect', (_event, ip) => disconnect(ip))

ipcMain.on('settings:sync', (_event, settings) => {
	hideOnClose = Boolean(settings.hideOnClose)
	if (settings.locale) setLocale(settings.locale)
})

ipcMain.on('shell:open-external', (_event, url) => {
	if (/^https?:/.test(url)) shell.openExternal(url)
})

ipcMain.on('mirror:open', (_event, device) => createMirrorWindow(device))
ipcMain.on('mirror:fit-window', (event, size) => {
	fitMirrorWindow(BrowserWindow.fromWebContents(event.sender), size)
})

ipcMain.handle('mirror:start', async (event, { serial, ...options }) => {
	const key = event.sender.id
	await mirrorSessions.get(key)?.stop()

	const session = new MirrorSession(serial, (channel, payload) => {
		if (!event.sender.isDestroyed()) event.sender.send(channel, payload)
	})
	mirrorSessions.set(key, session)

	try {
		return { ok: true, ...(await session.start(options)) }
	} catch (error) {
		mirrorSessions.delete(key)
		await session.stop()
		return { ok: false, message: error?.message ?? String(error) }
	}
})

ipcMain.handle('mirror:control', async (event, { action, payload }) => {
	const session = mirrorSessions.get(event.sender.id)
	if (!session) return { ok: false, message: 'no active mirror' }

	try {
		switch (action) {
			case 'touch':
				await session.touch(payload)
				break
			case 'scroll':
				await session.scroll(payload)
				break
			case 'key':
				await session.key(payload)
				break
			case 'nav':
				await session.key({ keyCode: NAV_KEYS[payload.key] })
				break
			case 'text':
				await session.text(payload.text)
				break
			case 'screenOff':
				await session.setScreenOff(payload.off)
				break
			case 'paste':
				await session.paste()
				break
			case 'notifications':
				await session.expandNotifications()
				break
			case 'rotate':
				await session.rotate()
				break
			case 'mediaPlayPause':
				await session.mediaPlayPause()
				break
			case 'appDrawer':
				await session.openAppDrawer()
				break
			case 'battery':
				return { ok: true, level: await session.battery() }
			default:
				return { ok: false, message: `unknown action ${action}` }
		}
		return { ok: true }
	} catch (error) {
		console.error(`[mirror] ${action} failed:`, error)
		return { ok: false, message: error?.message ?? String(error) }
	}
})
