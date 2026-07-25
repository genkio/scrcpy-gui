<template>
	<el-card>
		<el-form ref="form" :model="config" label-width="110px">
			<el-form-item :label="$t('configuration.title.label')">
				<el-input
					v-model="config.title"
					:placeholder="$t('configuration.title.placeholder')"
					:prefix-icon="icons.Iphone"
					clearable
				/>
			</el-form-item>

			<el-form-item :label="$t('configuration.source.label')">
				<el-tooltip effect="dark" :content="$t('configuration.source.tooltip')" placement="top">
					<el-input
						v-model="config.source"
						:placeholder="$t('configuration.source.placeholder')"
						:prefix-icon="icons.FolderOpened"
						clearable
					/>
				</el-tooltip>
			</el-form-item>

			<el-form-item :label="$t('configuration.record.label')">
				<el-switch
					v-model="config.record.open"
					@change="tip($t('configuration.record.tip'), config.record.open)"
				/>
				<el-checkbox size="small" v-model="config.record.openMirror" :disabled="!config.record.open" class="inline-check">
					{{ $t('configuration.record.mirror') }}
				</el-checkbox>
			</el-form-item>

			<el-form-item :label="$t('configuration.record.filepath')">
				<el-tooltip
					effect="dark"
					:content="$t('configuration.record.tooltip')"
					placement="top"
					:disabled="!config.record.open"
				>
					<el-input
						v-model="config.record.filepath"
						:prefix-icon="icons.VideoCamera"
						:disabled="!config.record.open"
						clearable
					/>
				</el-tooltip>
			</el-form-item>

			<el-form-item :label="$t('configuration.bitRate.label')">
				<el-popover placement="top-start" :content="$t('configuration.bitRate.popover')" width="250" trigger="focus">
					<template #reference>
						<el-slider v-model="config.bitRate" :max="1024" :min="1" show-input />
					</template>
				</el-popover>
			</el-form-item>

			<el-form-item :label="$t('configuration.maxSize.label')">
				<el-popover placement="top-start" :content="$t('configuration.maxSize.popover')" width="250" trigger="focus">
					<template #reference>
						<el-slider v-model="config.maxSize" :max="1920" :min="0" show-input />
					</template>
				</el-popover>
			</el-form-item>

			<el-form-item :label="$t('configuration.maxFps.label')">
				<el-popover placement="top-start" :content="$t('configuration.maxFps.popover')" width="250" trigger="focus">
					<template #reference>
						<el-slider v-model="config.maxFps" :max="300" :min="0" show-input />
					</template>
				</el-popover>
			</el-form-item>

			<el-form-item :label="$t('configuration.orientation.label')">
				<el-select v-model="config.orientation" :placeholder="$t('configuration.orientation.popover')">
					<el-option v-for="item in orientations" :key="item" :label="`${item}°`" :value="item" />
				</el-select>
			</el-form-item>

			<el-form-item :label="$t('configuration.window.label')">
				<el-popover
					v-for="field in windowFields"
					:key="field"
					placement="top-start"
					:title="$t(`configuration.window.${field}.title`)"
					:content="$t(`configuration.window.${field}.content`)"
					width="200"
					trigger="hover"
				>
					<template #reference>
						<el-input-number v-model="config.window[field]" size="small" />
					</template>
				</el-popover>
			</el-form-item>

			<el-form-item :label="$t('configuration.crop.label')">
				<el-popover placement="top-start" :content="$t('configuration.crop.x')" width="200" trigger="hover">
					<template #reference>
						<el-input-number v-model="config.crop.x" size="small" />
					</template>
				</el-popover>
				<el-popover placement="top-start" :content="$t('configuration.crop.y')" width="200" trigger="hover">
					<template #reference>
						<el-input-number v-model="config.crop.y" size="small" />
					</template>
				</el-popover>
				<el-popover
					v-for="field in ['height', 'width']"
					:key="field"
					placement="top-start"
					:title="$t(`configuration.crop.${field}.title`)"
					:content="$t(`configuration.crop.${field}.content`)"
					width="200"
					trigger="hover"
				>
					<template #reference>
						<el-input-number v-model="config.crop[field]" size="small" />
					</template>
				</el-popover>
			</el-form-item>

			<el-form-item :label="$t('configuration.other.label')">
				<el-checkbox size="small" v-model="config.fixed" border>{{ $t('configuration.other.fixed') }}</el-checkbox>
				<el-checkbox size="small" v-model="config.control" border>{{ $t('configuration.other.control') }}</el-checkbox>
				<el-checkbox size="small" v-model="config.border" border>{{ $t('configuration.other.border') }}</el-checkbox>
				<el-checkbox size="small" v-model="config.fullscreen" border>{{ $t('configuration.other.fullscreen') }}</el-checkbox>
				<el-tooltip effect="dark" :content="$t('configuration.other.awake.tooltip')" placement="top">
					<el-checkbox size="small" v-model="config.awake" border>{{ $t('configuration.other.awake.content') }}</el-checkbox>
				</el-tooltip>
				<el-checkbox size="small" v-model="config.touch" border>{{ $t('configuration.other.touch') }}</el-checkbox>
				<el-checkbox size="small" v-model="config.audio" border>{{ $t('configuration.other.audio') }}</el-checkbox>
				<el-checkbox size="small" v-model="config.screen" border>{{ $t('configuration.other.screen') }}</el-checkbox>
				<el-checkbox size="small" v-model="config.auto" border>{{ $t('configuration.other.auto') }}</el-checkbox>
				<el-tooltip effect="dark" :content="$t('configuration.other.hidden.tooltip')" placement="top">
					<el-checkbox size="small" v-model="config.hidden" border>{{ $t('configuration.other.hidden.content') }}</el-checkbox>
				</el-tooltip>
			</el-form-item>

			<el-divider content-position="right">
				<el-button link type="primary" @click="cycleLocale">简/繁/English</el-button>
			</el-divider>

			<div class="actions">
				<el-button v-waves type="primary" plain @click.prevent="save">
					{{ $t('configuration.button.save') }}
				</el-button>
				<el-button v-waves type="success" plain @click.prevent="setDefault">
					{{ $t('configuration.button.default') }}
				</el-button>
			</div>
		</el-form>
	</el-card>
