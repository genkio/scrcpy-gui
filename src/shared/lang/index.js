import en from './en.js'
import zhCN from './zh_CN.js'
import zhTW from './zh_TW.js'

export const messages = { en, zhCN, zhTW }

export const DEFAULT_LOCALE = 'en'

export const LOCALE_LABELS = {
	en: 'English',
	zhCN: '简体中文',
	zhTW: '繁體中文'
}

export const resolveLocale = tag => {
	const normalized = String(tag || '').toLowerCase()
	if (normalized.startsWith('zh')) {
		return /tw|hk|mo|hant/.test(normalized) ? 'zhTW' : 'zhCN'
	}
	return DEFAULT_LOCALE
}

export const translate = (locale, path) => {
	const catalog = messages[locale] || messages[DEFAULT_LOCALE]
	const value = path.split('.').reduce((node, key) => (node == null ? node : node[key]), catalog)
	return value == null ? path : value
}

export { en, zhCN, zhTW }
