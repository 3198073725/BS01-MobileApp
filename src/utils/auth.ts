type LoginNavMethod = 'reLaunch' | 'navigateTo'

const LOGIN_REDIRECT_KEY = 'login_redirect'
const LOGIN_INTENT_KEY = 'login_intent'

let authRedirecting = false

const buildCurrentFullPath = (): string | null => {
  try {
    const pages = getCurrentPages?.() as any[]
    const current = pages?.[pages.length - 1] || null
    const route = current?.route || ''
    if (!route) return null
    const options = current?.options || {}
    const query = Object.keys(options)
      .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(options[k] ?? ''))}`)
      .join('&')
    return `/${route}${query ? `?${query}` : ''}`
  } catch {
    return null
  }
}

export const redirectToLoginOnce = (method: LoginNavMethod = 'reLaunch') => {
  if (authRedirecting) return
  authRedirecting = true

  let redirect: string | null = null
  try {
    const pages = getCurrentPages?.() as any[]
    const current = pages?.[pages.length - 1] || null
    const currentRoute = current?.route || ''
    if (currentRoute === 'pages/auth/login') return
    redirect = buildCurrentFullPath()
  } catch {}

  try {
    if (redirect) {
      uni.setStorageSync(LOGIN_REDIRECT_KEY, redirect)
    }
  } catch {}

  const loginUrl = redirect ? `/pages/auth/login?redirect=${encodeURIComponent(redirect)}` : '/pages/auth/login'
  try {
    if (method === 'navigateTo') {
      uni.navigateTo({ url: loginUrl })
    } else {
      uni.reLaunch({ url: loginUrl })
    }
  } finally {
    setTimeout(() => {
      authRedirecting = false
    }, 800)
  }
}

export const ensureLogin = (isLoggedIn: boolean, method: LoginNavMethod = 'reLaunch'): boolean => {
  if (isLoggedIn) return true
  redirectToLoginOnce(method)
  return false
}

export const setLoginIntent = (intent: Record<string, unknown>) => {
  try {
    uni.setStorageSync(LOGIN_INTENT_KEY, JSON.stringify(intent))
  } catch {}
}

export const clearLoginIntent = () => {
  try {
    uni.removeStorageSync(LOGIN_INTENT_KEY)
  } catch {}
}

export const consumeLoginIntent = <T extends Record<string, unknown> = Record<string, unknown>>(type?: string): T | null => {
  try {
    const raw = uni.getStorageSync(LOGIN_INTENT_KEY)
    uni.removeStorageSync(LOGIN_INTENT_KEY)
    if (!raw) return null
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return null
    if (type && parsed.type !== type) return null
    return parsed as T
  } catch {
    clearLoginIntent()
    return null
  }
}

const decodeRedirect = (raw: unknown): string | null => {
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(String(raw))
    return decoded.startsWith('/') ? decoded : null
  } catch {
    return null
  }
}

export const consumeLoginRedirect = (explicitRedirect?: unknown): string | null => {
  const direct = decodeRedirect(explicitRedirect)
  if (direct) {
    try { uni.removeStorageSync(LOGIN_REDIRECT_KEY) } catch {}
    return direct
  }

  try {
    const stored = decodeRedirect(uni.getStorageSync(LOGIN_REDIRECT_KEY))
    uni.removeStorageSync(LOGIN_REDIRECT_KEY)
    return stored
  } catch {
    return null
  }
}

export const completeLoginRedirect = (explicitRedirect?: unknown) => {
  const target = consumeLoginRedirect(explicitRedirect)
  if (!target) {
    clearLoginIntent()
    uni.switchTab({ url: '/pages/index/index' })
    return
  }

  if (!target.startsWith('/pages/index/index')) {
    clearLoginIntent()
  }

  if (target === '/pages/index/index' || target === '/pages/user/notifications' || target === '/pages/user/profile' || target === '/pages/video/upload') {
    uni.switchTab({ url: target })
    return
  }

  uni.reLaunch({ url: target })
}

export const promptLoginOrBackHome = async (isLoggedIn: boolean, method: LoginNavMethod = 'reLaunch'): Promise<boolean> => {
  if (isLoggedIn) return true

  return await new Promise((resolve) => {
    uni.showModal({
      title: '提示',
      content: '需要登录后才能继续，是否去登录？',
      confirmText: '去登录',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) {
          redirectToLoginOnce(method)
          resolve(false)
          return
        }
        uni.switchTab({ url: '/pages/index/index' })
        resolve(false)
      },
      fail: () => {
        uni.switchTab({ url: '/pages/index/index' })
        resolve(false)
      }
    })
  })
}