</template>

<script>
import { FolderOpened, Iphone, VideoCamera } from '@element-plus/icons-vue'
import { defaultConfig, loadConfig, saveConfig, syncSettings } from '../config'
import { currentLocale, setLocale } from '../i18n'

const LOCALE_CYCLE = { zhCN: 'zhTW', zhTW: 'en', en: 'zhCN' }

export default {
	name: 'Configuration',
	setup() {
		return { icons: { Iphone, FolderOpened, VideoCamera } }
	},
	data() {
		return {
			config: loadConfig(),
			orientations: [0, 90, 180, 270],
			windowFields: ['x', 'y', 'height', 'width']
		}
	},
	watch: {
		'config.control'(enabled) {
			if (!enabled) this.config.awake = false
		},
		'config.awake'(enabled) {
			if (enabled) this.config.control = true
		}
	},
	created() {
		saveConfig(this.config)
	},
	methods: {
		tip(message, condition) {
			if (condition) this.$notify.info(message)
		},
		save() {
			saveConfig(this.config)
			syncSettings()
			this.$notify.success(this.$t('configuration.notify.saveSuccess'))
		},
		setDefault() {
			const { source, hidden } = this.config
			this.config = { ...defaultConfig(), source, hidden }
			saveConfig(this.config)
		},
		cycleLocale() {
			setLocale(LOCALE_CYCLE[currentLocale()] || 'en')
			syncSettings()
		}
	}
}
</script>

<style>
.el-form-item {
	margin-bottom: 10px !important;
}
.inline-check {
	margin-left: 24px;
}
.actions {
	margin: 10px auto;
	text-align: center;
}
</style>
