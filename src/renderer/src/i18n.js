import { createI18n } from 'vue-i18n'
import { DEFAULT_LOCALE, messages, resolveLocale } from '@shared/lang'
import store from './store'

const i18n = createI18n({
	legacy: false,
	globalInjection: true,
	locale: store.get('locale') || resolveLocale(navigator.language),
	fallbackLocale: DEFAULT_LOCALE,
	messages
})

export const currentLocale = () => i18n.global.locale.value

export const setLocale = locale => {
	if (i18n.global.locale.value === locale) return
	i18n.global.locale.value = locale
	store.put('locale', locale)
}

export default i18n
