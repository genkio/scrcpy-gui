export default {
	notify: {
		'error': '错误',
		'info': '提示',
		'success': '成功',
		'warning': '警告'
	},
	footer: {
		powerBy: '基于',
		author: '作者'
	},
	dashboard: {
		configuration: '镜像配置',
		management: '镜像管理',
		storage: '文件'
	},
	storage: {
		selectDevice: '选择设备',
		selectProfile: '选择用户资料',
		noDevice: '连接设备后即可浏览存储空间',
		noProfile: '未找到 Android 用户资料',
		currentProfile: '当前',
		stoppedProfile: '已停止',
		profileUnavailable: '请先在手机上启动并解锁此用户资料，然后刷新。',
		internalStorage: '内部存储',
		refresh: '刷新',
		up: '返回上一级',
		upload: '上传',
		download: '下载',
		uploaded: '已上传 {count} 个文件',
		downloaded: '文件已下载',
		replaceTitle: '替换现有文件？',
		replaceMessage: '手机中已存在以下文件：{names}',
		replace: '替换',
		cancel: '取消',
		folderConflict: '已有文件夹使用此名称：{names}',
		name: '名称',
		size: '大小',
		modified: '修改时间',
		empty: '此文件夹为空'
	},
	configuration: {
		source: {
			label: 'Scrcpy',
			placeholder: 'scrcpy 可执行文件或其所在文件夹的路径',
			tooltip: '留空则使用 PATH 环境变量中的 scrcpy'
		},
		title: {
			label: '窗口标题',
			placeholder: '默认为手机型号'
		},
		record: {
			label: '镜像录屏',
			tip: '开启后,将录制镜像;关闭后,将生成已录制的视频文件到指定路径',
			filepath: '录屏文件路径',
			tooltip: '路径包括视频名,支持 .mp4 与 .mkv 格式',
			mirror: '录屏时打开镜像'
		},
		bitRate: {
			label: '镜像传输比特率',
			popover: '8为默认比特率'
		},
		maxSize: {
			label: '等比最大分辨率',
			popover: '0为默认分辨率'
		},
		maxFps: {
			label: '最大帧率',
			popover: '0为默认帧率'
		},
		orientation: {
			label: '旋转角度',
			popover: '0°为默认值'
		},
		crop: {
			label: '剪切屏幕',
			x: '剪切位置的横坐标',
			y: '剪切位置的纵坐标',
			height: {
				title: '剪切尺寸中的高度',
				content: '高宽为0,则不剪切'
			},
			width: {
				title: '剪切尺寸中的宽度',
				content: '高宽为0,则不剪切'
			},
		},
		window: {
			label: '初始化',
			x: {
				title: '镜像的横坐标',
				content: '横纵坐标为0, 则以默认的位置打开'
			},
			y: {
				title: '镜像的纵坐标',
				content: '横纵坐标为0, 则以默认的位置打开'
			},
			height: {
				title: '镜像的高度',
				content: '高宽为0,则以默认尺寸显示'
			},
			width: {
				title: '镜像的宽度',
				content: '高宽为0,则以默认尺寸显示'
			},
		},
		other: {
			label: '其他设置',
			fixed: '窗口置顶',
			control: '电脑控制',
			fullscreen: '全屏显示',
			border: '显示边框',
			touch: '显示点按位置',
			audio: '转发设备音频',
			screen: '打开镜像时关闭屏幕',
			awake: {
				tooltip: '关闭锁屏前须打开电脑控制选项',
				content: '关闭锁屏'
			},
			auto: '自动打开新连接的设备',
			hidden: {
				tooltip: '关闭窗口后应用继续在系统栏运行',
				content: '退出后隐藏到系统栏'
			}
		},
		button: {
			save: '保存当前配置',
			default: '恢复默认配置'
		},
		notify: {
			saveSuccess: '配置保存成功'
		}
	},
	management: {
		ip: {
			tip: '设备局域网 IP 地址',
			remove: '删除',
			connect: '开启无线连接'
		},
		devices: {
			name: '名称',
			edit: '点击即可修改',
			method: {
				label: '连接方式',
				wired: '有线',
				wireless: '无线'
			},
			operation: '操作',
			disconnect: '断开连接',
			battery: '电池保养'
		},
		battery: {
			tip: '通过开关 USB 充电，将电量保持在 {low}% 到 {high}% 之间',
			charging: '充电至 {high}%',
			paused: '已暂停充电，放电至 {low}%',
			failed: '无法切换 {name} 的 USB 充电'
		},
		button: {
			open: '打开选中的镜像',
			embed: '在应用内打开'
		},
		whenEmpty: '暂无设备连接',
		notify: {
			firstLoad: '正在加载设备',
			reduceDevices: '设备发生变动',
			newDevices: '检测到新设备',
			open: '已成功打开 {name}'
		},
		open: {
			loading: '正在打开镜像,请稍等片刻...',
			success: '{name} 已正常关闭',
			error: `{name} 打开失败,请您仔细查阅以下各项:
			<p>1. scrcpy 是否配置正确</p>
			<p>2. scrcpy-gui 软件是否设置为管理员启动</p>
			<p>3. scrcpy 命令行是否可以打开设备</p>
			<p>4. 执行\`adb-devices\`命令 查看是否出现设备</p>
			<p>5. 手机是否打开调试选项</p>
			如以上皆配置正常，请您到Github提出issue，我会尽快解决。`
		},
		connect: {
			error: {
				ip: '请输入正确的 IP 地址',
				exist: '{name} 已经连接'
			},
			loading: '正在开启无线连接...',
			success: '已成功打开无线连接',
			fail: '开启无线连接失败'
		},
		disconnect: {
			success: '{name} 已断开连接'
		},
		error: {
			unknownScrcpyPathException: 'scrcpy 启动失败，请检查配置中的 scrcpy 路径，或留空以使用 PATH 中的 scrcpy',
			adbNotFound: '未找到 `adb`，请安装 Android platform-tools 并确保 `adb` 在 PATH 中'
		}
	},
	mirror: {
		connecting: '正在启动镜像...',
		failed: '镜像启动失败\n{message}',
		disconnected: '镜像已断开\n{reason}',
		retry: '重试',
		device: '设备',
		view: '视图',
		more: '更多',
		back: '返回',
		home: '主屏幕',
		appSwitch: '任务切换',
		apps: '应用',
		screenOff: '关闭屏幕使用',
		clipboardToDevice: 'Mac → 手机',
		clipboardFromDevice: '手机 → Mac',
		notifications: '通知栏',
		wake: '唤醒屏幕',
		power: '电源键',
		volumeUp: '音量加',
		volumeDown: '音量减',
		menuKey: '菜单键',
		playPause: '播放 / 暂停',
		rotate: '旋转屏幕'
	},
	titleBar: {
		document: '帮助文档',
		checkForUpdates: '检查更新',
		feedback: '反馈提议',
		switchLanguage: '切换语言',
		about: '关于'
	},
	tray: {
		show: '显示',
		hide: '隐藏',
		exit: '退出'
	}
}
