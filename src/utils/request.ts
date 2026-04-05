import { useUserStore } from '@/store/user'

const resolveBaseUrl = (): string => {
  // 允许通过本地存储覆盖，便于测试/灰度
  try {
    const override = uni.getStorageSync('api_base')
    if (override && typeof override === 'string' && /^https?:\/\//i.test(override)) {
      return override.replace(/\/$/, '')
    }
  } catch { }

  // #ifdef H5
  try {
    const proto = (typeof window !== 'undefined' ? (window.location?.protocol || 'http:') : 'http:')
    const host = (typeof window !== 'undefined' ? (window.location?.hostname || '127.0.0.1') : '127.0.0.1')
    // H5 本地开发（HBuilderX / Vite dev server）下走同域，通过 vite.config.ts 的 proxy 转发，避免 CORS
    // 包括 localhost、127.0.0.1 以及任何 .local 域名
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
      const origin = (typeof window !== 'undefined' ? (window.location?.origin || '') : '')
      if (origin) return String(origin).replace(/\/$/, '')
      const port = (typeof window !== 'undefined' ? (window.location?.port || '') : '')
      const suffix = port ? `:${port}` : ''
      return `${proto}//${host}${suffix}`
    }
    const apiHost = host.replace(/^(admin|web|mobile)\./, 'api.')
    const port = (typeof window !== 'undefined' ? (window.location?.port || '') : '')
    const isDefaultPort = !port || port === '80'
    const apiPort = isDefaultPort ? '' : ':8000'
    return `${proto}//${apiHost}${apiPort}`
  } catch {
    return 'http://127.0.0.1:8000'
  }
  // #endif

  // #ifndef H5
  // 小程序/APP 侧默认走 api 虚拟域名（按你的 hosts/网关策略调整）
  // 优先从 manifest.json 或环境变量读取，避免硬编码
  try {
    const manifest = uni.getAppBaseInfo?.() || uni.getAccountInfoSync?.() || {}
    const envApiBase = (manifest as any)?.env?.API_BASE || (manifest as any)?.mpConfig?.API_BASE
    if (envApiBase && typeof envApiBase === 'string' && /^https?:\/\//i.test(envApiBase)) {
      return envApiBase.replace(/\/$/, '')
    }
  } catch { }
  // 兜底使用 localhost，实际部署时请通过小程序后台/构建脚本注入环境变量
  return  'http://117.72.192.70:8000'
  // #endif
}

export const getBaseUrl = (): string => resolveBaseUrl()

export interface RequestConfig extends Omit<UniApp.RequestOptions, 'method'> {
  noAuth?: boolean;
  silent?: boolean;
  method?: 'OPTIONS' | 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'TRACE' | 'CONNECT' | 'PATCH' | 'patch';
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

let shownApiBaseHint = false

const extractErrorMessage = (resData: any): string => {
  if (!resData) return '请求错误，请稍后再试';
  if (typeof resData === 'string') return resData;

  const direct = resData?.errors?.detail || resData?.detail;
  if (direct) return String(direct);

  // 兼容 DRF 字段级错误：{ field: [msg1, msg2] } / { field: msg }
  const fields = ['new_password', 'password', 'code', 'captcha', 'email', 'username', 'token', 'uid'];
  for (const f of fields) {
    const v = resData?.errors?.[f] ?? resData?.[f];
    if (!v) continue;
    if (Array.isArray(v) && v.length) return String(v[0]);
    if (typeof v === 'string') return v;
  }

  // fallback: 取对象的第一个可读字段
  try {
    const obj = resData?.errors || resData;
    if (obj && typeof obj === 'object') {
      const firstKey = Object.keys(obj)[0];
      const v = obj[firstKey];
      if (Array.isArray(v) && v.length) return String(v[0]);
      if (typeof v === 'string') return v;
    }
  } catch { }

  return '请求错误，请稍后再试';
}

let authRedirecting = false
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb)
}

const onTokenRefreshed = (newToken: string) => {
  refreshSubscribers.forEach(cb => cb(newToken))
  refreshSubscribers = []
}

const doRefreshToken = async (): Promise<string | null> => {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((newToken: string) => {
        resolve(newToken)
      })
    })
  }

  isRefreshing = true
  try {
    const refreshToken = uni.getStorageSync('refreshToken')
    if (!refreshToken) {
      throw new Error('no refresh token')
    }

    const res: any = await uni.request({
      url: `${getBaseUrl()}/api/token/refresh/`,
      method: 'POST',
      data: { refresh: refreshToken },
      header: { 'Content-Type': 'application/json' }
    })

    if (res.statusCode === 200 && res.data?.access) {
      uni.setStorageSync('token', res.data.access)
      if (res.data.refresh) {
        uni.setStorageSync('refreshToken', res.data.refresh)
      }
      onTokenRefreshed(res.data.access)
      return res.data.access
    }
    throw new Error('refresh failed')
  } catch (err) {
    uni.removeStorageSync('token')
    uni.removeStorageSync('refreshToken')
    uni.removeStorageSync('userInfo')
    return null
  } finally {
    isRefreshing = false
  }
}

