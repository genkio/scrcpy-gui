export default {
	footer: {
		powerBy: 'Power by',
		author: 'Author'
	},
	dashboard: {
		configuration: 'Configuration',
		management: 'Management',
		storage: 'Storage'
	},
	storage: {
		selectDevice: 'Select a device',
		selectProfile: 'Select a profile',
		noDevice: 'Connect a device to browse its storage',
		noProfile: 'No Android profiles found',
		currentProfile: 'current',
		stoppedProfile: 'stopped',
		profileUnavailable: 'Start and unlock this profile on the phone, then refresh.',
		internalStorage: 'Internal storage',
		refresh: 'Refresh',
		up: 'Up one folder',
		upload: 'Upload',
		download: 'Download',
		uploaded: '{count} file uploaded | {count} files uploaded',
		downloaded: 'File downloaded',
		replaceTitle: 'Replace existing files?',
		replaceMessage: 'These files already exist on the phone: {names}',
		replace: 'Replace',
		cancel: 'Cancel',
		folderConflict: 'A folder already uses this file name: {names}',
		name: 'Name',
		size: 'Size',
		modified: 'Modified',
		empty: 'This folder is empty'
	},
	configuration: {
		source: {
			label: 'Scrcpy',
			placeholder: 'Path to the scrcpy binary or its folder',
			tooltip: 'Leave empty to use the scrcpy found on your PATH'
		},
		title: {
			label: 'window title',
			placeholder: 'The default is the device model',
		},
		record: {
			label: 'record screen',
			tip: 'When turned on, the mirror will be recorded; when closed, the recorded video file will be generated to the specified path.',
			filepath: 'file path',
			tooltip: 'The path includes the video name; .mp4 and .mkv are supported',
			mirror: 'Open mirror when recording'
		},
		bitRate: {
			label: 'bit rate',
			popover: '8 is the default bit rate'
		},
		maxSize: {
			label: 'max size',
			popover: '0 is the default value'
		},
		maxFps: {
			label: 'max fps',
			popover: '0 is the default value'
		},
		orientation: {
			label: 'rotation angle',
			popover: '0° is the default value'
		},
		window: {
			label: 'initialization',
			x: {
				title: 'Mirror\'s abscissa position',
				content: 'If the abscissa and ordinate are both 0, it will open in the default position'
			},
			y: {
				title: 'Mirror\'s ordinate position',
				content: 'If the abscissa and ordinate are both 0, it will open in the default position'
			},
			height: {
				title: 'Mirror height',
				content: 'If the width and height are both 0, the default size is displayed'
			},
			width: {
				title: 'Mirror width',
				content: 'If the width and height are both 0, the default size is displayed'
			},
		},
		crop: {
			label: 'cut screen',
			x: 'The abscissa of the cut position',
			y: 'The ordinate of the cut position',
			height: {
				title: 'Height in the cut size',
				content: 'If the height and width are both 0, then it will not be cut'
			},
			width: {
				title: 'Cut width in size',
				content: 'If the height and width are both 0, then it will not be cut'
			},
		},
		other: {
			label: 'other settings',
			fixed: 'Window always on top',
			control: 'Computer control',
			fullscreen: 'Display in full screen',
			border: 'Show window border',
			touch: 'Show phone tap location',
			audio: 'Forward device audio',
			screen: 'Turn off the phone screen',
			awake: {
				tooltip: 'The computer control option must be opened before turning off the lock screen',
				content: 'Turn off the lock screen'
			},
			auto: 'Automatically turn on connected devices',
			hidden: {
				tooltip: 'Closing the window keeps the app running in the tray',
				content: 'Hide to system bar after exit'
			}
		},
		button: {
			save: 'Save configuration',
			default: 'Restore default'
		},
		notify: {
			saveSuccess: 'Configuration saved successfully!'
		}
	},
	management: {
		ip: {
			tip: 'Device LAN IP address',
			remove: 'delete',
			connect: 'Turn on wireless connection'
		},
		devices: {
			name: 'name',
			edit: 'Click to edit',
			method: {
				label: 'method',
				wired: 'wired',
				wireless: 'wireless'
			},
			operation: 'operation',
			disconnect: 'disconnect',
			battery: 'battery care'
		},
		battery: {
			tip: 'Hold the battery between {low}% and {high}% by switching USB charging off and on',
			charging: 'Charging until {high}%',
			paused: 'Charging paused, draining to {low}%',
			failed: 'Could not change USB charging on {name}'
		},
		button: {
			open: 'Open the selected mirror',
			embed: 'Open in app'
		},
		whenEmpty: 'No device connection',
		notify: {
			firstLoad: 'Loading device...',
			reduceDevices: 'Equipment changes',
			newDevices: 'New device detected',
			open: '{name} has been successfully opened'
		},
		open: {
			loading: 'Opening the mirror, please wait a moment...',
			success: '{name} has been closed normally',
			error: `{name} failed to start. Please check the documentation carefully:
			<p>1. Whether scrcpy configured correctly</p>
			<p>2. Whether the phone opens the debugging option</p>
			<p>3. Whether the scrcpy-gui software set to start by the administrator</p>
			<p>4. Whether the scrcpy command line can open the device</p>
			<p>5. Run the \`adb-devices\` command to see if the device appears</p>
			If the above configuration is normal, please go to Github to file an issue, and I will resolve it as soon as possible`
		},
		connect: {
			error: {
				ip: 'Please enter the correct IP address',
				exist: '{name} has been connected'
			},
			loading: 'Opening wireless connection...',
			success: 'Wireless connection turned on',
			fail: 'Failed to open wireless connection'
		},
		disconnect: {
			success: '{name} already disconnected'
		},
		error: {
			'unknownScrcpyPathException': 'Scrcpy could not be started. Check the scrcpy path in the configuration tab, or leave it empty to use the one on your PATH',
			'adbNotFound': '`adb` was not found. Install the Android platform tools and make sure `adb` is on your PATH'
		}
	},
	mirror: {
		connecting: 'Starting the mirror...',
		failed: 'Could not start the mirror.\n{message}',
		disconnected: 'The mirror stopped.\n{reason}',
		retry: 'Try again',
		device: 'Device',
		view: 'View',
		more: 'More',
		back: 'Back',
		home: 'Home',
		appSwitch: 'App switcher',
		apps: 'Apps',
		screenOff: 'Use with Screen Off',
		clipboardToDevice: 'Mac → Phone',
		clipboardFromDevice: 'Phone → Mac',
		notifications: 'Notifications',
		wake: 'Wake',
		power: 'Power',
		volumeUp: 'Volume up',
		volumeDown: 'Volume down',
		menuKey: 'Menu',
		playPause: 'Play / pause',
		rotate: 'Rotate'
	},
	titleBar: {
		document: 'Document',
		checkForUpdates: 'Update',
		feedback: 'Feedback',
		switchLanguage: 'Languages',
		about: 'About'
	},
	tray: {
		show: 'Show',
		hide: 'Hide',
		exit: 'Exit'
	}
}
