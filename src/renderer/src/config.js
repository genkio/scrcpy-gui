import store from './store'
import { currentLocale } from './i18n'

export const defaultConfig = () => ({
	source: '',
	title: '',
	record: {
		open: false,
		openMirror: true,
		filepath: window.api.defaults.recordPath
	},
	screen: false,
	fixed: false,
	control: true,
	touch: true,
	audio: true,
	bitRate: 8,
	maxSize: 0,
	maxFps: 0,
	orientation: 0,
	border: true,
	fullscreen: false,
	awake: false,
	auto: false,
	hidden: false,
	crop: { x: 0, y: 0, height: 0, width: 0 },
	window: { x: 0, y: 0, height: 0, width: 0 }
})

// merged against the defaults so configs saved by an older version keep working
export const loadConfig = () => {
	const base = defaultConfig()
	const saved = store.get('config') || {}
	return {
		...base,
		...saved,
		record: { ...base.record, ...saved.record },
		crop: { ...base.crop, ...saved.crop },
		window: { ...base.window, ...saved.window }
	}
}

export const saveConfig = config => store.put('config', config)

export const syncSettings = () =>
	window.api.syncSettings({
		locale: currentLocale(),
		hideOnClose: Boolean(loadConfig().hidden)
	})
