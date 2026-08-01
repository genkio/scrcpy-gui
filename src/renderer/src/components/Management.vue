<template>
	<el-card>
		<div class="wrap-form">
			<el-divider content-position="center">{{ $t('management.ip.tip') }}</el-divider>
			<el-autocomplete
				v-model="ip"
				value-key="id"
				:fetch-suggestions="getWirelessDevices"
				:prefix-icon="icons.Position"
				@select="handleSelect"
			>
				<template #default="{ item }">
					<div class="item-name">
						<span style="color: #999">{{ $t('management.devices.name') }}: </span>{{ item.name }}
					</div>
					<span class="item-id">{{ item.id }}</span>
					<el-button class="item-remove" link size="small" @click.stop.prevent="deleteWirelessDevice(item.id)">
						{{ $t('management.ip.remove') }}
					</el-button>
				</template>
			</el-autocomplete>
			<br />
			<br />
			<el-button v-waves type="success" plain :disabled="ip === '' || connecting" @click.prevent="connect">
				{{ $t('management.ip.connect') }}
			</el-button>
		</div>

		<el-divider><el-icon><cellphone /></el-icon></el-divider>

		<div v-if="currentDevices.length > 0">
			<el-table
				:data="currentDevices"
				size="small"
				tooltip-effect="dark"
				style="width: 100%"
				stripe
				border
				@selection-change="selectionChange"
			>
				<el-table-column type="selection" width="40" />
				<el-table-column label="ID" prop="id" show-overflow-tooltip>
					<template #default="scope">
						<el-tag type="warning" size="small">{{ scope.row.id }}</el-tag>
					</template>
				</el-table-column>
				<el-table-column :label="$t('management.devices.name')">
					<template #default="{ row }">
						<editable-cell
							v-model="row.name"
							:can-edit="editModeEnabled"
							:tool-tip-content="$t('management.devices.edit')"
							@change="name => rename(row, name)"
						>
							{{ row.name }}
						</editable-cell>
					</template>
				</el-table-column>
				<el-table-column
					prop="method"
					:label="$t('management.devices.method.label')"
					width="70"
					align="center"
					:filters="methodFilters"
					:filter-method="filterTag"
					filter-placement="bottom-end"
				>
					<template #default="scope">
						<el-tag size="small" :type="scope.row.method === wired ? 'primary' : 'success'">
							{{ scope.row.method }}
						</el-tag>
					</template>
				</el-table-column>
				<el-table-column :label="$t('management.devices.battery')" width="58" align="center">
					<template #default="{ row }">
						<el-tooltip :content="batteryTip(row.id)" placement="top">
							<div class="battery-cell">
								<el-switch
									size="small"
									:model-value="care(row.id).enabled === true"
									:loading="care(row.id).busy === true"
									@change="enabled => toggleBatteryCare(row, enabled)"
								/>
								<span v-if="typeof care(row.id).level === 'number'" class="battery-level">
									{{ care(row.id).level }}%
								</span>
							</div>
						</el-tooltip>
					</template>
				</el-table-column>
				<el-table-column width="64" align="center">
					<template #header>
						<div class="forward-header">
							<span>{{ $t('management.devices.forward') }}</span>
							<el-tooltip :content="$t('management.forward.configure')" placement="top">
								<el-button
									link
									size="small"
									:icon="icons.Setting"
									:loading="configuringForward"
									@click.stop="configureForward"
								/>
							</el-tooltip>
						</div>
					</template>
					<template #default="{ row }">
						<el-tooltip :content="forwardTip(row.id)" placement="top">
							<el-switch
								size="small"
								:model-value="forward(row.id).enabled === true"
								:loading="forward(row.id).busy === true"
								:disabled="forwardAddress === ''"
								@change="enabled => toggleForward(row, enabled)"
							/>
						</el-tooltip>
					</template>
				</el-table-column>
				<el-table-column fixed="right" :label="$t('management.devices.operation')" width="90" align="center">
					<template #default="scope">
						<el-button
							link
							size="small"
							:disabled="scope.row.method === wired"
							@click.prevent="disconnect(scope.$index, scope.row.id)"
						>
							{{ $t('management.devices.disconnect') }}
						</el-button>
					</template>
				</el-table-column>
			</el-table>
			<div class="wrap-button">
				<el-button v-waves type="primary" :disabled="selectedDevices.length === 0" @click.prevent="embed(selectedDevices)">
					{{ $t('management.button.embed') }}
				</el-button>
				<el-button v-waves type="primary" plain :disabled="selectedDevices.length === 0" @click.prevent="open(selectedDevices)">
					{{ $t('management.button.open') }}
				</el-button>
			</div>
		</div>
		<div v-else class="when-empty">
			<span>{{ $t('management.whenEmpty') }}</span>
		</div>
	</el-card>
