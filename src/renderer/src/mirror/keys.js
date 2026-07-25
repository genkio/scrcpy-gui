// Android constants, kept here so the renderer doesn't pull in the scrcpy protocol package
export const MotionAction = { Down: 0, Up: 1, Move: 2 }

export const KeyCode = {
	Home: 3,
	Back: 4,
	VolumeUp: 24,
	VolumeDown: 25,
	Power: 26,
	Tab: 61,
	Enter: 66,
	Backspace: 67,
	Menu: 82,
	PageUp: 92,
	PageDown: 93,
	MoveHome: 122,
	MoveEnd: 123,
	Forward: 112,
	ArrowUp: 19,
	ArrowDown: 20,
	ArrowLeft: 21,
	ArrowRight: 22,
	AppSwitch: 187
}

const BROWSER_KEYS = {
	Backspace: KeyCode.Backspace,
	Enter: KeyCode.Enter,
	NumpadEnter: KeyCode.Enter,
	Tab: KeyCode.Tab,
	ArrowUp: KeyCode.ArrowUp,
	ArrowDown: KeyCode.ArrowDown,
	ArrowLeft: KeyCode.ArrowLeft,
	ArrowRight: KeyCode.ArrowRight,
	Delete: KeyCode.Forward,
	PageUp: KeyCode.PageUp,
	PageDown: KeyCode.PageDown,
	Home: KeyCode.MoveHome,
	End: KeyCode.MoveEnd
}

export const keyCodeFor = event => BROWSER_KEYS[event.key] ?? null

export const isTypingKey = event =>
	event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey
