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
