const KEY = 'scrcpy-gui'

const read = () => {
	try {
		return JSON.parse(localStorage.getItem(KEY)) || {}
	} catch {
		return {}
	}
}

const write = state => localStorage.setItem(KEY, JSON.stringify(state))

export default {
	get(key) {
		const value = read()[key]
		return value === undefined ? null : value
	},
	put(key, value) {
		const state = read()
		state[key] = value
		write(state)
	},
	has(key) {
		return Object.prototype.hasOwnProperty.call(read(), key)
	},
	delete(key) {
		const state = read()
		delete state[key]
		write(state)
	},
	clear() {
		localStorage.removeItem(KEY)
	}
}
