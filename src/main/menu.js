import { Menu, Tray, nativeImage, shell } from 'electron'
import { LOCALE_LABELS, translate } from '@shared/lang'
import { icon } from './paths'

const REPO = 'https://github.com/genkio/scrcpy-gui'

let tray = null

const helpItems = t => [
	{ label: t('titleBar.document'), click: () => shell.openExternal(REPO) },
	{ label: t('titleBar.checkForUpdates'), click: () => shell.openExternal(`${REPO}/releases`) },
	{ label: t('titleBar.feedback'), click: () => shell.openExternal(`${REPO}/issues`) }
]

const languageItems = (locale, onSelectLocale) =>
	Object.entries(LOCALE_LABELS).map(([value, label]) => ({
		label,
		type: 'radio',
		checked: value === locale,
		click: () => onSelectLocale(value)
	}))

const applicationMenu = (t, locale, onSelectLocale) => {
	const template = [
		{ role: 'editMenu' },
		{ role: 'viewMenu' },
		{ role: 'windowMenu' },
		{ label: t('titleBar.switchLanguage'), submenu: languageItems(locale, onSelectLocale) },
		{ role: 'help', submenu: helpItems(t) }
	]
	if (process.platform === 'darwin') template.unshift({ role: 'appMenu' })
	return Menu.buildFromTemplate(template)
}

const trayMenu = (t, locale, onSelectLocale, showWindow, hideWindow) =>
	Menu.buildFromTemplate([
		{ label: t('tray.show'), click: showWindow },
		{ label: t('tray.hide'), click: hideWindow },
		{ type: 'separator' },
		{ label: t('titleBar.switchLanguage'), submenu: languageItems(locale, onSelectLocale) },
		...helpItems(t),
		{ type: 'separator' },
		{ label: t('tray.exit'), role: 'quit' }
	])

const DEVICE_ITEMS = [
	{ key: 'back', accelerator: 'Escape', action: 'nav', payload: { key: 'back' } },
	{ key: 'home', accelerator: 'Shift+Cmd+H', action: 'nav', payload: { key: 'home' } },
	{ key: 'appSwitch', accelerator: 'Shift+Cmd+R', action: 'nav', payload: { key: 'appSwitch' } },
	{ type: 'separator' },
	{ key: 'notifications', accelerator: 'CmdOrCtrl+N', action: 'notifications' },
	{ key: 'screenOff', accelerator: 'CmdOrCtrl+O', action: 'screenOffToggle' },
	{ key: 'clipboard', accelerator: 'CmdOrCtrl+V', action: 'paste' },
	{ type: 'separator' },
	{ key: 'power', accelerator: 'CmdOrCtrl+P', action: 'nav', payload: { key: 'power' } },
	{ key: 'volumeUp', accelerator: 'CmdOrCtrl+Up', action: 'nav', payload: { key: 'volumeUp' } },
	{ key: 'volumeDown', accelerator: 'CmdOrCtrl+Down', action: 'nav', payload: { key: 'volumeDown' } },
	{ key: 'menuKey', accelerator: 'CmdOrCtrl+M', action: 'nav', payload: { key: 'menu' } },
	{ key: 'rotate', accelerator: 'CmdOrCtrl+R', action: 'rotate' }
]

// A mirror window gets its own menu: the stock view/window roles would otherwise
// eat Cmd+R, Shift+Cmd+R and Cmd+M before the device ever sees them.
export const mirrorMenu = (locale, window) => {
	const t = path => translate(locale, path)
	const template = [
		{
			label: t('mirror.device'),
			submenu: DEVICE_ITEMS.map(item =>
				item.type
					? item
					: {
							label: t(`mirror.${item.key}`),
							accelerator: item.accelerator,
							click: () =>
								window.webContents.send('mirror:action', {
									action: item.action,
									payload: item.payload ?? {}
								})
						}
			)
		},
		{
			label: t('mirror.view'),
			submenu: [
				{ role: 'resetZoom' },
				{ role: 'zoomIn' },
				{ role: 'zoomOut' },
				{ type: 'separator' },
				{ role: 'togglefullscreen' },
				{ role: 'toggleDevTools' }
			]
		},
		{ role: 'help', submenu: helpItems(t) }
	]
	if (process.platform === 'darwin') template.unshift({ role: 'appMenu' })
	return Menu.buildFromTemplate(template)
}

export const applyMenus = ({ locale, onSelectLocale, showWindow, hideWindow }) => {
	const t = path => translate(locale, path)

	Menu.setApplicationMenu(applicationMenu(t, locale, onSelectLocale))

	if (!tray) {
		tray = new Tray(nativeImage.createFromPath(icon('16x16.png')))
		tray.setToolTip('Scrcpy GUI')
		tray.on('click', showWindow)
	}
	tray.setContextMenu(trayMenu(t, locale, onSelectLocale, showWindow, hideWindow))
}

export const destroyTray = () => {
	tray?.destroy()
	tray = null
}
