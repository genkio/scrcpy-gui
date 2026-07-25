import { ElNotification } from 'element-plus'

const LEVELS = ['info', 'success', 'warning', 'error']

const notify = LEVELS.reduce((api, type) => {
	api[type] = (message, duration = 1000, position = 'top-right', offset = 58) =>
		ElNotification({
			message,
			type,
			position,
			offset,
			duration,
			dangerouslyUseHTMLString: true,
			customClass: 'custom-notice',
			showClose: true
		})
	return api
}, {})

export default notify
