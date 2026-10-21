const KEY = 'rememberedLogin'

export function loadRememberedLogin() {
  if (typeof localStorage === 'undefined') {
    return { email: '', role: '' }
  }
  const raw = localStorage.getItem(KEY)
  if (!raw) {
    return { email: '', role: '' }
  }
  try {
    const parsed = JSON.parse(raw)
    const email = parsed.email || ''
    const role = parsed.role || ''
    if (Object.prototype.hasOwnProperty.call(parsed, 'password')) {
      localStorage.setItem(KEY, JSON.stringify({ email, role }))
    }
    return { email, role }
  } catch {
    localStorage.removeItem(KEY)
    return { email: '', role: '' }
  }
}

export function persistRememberedLogin({ email, role }) {
  localStorage.setItem(KEY, JSON.stringify({ email, role }))
}

export function clearRememberedLogin() {
  localStorage.removeItem(KEY)
}
