export default {
	notify: {
		'error': '錯誤',
		'info': '提示',
		'success': '成功',
		'warning': '警告'
	},
	footer: {
		powerBy: '基於',
		author: '作者'
	},
	dashboard: {
		configuration: '投影配置',
		management: '投影管理',
		storage: '檔案'
	},
	storage: {
		selectDevice: '選擇裝置',
		selectProfile: '選擇使用者設定檔',
		noDevice: '連接裝置後即可瀏覽儲存空間',
		noProfile: '找不到 Android 使用者設定檔',
		currentProfile: '目前',
		stoppedProfile: '已停止',
		profileUnavailable: '請先在手機上啟動並解鎖此使用者設定檔，然後重新整理。',
		internalStorage: '內部儲存空間',
		refresh: '重新整理',
		up: '返回上一層',
		upload: '上傳',
		download: '下載',
		uploaded: '已上傳 {count} 個檔案',
		downloaded: '檔案已下載',
		replaceTitle: '取代現有檔案？',
		replaceMessage: '手機中已存在以下檔案：{names}',
		replace: '取代',
		cancel: '取消',
		folderConflict: '已有資料夾使用此名稱：{names}',
		name: '名稱',
		size: '大小',
		modified: '修改時間',
		empty: '此資料夾是空的'
	},
	configuration: {
		source: {
			label: 'Scrcpy',
			placeholder: 'scrcpy 執行檔或其所在資料夾的路徑',
			tooltip: '留空則使用 PATH 環境變數中的 scrcpy'
		},
		title: {
			label: '視窗標題',
			placeholder: '預設為手機型號'
		},
		record: {
			label: '錄製投影畫面',
			tip: '開啟後,將錄製投影畫面;關閉後,將儲存已錄製的影片文件到指定路徑',
			filepath: '螢幕錄影文件路徑',
			tooltip: '路徑包括影片名,支援 .mp4 與 .mkv 格式',
			mirror: '錄影時啟動投影'
		},
		bitRate: {
			label: '投影傳輸比特率',
			popover: '8M為預設比特率'
		},
		maxSize: {
			label: '等比最大解析度',
			popover: '0為預設解析度'
		},
		maxFps: {
			label: '最大FPS幀數',
			popover: '0為預設FPS幀數'
		},
		orientation: {
			label: '旋轉角度',
			popover: '0°為預設值'
		},
		crop: {
			label: '裁剪畫面',
			x: '裁剪位置的横座標',
			y: '裁剪位置的縱座標',
			height: {
				title: '裁剪尺寸中的高度',
				content: '高寬為0,則不裁剪'
			},
			width: {
				title: '裁剪尺寸中的寬度',
				content: '高寬為0,則不裁剪'
			},
		},
		window: {
			label: '初始化',
			x: {
				title: '投影的横座標',
				content: '橫縱座標為0, 則以預設的位置打開'
			},
			y: {
				title: '投影的縱坐標',
				content: '橫縱座標為0, 則以預設的位置打開'
			},
			height: {
				title: '投影畫面的高度',
				content: '高寬為0,則以預設尺寸顯示'
			},
			width: {
				title: '投影畫面的寬度',
				content: '高寬為0,則以預設尺寸顯示'
			},
		},
		other: {
			label: '其他設置',
			fixed: '最上層顯示視窗',
			control: '允許由電腦控制裝置',
			fullscreen: '全螢幕顯示',
			border: '顯示邊框',
			touch: '顯示點擊位置',
			audio: '轉發裝置音訊',
			screen: '開啟螢幕投影時關閉裝置螢幕',
			awake: {
				tooltip: '關閉鎖屏前須打開電腦控制選項',
				content: '關閉螢幕鎖定'
			},
			auto: '自動打開新連接的裝置',
			hidden: {
				tooltip: '關閉視窗後應用會繼續在系統欄執行',
				content: '退出後隐藏到系统欄'
			}
		},
		button: {
			save: '保存目前配置',
			default: '恢復預設配置'
		},
		notify: {
			saveSuccess: '配置保存成功'
		}
	},
	management: {
		ip: {
			tip: '裝置區域連線 IP 地址',
			remove: '删除',
			connect: '開啟無線連接'
		},
		devices: {
			name: '名稱',
			edit: '點擊即可修改',
			method: {
				label: '連接方式',
				wired: '有線',
				wireless: '無線'
			},
			operation: '操作',
			disconnect: '中斷連接',
			battery: '電池保養',
			forward: '簡訊'
		},
		battery: {
			tip: '透過開關 USB 充電，將電量維持在 {low}% 到 {high}% 之間',
			charging: '充電至 {high}%',
			paused: '已暫停充電，放電至 {low}%',
			failed: '無法切換 {name} 的 USB 充電'
		},
		forward: {
			configure: '設定簡訊轉發',
			missing: {
				title: '需要安裝 cc-imessage',
				message: '簡訊轉發透過 cc-imessage 傳送。請先安裝：brew install genkio/tap/cc-imessage'
			},
			test: {
				title: '測試 cc-imessage？',
				message: '將向你的地址傳送一條測試 iMessage。首次傳送可能會彈出 macOS 權限對話框，最長需要 30 秒。',
				success: '測試訊息已傳送',
				failed: '測試訊息傳送失敗'
			},
			address: {
				title: '轉發地址',
				message: '接收轉發簡訊的 iCloud 地址',
				invalid: '請輸入正確的電子郵件地址'
			},
			unconfigured: '請先設定轉發地址（點擊上方齒輪圖示）',
			tip: '將新收到的簡訊轉發至 iMessage',
			on: '正在轉發至 {address}（已轉發 {count} 條）',
			error: '轉發發生錯誤：{message}',
			failed: '無法切換 {name} 的簡訊轉發'
		},
		button: {
			open: '開啟選中裝置的投影',
			embed: '在應用內開啟'
		},
		whenEmpty: '暫時沒有裝置連接',
		notify: {
			firstLoad: '正在載入裝置',
			reduceDevices: '裝置發生變動',
			newDevices: '偵測到新裝置',
			open: '已成功開啟 {name}'
		},
		open: {
			loading: '正在啟動投影,請稍候...',
			success: '{name} 已正常關閉',
			error: `{name} 開啟失敗,請您仔細確認以下項目:
			<p>1. scrcpy 是否配置正確</p>
			<p>2. scrcpy-gui 本應用是否設置為以系統管理員身分啟動</p>
			<p>3. scrcpy 命令行是否可以開啟裝置</p>
			<p>4. 執行\`adb-devices\`命令 查看是否出現裝置</p>
			<p>5. 手机是否開啟偵錯選項</p>
			如以上皆配置正常，請您到原作者Github提出issue，以協助解决。`
		},
		connect: {
			error: {
				ip: '請輸入正確的 IP 地址',
				exist: '{name} 已經連接'
			},
			loading: '正在啟動無線連接...',
			success: '已成功開啟無線連接',
			fail: '開啟無線連接失敗'
		},
		disconnect: {
			success: '{name} 已中斷連接'
		},
		error: {
			unknownScrcpyPathException: 'scrcpy 啟動失敗，請檢查配置中的 scrcpy 路徑，或留空以使用 PATH 中的 scrcpy',
			adbNotFound: '找不到 `adb`，請安裝 Android platform-tools 並確認 `adb` 在 PATH 中'
		}
	},
	mirror: {
		connecting: '正在啟動投影...',
		failed: '投影啟動失敗\n{message}',
		disconnected: '投影已中斷\n{reason}',
		retry: '重試',
		device: '裝置',
		view: '檢視',
		more: '更多',
		back: '返回',
		home: '主畫面',
		appSwitch: '切換應用',
		apps: '應用程式',
		screenOff: '關閉螢幕使用',
		clipboardToDevice: 'Mac → 手機',
		clipboardFromDevice: '手機 → Mac',
		notifications: '通知欄',
		wake: '喚醒螢幕',
		power: '電源鍵',
		volumeUp: '音量加',
		volumeDown: '音量減',
		menuKey: '選單鍵',
		playPause: '播放 / 暫停',
		mute: '靜音',
		rotate: '旋轉螢幕'
	},
	titleBar: {
		document: '使用說明',
		checkForUpdates: '檢查更新',
		feedback: '回報與建議',
		switchLanguage: '切換語言',
		about: '關於'
	},
	tray: {
		show: '顯示',
		hide: '隐藏',
		exit: '退出'
	}
}
