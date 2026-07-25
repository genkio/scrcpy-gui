import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { version } from '../../package.json'
import { resolveLocale } from '@shared/lang'
import { connect, disconnect, stopWatchingDevices, watchDevices } from './adb'
import { applyMenus, destroyTray } from './menu'
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

	const devServer = process.env.ELECTRON_RENDERER_URL
	if (devServer) {
		mainWindow.loadURL(devServer)
	} else {
		mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
	}
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
