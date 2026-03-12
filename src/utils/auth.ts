type LoginNavMethod = 'reLaunch' | 'navigateTo'

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
      uni.setStorageSync('login_redirect', redirect)
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
