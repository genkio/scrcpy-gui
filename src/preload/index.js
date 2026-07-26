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
		onClosed: subscribe('mirror:closed')
	}
})
