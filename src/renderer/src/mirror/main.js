import { createApp } from 'vue'
import MirrorApp from './MirrorApp.vue'
import i18n from '../i18n'
import './mirror.scss'

createApp(MirrorApp).use(i18n).mount('#app')
