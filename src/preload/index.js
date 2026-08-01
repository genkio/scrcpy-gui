import { contextBridge, ipcRenderer } from 'electron'
import { homedir } from 'node:os'
import { join } from 'node:path'

const subscribe = channel => callback => {
	const listener = (_event, payload) => callback(payload)
	ipcRenderer.on(channel, listener)
	return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('api', {
	platform: process.platform,
	defaults: {
		recordPath: join(homedir(), 'Desktop', 'scrcpy.mp4')
	},

	onDevices: subscribe('devices'),
	onScrcpyOpened: subscribe('scrcpy:opened'),
	onScrcpyClosed: subscribe('scrcpy:closed'),
	onError: subscribe('error'),
	onLocale: subscribe('locale'),

	openScrcpy: payload => ipcRenderer.send('scrcpy:open', payload),
	connect: payload => ipcRenderer.invoke('adb:connect', payload),
	disconnect: ip => ipcRenderer.invoke('adb:disconnect', ip),
	listStorageProfiles: payload => ipcRenderer.invoke('storage:profiles', payload),
	listStorage: payload => ipcRenderer.invoke('storage:list', payload),
	downloadStorage: payload => ipcRenderer.invoke('storage:download', payload),
	uploadStorage: payload => ipcRenderer.invoke('storage:upload', payload),

	onBatteryUpdate: subscribe('battery:update'),
	batteryStates: () => ipcRenderer.invoke('battery:states'),
	batteryCare: payload => ipcRenderer.invoke('battery:care', payload),

	onForwardUpdate: subscribe('forward:update'),
	detectForward: () => ipcRenderer.invoke('forward:detect'),
	testForward: address => ipcRenderer.invoke('forward:test', { address }),
	forwardStates: () => ipcRenderer.invoke('forward:states'),
	toggleForward: payload => ipcRenderer.invoke('forward:toggle', payload),
	syncForwardAddress: address => ipcRenderer.send('forward:address', address),

	syncSettings: settings => ipcRenderer.send('settings:sync', settings),
	openExternal: url => ipcRenderer.send('shell:open-external', url),

	mirror: {
		open: device => ipcRenderer.send('mirror:open', device),
		start: options => ipcRenderer.invoke('mirror:start', options),
		control: (action, payload) => ipcRenderer.invoke('mirror:control', { action, payload }),
		fitWindow: size => ipcRenderer.send('mirror:fit-window', size),
		onAction: subscribe('mirror:action'),
		onReady: subscribe('mirror:ready'),
		onPacket: subscribe('mirror:packet'),
		onAudioReady: subscribe('mirror:audio-ready'),
		onAudio: subscribe('mirror:audio'),
		onClosed: subscribe('mirror:closed')
	}
})
