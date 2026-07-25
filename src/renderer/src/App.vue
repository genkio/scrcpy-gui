<template>
	<el-config-provider :locale="elementLocale">
		<el-container id="app" direction="vertical">
			<app-header />
			<el-main>
				<el-tabs v-model="activeTab" stretch>
					<el-tab-pane :label="$t('dashboard.configuration')" name="configuration">
						<configuration />
					</el-tab-pane>
					<el-tab-pane :label="$t('dashboard.management')" name="management">
						<management />
					</el-tab-pane>
				</el-tabs>
			</el-main>
			<app-footer />
		</el-container>
	</el-config-provider>
</template>

<script>
import elementEn from 'element-plus/es/locale/lang/en'
import elementZhCn from 'element-plus/es/locale/lang/zh-cn'
import elementZhTw from 'element-plus/es/locale/lang/zh-tw'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import Configuration from './components/Configuration.vue'
import Management from './components/Management.vue'
import i18n, { setLocale } from './i18n'
import { syncSettings } from './config'

const ELEMENT_LOCALES = { en: elementEn, zhCN: elementZhCn, zhTW: elementZhTw }

export default {
	name: 'App',
	components: { AppHeader, AppFooter, Configuration, Management },
	data() {
		return {
			activeTab: 'management',
			unsubscribe: null
		}
	},
	computed: {
		elementLocale() {
			return ELEMENT_LOCALES[i18n.global.locale.value] || elementEn
		}
	},
	created() {
		this.unsubscribe = window.api.onLocale(setLocale)
		syncSettings()
	},
	unmounted() {
		this.unsubscribe?.()
	}
}
</script>

<style lang="scss">
@use './styles/index.scss';

#app {
	user-select: none;
	height: 100vh;
}

.el-main {
	flex: 1;
	overflow-y: auto;
	padding-top: 6px;
}
</style>
