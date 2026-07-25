import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import i18n from './i18n'
import store from './store'
import notify from './notify'
import waves from './directives/waves'
import './styles/index.scss'

const app = createApp(App)

app.use(ElementPlus)
app.use(i18n)

app.directive('waves', waves)
app.directive('focus', { mounted: el => el.focus() })

app.config.globalProperties.$store = store
app.config.globalProperties.$notify = notify

app.mount('#app')
