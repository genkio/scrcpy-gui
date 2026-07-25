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
	getAbout: () => ipcRenderer.invoke('app:about')
})
