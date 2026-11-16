const KEY = 'rememberedLogin'

export function loadRememberedLogin() {
  if (typeof localStorage === 'undefined') {
    return { email: '', role: '', remember: false }
  }
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    return { email: '', role: '', remember: false }
  }
  try {
    const parsed = JSON.parse(raw)
    const email = parsed.email || ''
    const role = parsed.role || ''
    const remember = parsed.remember === true
    if (Object.prototype.hasOwnProperty.call(parsed, 'password')) {
      localStorage.setItem(KEY, JSON.stringify({ email, role, remember }))
    }
    return { email, role, remember }
  } catch {
    localStorage.removeItem(KEY)
    return { email: '', role: '', remember: false }
  }
}

export function persistRememberedLogin({ email, role, remember = true }) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify({ email, role, remember }))
}

export function clearRememberedLogin() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(KEY)
}
