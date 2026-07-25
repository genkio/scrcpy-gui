import './waves.css'

export default {
	mounted(el, binding) {
		el.addEventListener(
			'click',
			e => {
				const opts = {
					ele: el,
					type: 'hit', // hit: ripple from the click point, center: from the middle
					color: 'rgba(0, 0, 0, 0.15)',
					...binding.value
				}
				const target = opts.ele
				if (!target) return

				target.style.position = 'relative'
				target.style.overflow = 'hidden'
				const rect = target.getBoundingClientRect()
				let ripple = target.querySelector('.waves-ripple')
				if (!ripple) {
					ripple = document.createElement('span')
					ripple.className = 'waves-ripple'
					ripple.style.height = ripple.style.width = `${Math.max(rect.width, rect.height)}px`
					target.appendChild(ripple)
				} else {
					ripple.className = 'waves-ripple'
				}

				if (opts.type === 'center') {
					ripple.style.top = `${rect.height / 2 - ripple.offsetHeight / 2}px`
					ripple.style.left = `${rect.width / 2 - ripple.offsetWidth / 2}px`
				} else {
					ripple.style.top = `${e.pageY - rect.top - ripple.offsetHeight / 2 - document.body.scrollTop}px`
					ripple.style.left = `${e.pageX - rect.left - ripple.offsetWidth / 2 - document.body.scrollLeft}px`
				}

				ripple.style.backgroundColor = opts.color
				ripple.className = 'waves-ripple z-active'
			},
			false
		)
	}
}
