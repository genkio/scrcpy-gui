<template>
	<el-card class="storage-browser">
		<div class="storage-toolbar">
			<div class="storage-targets">
				<el-select
					v-model="serial"
					:placeholder="$t('storage.selectDevice')"
					:disabled="devices.length === 0"
					@change="loadProfiles"
				>
					<el-option
						v-for="device in devices"
						:key="device.id"
						:label="device.name"
						:value="device.id"
					/>
				</el-select>
				<el-select
					v-model="userId"
					:placeholder="$t('storage.selectProfile')"
					:disabled="!serial || profiles.length === 0"
					@change="openProfileRoot"
				>
					<el-option
						v-for="profile in profiles"
						:key="profile.id"
						:label="profileLabel(profile)"
						:value="profile.id"
					/>
				</el-select>
			</div>
			<div class="storage-actions">
				<el-button
					type="primary"
					plain
					:icon="icons.Upload"
					:disabled="!root"
					:loading="uploading"
					@click="upload"
				>
					{{ $t('storage.upload') }}
				</el-button>
				<el-button
					:icon="icons.Refresh"
					:disabled="!root"
					:loading="loading"
					:title="$t('storage.refresh')"
					@click="refresh"
				/>
			</div>
		</div>

		<div v-if="root" class="storage-path">
			<el-button
				:icon="icons.ArrowLeft"
				text
				:disabled="path === root"
				:title="$t('storage.up')"
				@click="goUp"
			/>
			<el-breadcrumb separator="/">
				<el-breadcrumb-item v-for="crumb in breadcrumbs" :key="crumb.path">
					<button type="button" class="crumb" @click="load(crumb.path)">{{ crumb.label }}</button>
				</el-breadcrumb-item>
			</el-breadcrumb>
		</div>

		<el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />

		<el-table
			v-if="root"
			v-loading="loading"
			:data="entries"
			size="small"
			height="465"
			empty-text=""
			@row-dblclick="openEntry"
		>
			<el-table-column :label="$t('storage.name')" min-width="190" show-overflow-tooltip>
				<template #default="{ row }">
					<button
						v-if="row.directory"
						type="button"
						class="entry-name directory"
						@click="load(row.path)"
					>
						<el-icon><folder /></el-icon>
						<span>{{ row.name }}</span>
					</button>
					<span v-else class="file-entry">
						<span class="entry-name">
							<el-icon><document /></el-icon>
							<span>{{ row.name }}</span>
						</span>
						<el-button
							link
							:icon="icons.Download"
							:loading="downloading === row.path"
							:title="$t('storage.download')"
							@click="download(row)"
						/>
					</span>
				</template>
			</el-table-column>
			<el-table-column :label="$t('storage.size')" width="86" align="right">
				<template #default="{ row }">{{ row.directory ? '—' : formatSize(row.size) }}</template>
			</el-table-column>
			<el-table-column :label="$t('storage.modified')" width="150">
				<template #default="{ row }">{{ formatDate(row.modified) }}</template>
			</el-table-column>
		</el-table>

		<el-empty v-else :description="serial ? $t('storage.noProfile') : $t('storage.noDevice')" />
		<el-empty
			v-if="root && !loading && !error && entries.length === 0"
			class="empty-folder"
			:description="$t('storage.empty')"
			:image-size="70"
		/>
	</el-card>
</template>

<script>
import { ArrowLeft, Document, Download, Folder, Refresh, Upload } from '@element-plus/icons-vue'
import store from '../store'

export default {
	name: 'StorageBrowser',
	components: { Document, Folder },
	setup() {
		return { icons: { ArrowLeft, Download, Refresh, Upload } }
	},
	data() {
		return {
			root: '',
			path: '',
			serial: '',
			userId: null,
			devices: [],
			profiles: [],
			entries: [],
			loading: false,
			uploading: false,
			downloading: '',
			error: '',
			request: 0,
			unsubscribe: null
		}
	},
	computed: {
		breadcrumbs() {
			if (!this.root) return []
			const crumbs = [{ label: this.$t('storage.internalStorage'), path: this.root }]
			const segments = this.path.slice(this.root.length).split('/').filter(Boolean)
			let current = this.root
			segments.forEach(segment => {
				current += `/${segment}`
				crumbs.push({ label: segment, path: current })
			})
			return crumbs
		}
	},
	created() {
		this.unsubscribe = window.api.onDevices(this.handleDevices)
	},
	unmounted() {
		this.unsubscribe?.()
	},
	methods: {
		handleDevices(incoming) {
			this.devices = incoming.map(({ id }) => ({ id, name: store.get(id) || id }))
			if (this.devices.some(({ id }) => id === this.serial)) return

			this.serial = this.devices[0]?.id || ''
			if (this.serial) this.loadProfiles()
			else {
				this.request += 1
				this.loading = false
				this.profiles = []
				this.userId = null
				this.root = ''
				this.path = ''
				this.entries = []
				this.error = ''
			}
		},
		async loadProfiles(preserveSelection = false) {
			if (!this.serial) return

			const request = ++this.request
			this.loading = true
			this.error = ''
			const previousUserId = preserveSelection ? this.userId : null
			const previousPath = preserveSelection ? this.path : ''
			const result = await window.api.listStorageProfiles({ serial: this.serial })
			if (request !== this.request) return

			if (!result.ok) {
				this.loading = false
				this.profiles = []
				this.userId = null
				this.root = ''
				this.path = ''
				this.entries = []
				this.error = result.message
				return
			}

			this.profiles = result.profiles
			const selected =
				this.profiles.find(profile => profile.id === previousUserId) ||
				this.profiles.find(profile => profile.current) ||
				this.profiles.find(profile => profile.id === 0) ||
				this.profiles[0]
			this.userId = selected?.id ?? null
			this.root = selected?.root || ''
			const path =
				previousPath === this.root || previousPath.startsWith(`${this.root}/`)
					? previousPath
					: this.root
			this.loading = false
			if (this.root) await this.load(path)
		},
		openProfileRoot() {
			const profile = this.profiles.find(({ id }) => id === this.userId)
			this.root = profile?.root || ''
			this.path = this.root
			this.entries = []
			if (this.root) this.load(this.root)
		},
		refresh() {
			this.loadProfiles(true)
		},
		async load(path) {
			if (!this.serial || this.userId === null) return

			const request = ++this.request
			this.loading = true
			this.error = ''
			const result = await window.api.listStorage({
				serial: this.serial,
				userId: this.userId,
				path
			})
			if (request !== this.request) return

			this.loading = false
			if (!result.ok) {
				this.error = result.message
				return
			}
			this.path = result.path
			this.entries = result.entries
		},
		openEntry(entry) {
			if (entry.directory) this.load(entry.path)
		},
		goUp() {
			if (this.path === this.root) return
			this.load(this.path.slice(0, this.path.lastIndexOf('/')) || this.root)
		},
		async upload() {
			this.uploading = true
			const result = await window.api.uploadStorage({
				serial: this.serial,
				userId: this.userId,
				path: this.path
			})
			this.uploading = false
			if (result.canceled) return
			if (!result.ok) {
				this.$notify.error(result.message, 4000)
				await this.load(this.path)
				return
			}
			this.$notify.success(this.$t('storage.uploaded', { count: result.count }))
			await this.load(this.path)
		},
		async download(entry) {
			this.downloading = entry.path
			const result = await window.api.downloadStorage({
				serial: this.serial,
				userId: this.userId,
				path: entry.path
			})
			this.downloading = ''
			if (result.canceled) return
			if (!result.ok) {
				this.$notify.error(result.message, 4000)
				return
			}
			this.$notify.success(this.$t('storage.downloaded'))
		},
		profileLabel(profile) {
			if (profile.current) {
				return `${profile.name} (${this.$t('storage.currentProfile')})`
			}
			if (!profile.running) {
				return `${profile.name} (${this.$t('storage.stoppedProfile')})`
			}
			return profile.name
		},
		formatSize(bytes) {
			if (bytes < 1024) return `${bytes} B`
			const units = ['KB', 'MB', 'GB', 'TB']
			let value = bytes
			let unit = -1
			do {
				value /= 1024
				unit += 1
			} while (value >= 1024 && unit < units.length - 1)
			return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`
		},
		formatDate(timestamp) {
			if (!timestamp) return '—'
			return new Date(timestamp * 1000).toLocaleString([], {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			})
		}
	}
}
</script>

<style scoped>
.storage-browser {
	position: relative;
	min-height: 590px;
}
.storage-toolbar {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	margin-bottom: 12px;
}
.storage-targets {
	display: grid;
	flex: 1;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 8px;
	min-width: 0;
}
.storage-actions {
	display: flex;
	gap: 8px;
}
.storage-targets .el-select {
	width: 100%;
}
@media (max-width: 560px) {
	.storage-toolbar {
		flex-wrap: wrap;
	}
	.storage-targets {
		flex-basis: 100%;
	}
	.storage-actions {
		margin-left: auto;
	}
}
.storage-path {
	display: flex;
	align-items: center;
	min-height: 36px;
	overflow: hidden;
	border-top: 1px solid var(--el-border-color-lighter);
	border-bottom: 1px solid var(--el-border-color-lighter);
}
.storage-path .el-breadcrumb {
	overflow: hidden;
	white-space: nowrap;
}
.crumb,
.entry-name {
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	color: inherit;
	font: inherit;
}
.file-entry {
	display: flex;
	align-items: center;
	min-width: 0;
}
.file-entry .entry-name {
	min-width: 0;
}
.file-entry .el-button {
	flex: 0 0 auto;
	margin-left: auto;
}
.crumb,
.entry-name.directory {
	cursor: pointer;
}
.crumb:hover,
.entry-name.directory:hover {
	color: var(--el-color-primary);
}
.entry-name {
	display: flex;
	align-items: center;
	gap: 7px;
	max-width: 100%;
}
.entry-name span {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.entry-name .el-icon {
	flex: 0 0 auto;
	color: var(--el-text-color-secondary);
}
.entry-name.directory .el-icon {
	color: var(--el-color-warning);
}
.empty-folder {
	position: absolute;
	top: 250px;
	left: 50%;
	transform: translateX(-50%);
}
</style>