</template>

<script>
import { Cellphone, Position, Setting } from '@element-plus/icons-vue'
import { PAUSE_FROM, RESUME_BELOW } from '@shared/battery'
import EditableCell from './EditableCell.vue'
import Regular from '../utils/regular'
import { loadConfig } from '../config'
import store from '../store'

export default {
	name: 'Management',
	components: { EditableCell, Cellphone },
	setup() {
		return { icons: { Position, Setting } }
	},
	data() {
		return {
			editModeEnabled: true,
			currentDevices: [],
			selectedDevices: [],
			ip: '192.168.0.',
			wirelessDevices: [],
			deletedEvent: false,
			stoppedNotify: false,
			firstLoad: true,
			connecting: false,
			batteryCare: {},
			forwarding: {},
			careIntent: {},
			forwardAddress: '',
			configuringForward: false,
			unsubscribes: []
		}
	},
	computed: {
		wired() {
			return this.$t('management.devices.method.wired')
		},
		wireless() {
			return this.$t('management.devices.method.wireless')
		},
		methodFilters() {
			return [
				{ text: this.wired, value: this.wired },
				{ text: this.wireless, value: this.wireless }
			]
		}
	},
	created() {
		this.wirelessDevices = store.get('wirelessDevices') || []
		this.forwardAddress = store.get('forwardAddress') || ''

		this.unsubscribes = [
			window.api.onDevices(this.handleDevices),
			window.api.onScrcpyOpened(this.handleOpened),
			window.api.onScrcpyClosed(this.handleClosed),
			window.api.onBatteryUpdate(this.handleBatteryUpdate),
			window.api.onForwardUpdate(this.handleForwardUpdate),
			window.api.onError(({ type }) => this.$notify.error(this.$t(`management.error.${type}`)))
		]

		// a reloaded renderer would otherwise show the switch off while main is still enforcing the band
		window.api.batteryStates().then(states =>
			states.forEach(state => {
				this.handleBatteryUpdate(state)
				this.rememberIntent(state.serial, 'battery', true)
			})
		)
		window.api.forwardStates().then(states =>
			states.forEach(state => {
				this.handleForwardUpdate(state)
				this.rememberIntent(state.serial, 'forward', true)
			})
		)
	},
	unmounted() {
		this.unsubscribes.forEach(unsubscribe => unsubscribe())
	},
	methods: {
		handleDevices(incoming) {
			const previousCount = this.currentDevices.length
			const devices = incoming
				.filter(({ id }, index) => incoming.findIndex(device => id === device.id) === index)
				.map(({ id }) => ({
					id,
					name: store.get(id) || id,
					method: Regular('ip', id) ? this.wireless : this.wired
				}))

			const added = devices.filter(device => !this.currentDevices.some(({ id }) => id === device.id))
			if (loadConfig().auto && added.length) this.open(added)

			this.currentDevices = devices
			// main drops the watchers when a phone goes away, so a kept entry would show a toggle nobody enforces
			for (const state of [this.batteryCare, this.forwarding]) {
				Object.keys(state)
					.filter(serial => !devices.some(({ id }) => id === serial))
					.forEach(serial => delete state[serial])
			}
			added.forEach(this.resumeCare)
			this.rememberWirelessDevices()

			if (this.firstLoad) {
				this.firstLoad = false
				this.$notify.success(this.$t('management.notify.firstLoad'), 800)
			} else if (!this.stoppedNotify && previousCount > devices.length) {
				this.$notify.info(this.$t('management.notify.reduceDevices'))
			} else if (!this.stoppedNotify && previousCount < devices.length) {
				this.$notify.success(this.$t('management.notify.newDevices'))
			}
		},
		rememberWirelessDevices() {
			const previousCount = this.wirelessDevices.length
			this.currentDevices.forEach(({ id, name, method }) => {
				if (method === this.wired) return
				if (this.wirelessDevices.every(device => id !== device.id)) {
					this.wirelessDevices.push({ id, name })
				}
			})
			if (previousCount !== this.wirelessDevices.length) {
				store.put('wirelessDevices', this.wirelessDevices)
			}
		},
		handleOpened(id) {
			this.$notify.success(this.$t('management.notify.open', { name: store.get(id) || id }))
		},
		handleClosed({ success, id }) {
			const result = success ? 'success' : 'error'
			this.$notify[result](this.$t(`management.open.${result}`, { name: store.get(id) || id }))
		},
		open(devices) {
			this.$notify.info(this.$t('management.open.loading'), 2000)
			window.api.openScrcpy({ config: loadConfig(), devices: devices.map(({ id }) => ({ id })) })
		},
		embed(devices) {
			devices.forEach(({ id, name }) => window.api.mirror.open({ id, name }))
		},
		async connect() {
			if (!Regular('ip', this.ip)) {
				this.$notify.error(this.$t('management.connect.error.ip'))
				return
			}

			const existing = this.currentDevices.find(({ id }) => id === this.ip || id.split(':')[0] === this.ip)
			if (existing) {
				this.$notify.warning(this.$t('management.connect.error.exist', { name: existing.name }))
				return
			}

			const wireDevice = this.currentDevices.find(({ method }) => method === this.wired)

			this.connecting = true
			this.stoppedNotify = true
			this.$notify.info(this.$t('management.connect.loading'))

			const { success } = await window.api.connect({ id: wireDevice ? wireDevice.id : null, ip: this.ip })

			this.$notify[success ? 'success' : 'error'](
				this.$t(success ? 'management.connect.success' : 'management.connect.fail')
			)
			this.connecting = false
			setTimeout(() => {
				this.stoppedNotify = false
			}, 1000)
		},
		getWirelessDevices(queryString, callback) {
			const results = queryString
				? this.wirelessDevices.filter(device => device.id.startsWith(queryString))
				: this.wirelessDevices
			callback(results)
		},
		filterTag(value, row) {
			return row.method === value
		},
		rename({ id, method }, newName) {
			store.put(id, newName)
			if (method === this.wireless) {
				const device = this.wirelessDevices.find(device => device.id === id)
				if (device) {
					device.name = newName
					store.put('wirelessDevices', this.wirelessDevices)
				}
			}
		},
		async disconnect(index, id) {
			this.currentDevices.splice(index, 1)
			this.stoppedNotify = true
			await window.api.disconnect(id)
			this.$notify.info(this.$t('management.disconnect.success', { name: store.get(id) || id }))
			setTimeout(() => {
				this.stoppedNotify = false
			}, 1000)
		},
		care(id) {
			return this.batteryCare[id] || {}
		},
		batteryTip(id) {
			const { enabled, charging } = this.care(id)
			const key = !enabled ? 'tip' : charging ? 'charging' : 'paused'
			return this.$t(`management.battery.${key}`, { low: RESUME_BELOW, high: PAUSE_FROM })
		},
		handleBatteryUpdate({ serial, level, charging }) {
			this.batteryCare[serial] = { enabled: true, busy: false, level, charging }
		},
		async toggleBatteryCare({ id, name }, enabled) {
			this.batteryCare[id] = { ...this.care(id), enabled, busy: true }

			const { ok, message, level, charging } = await window.api.batteryCare({ serial: id, enabled })

			if (!ok) {
				this.batteryCare[id] = { enabled: false, busy: false }
				this.rememberIntent(id, 'battery', false)
				this.$notify.error(`${this.$t('management.battery.failed', { name })}: ${message}`)
				return
			}

			this.batteryCare[id] = { enabled, busy: false, level, charging }
			this.rememberIntent(id, 'battery', enabled)
		},
		rememberIntent(serial, feature, enabled) {
			this.careIntent[serial] = { ...this.careIntent[serial], [feature]: enabled }
		},
		// a replugged phone comes back with its watchers pruned; restore what was on for it this session
		resumeCare(device) {
			const intent = this.careIntent[device.id]
			if (!intent) return
			if (intent.battery && this.care(device.id).enabled !== true) this.toggleBatteryCare(device, true)
			if (intent.forward && this.forward(device.id).enabled !== true && this.forwardAddress !== '') {
				this.toggleForward(device, true)
			}
		},
		forward(id) {
			return this.forwarding[id] || {}
		},
		forwardTip(id) {
			if (this.forwardAddress === '') return this.$t('management.forward.unconfigured')
			const { enabled, forwarded, lastError } = this.forward(id)
			if (!enabled) return this.$t('management.forward.tip')
			if (lastError) return this.$t('management.forward.error', { message: lastError })
			return this.$t('management.forward.on', { address: this.forwardAddress, count: forwarded || 0 })
		},
		handleForwardUpdate({ serial, forwarded, lastError }) {
			this.forwarding[serial] = { enabled: true, busy: false, forwarded, lastError }
		},
		async toggleForward({ id, name }, enabled) {
			this.forwarding[id] = { ...this.forward(id), enabled, busy: true }

			const { ok, message, forwarded, lastError } = await window.api.toggleForward({
				serial: id,
				enabled,
				address: this.forwardAddress,
				name
			})

			if (!ok) {
				this.forwarding[id] = { enabled: false, busy: false }
				this.rememberIntent(id, 'forward', false)
				this.$notify.error(`${this.$t('management.forward.failed', { name })}: ${message}`)
				return
			}

			this.forwarding[id] = { enabled, busy: false, forwarded, lastError }
			this.rememberIntent(id, 'forward', enabled)
		},
		async configureForward() {
			this.configuringForward = true
			try {
				if (!(await window.api.detectForward())) {
					await this.$alert(
						this.$t('management.forward.missing.message'),
						this.$t('management.forward.missing.title')
					)
					return
				}

				await this.$confirm(
					this.$t('management.forward.test.message'),
					this.$t('management.forward.test.title'),
					{ type: 'info' }
				)

				const { value } = await this.$prompt(
					this.$t('management.forward.address.message'),
					this.$t('management.forward.address.title'),
					{
						inputValue: this.forwardAddress,
						inputValidator: value => Regular('email', (value || '').trim()) || this.$t('management.forward.address.invalid')
					}
				)

				const address = value.trim()
				this.forwardAddress = address
				store.put('forwardAddress', address)
				// watchers that are already running should forward to the new address too
				window.api.syncForwardAddress(address)

				const { ok, message } = await window.api.testForward(address)
				this.$notify[ok ? 'success' : 'error'](
					ok ? this.$t('management.forward.test.success') : `${this.$t('management.forward.test.failed')}: ${message}`
				)
			} catch {
				// one of the dialogs was dismissed
			} finally {
				this.configuringForward = false
			}
		},
		selectionChange(selection) {
			this.selectedDevices = selection
		},
		handleSelect(item) {
			this.ip = this.deletedEvent ? '192.168.0.' : item.id
			this.deletedEvent = false
		},
		deleteWirelessDevice(id) {
			this.deletedEvent = true
			const index = this.wirelessDevices.findIndex(device => device.id === id)
			this.wirelessDevices.splice(index, 1)
			store.put('wirelessDevices', this.wirelessDevices)
		}
	}
}
</script>

<style>
.el-card__body {
	padding: 12px !important;
}
.wrap-button {
	text-align: center;
	margin: 20px auto;
}
.wrap-form {
	text-align: center;
	margin-bottom: 20px;
}
.item-id {
	font-size: 14px;
	color: #666;
}
.item-id::before {
	content: 'ID: ';
	color: #999;
}
.item-remove {
	padding: 0 10px;
}
.when-empty {
	margin: 10px auto;
	text-align: center;
}
.battery-cell {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 2px;
}
.battery-level {
	font-size: 12px;
	color: #666;
}
.forward-header {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 2px;
}
.forward-header .el-button {
	padding: 0;
}
</style>