const redirectToLoginOnce = () => {
  if (authRedirecting) return
  authRedirecting = true
  try {
    const pages = getCurrentPages?.() as any[]
    const currentRoute = pages?.[pages.length - 1]?.route || ''
    if (currentRoute === 'pages/auth/login') return
  } catch { }

  uni.reLaunch({ url: '/pages/auth/login' })
  setTimeout(() => {
    authRedirecting = false
  }, 800)
}

const request = <T = any>(config: RequestConfig): Promise<T> => {
  const token = uni.getStorageSync('token');
  const baseUrl = getBaseUrl()

  const header: any = {
    ...config.header,
    'Content-Type': 'application/json',
  };

  if (token && !config.noAuth) {
    header['Authorization'] = `Bearer ${token}`;
  }

  const handleError = (res: UniApp.RequestSuccessCallbackResult, rej: (reason?: any) => void) => {
    const resData = res.data as any;
    const errorMap: Record<string, string> = {
      'No active account found with the given credentials': '用户名或密码错误',
      'User already exists': '用户名已存在',
      'Email already exists': '邮箱已被注册',
      'Given token not valid for any token type': '登录已过期，请重新登录',
      'Invalid captcha': '验证码不正确',
      'Captcha expired': '验证码已过期',
      'User not found': '用户不存在'
    };
    const rawError = extractErrorMessage(resData);
    const errorMsg = errorMap[rawError] || rawError;

    if (res.statusCode === 401 || res.statusCode === 403) {
      if (config.noAuth || config.url === '/api/token/') {
        if (!config.silent) {
          uni.showToast({ title: errorMsg, icon: 'none' });
        }
      } else {
        try {
          const userStore = useUserStore()
          userStore.logout()
        } catch {
          uni.removeStorageSync('token');
          uni.removeStorageSync('userInfo');
        }
        redirectToLoginOnce()
      }
    } else {
      if (!config.silent) {
        uni.showToast({ title: errorMsg, icon: 'none' });
      }
    }
    rej({ statusCode: res.statusCode, data: res.data });
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${baseUrl}${config.url}`,
      method: config.method as any || 'GET',
      data: config.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 暂时拦截 /api/notifications/ 以适配 VidSprout 自己的通知逻辑或测试环境
          if (config.url?.startsWith('/api/notifications/') && baseUrl.includes('vidsprout.local')) {
            if (!config.silent) {
              uni.showToast({ title: 'VidSprout', icon: 'none' });
            }
            reject({ statusCode: res.statusCode, data: res.data });
            return;
          }
          // 确保返回的是 JSON 对象，如果后端返回了 HTML（比如 404 页面），则视为错误
          if (typeof res.data === 'string' && res.data.includes('<!doctype html>')) {
            if (!config.silent) {
              uni.showToast({ title: '接口路径错误', icon: 'none' });
            }
            reject({ statusCode: res.statusCode, data: res.data });
            return;
          }
          resolve(res.data as T);
        } else {
          // 401 时尝试刷新 Token 并重试
          if (res.statusCode === 401 && !config.noAuth && config.url !== '/api/token/' && config.url !== '/api/token/refresh/') {
            doRefreshToken().then(newToken => {
              if (newToken) {
                header['Authorization'] = `Bearer ${newToken}`
                uni.request({
                  url: `${baseUrl}${config.url}`,
                  method: config.method as any || 'GET',
                  data: config.data,
                  header,
                  success: (retryRes) => {
                    if (retryRes.statusCode >= 200 && retryRes.statusCode < 300) {
                      resolve(retryRes.data as T)
                    } else {
                      handleError(retryRes, reject)
                    }
                  },
                  fail: (err) => reject({ statusCode: 0, data: err })
                })
              } else {
                handleError(res, reject)
              }
            })
          } else {
            handleError(res, reject)
          }
        }
      },
      fail: (err) => {
        try {
          const override = uni.getStorageSync('api_base')
          const errMsg = String((err as any)?.errMsg || '')
          const isResolveHost = /Unable\s+to\s+resolve\s+host/i.test(errMsg)
          const hasOverride = !!(override && typeof override === 'string' && /^https?:\/\//i.test(override))
          if (!shownApiBaseHint && isResolveHost && !hasOverride && /\.local\b/i.test(baseUrl)) {
            shownApiBaseHint = true
            uni.showToast({
              title: '接口域名无法解析，请到【设置-API地址】改为手机可访问的IP/域名',
              icon: 'none',
              duration: 3000,
            })
          }
        } catch { }
        if (!config.silent) {
          uni.showToast({ title: '网络连接失败', icon: 'none' });
        }
        reject({ statusCode: 0, data: err });
      }
    });
  });
};

export default request;
