export const BASE_URL = 'http://mobile.bs01.local:8000';

import { useUserStore } from '@/store/user'

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
  } catch {}

  return '请求错误，请稍后再试';
}

let authRedirecting = false

const redirectToLoginOnce = () => {
  if (authRedirecting) return
  authRedirecting = true
  try {
    const pages = getCurrentPages?.() as any[]
    const currentRoute = pages?.[pages.length - 1]?.route || ''
    if (currentRoute === 'pages/auth/login') return
  } catch {}

  uni.reLaunch({ url: '/pages/auth/login' })
  setTimeout(() => {
    authRedirecting = false
  }, 800)
}

const request = <T = any>(config: RequestConfig): Promise<T> => {
  const token = uni.getStorageSync('token');
  
  const header = {
    ...config.header,
    'Content-Type': 'application/json',
  };

  if (token && !config.noAuth) {
    header['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${config.url}`,
      method: config.method as any || 'GET',
      data: config.data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 暂时拦截 /api/notifications/ 以适配 VidSprout 自己的通知逻辑或测试环境
          if (config.url?.startsWith('/api/notifications/') && BASE_URL.includes('vidsprout.local')) {
            if (!config.silent) {
              uni.showToast({
                title: 'VidSprout',
                icon: 'none'
              });
            }
            reject({ statusCode: res.statusCode, data: res.data });
            return;
          }
          // 确保返回的是 JSON 对象，如果后端返回了 HTML（比如 404 页面），则视为错误
          if (typeof res.data === 'string' && res.data.includes('<!doctype html>')) {
            if (!config.silent) {
              uni.showToast({
                title: '接口路径错误',
                icon: 'none'
              });
            }
            reject({ statusCode: res.statusCode, data: res.data });
            return;
          }
          resolve(res.data as T);
        } else {
          const resData = res.data as any;
          // 错误信息映射表
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
            // 如果是登录页面发起的请求 (noAuth 为 true)，或者是获取 token 的接口，不执行跳转，只弹出提示
            if (config.noAuth || config.url === '/api/token/') {
              if (!config.silent) {
                uni.showToast({
                  title: errorMsg,
                  icon: 'none'
                });
              }
            } else {
              // 否则是普通请求鉴权失败，清理登录态并跳转登录（统一由 store 管理）
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
            // 其它错误（如 400 缺少参数等），也弹出后端返回的具体错误信息
            if (!config.silent) {
              uni.showToast({
                title: errorMsg,
                icon: 'none'
              });
            }
          }
          reject({ statusCode: res.statusCode, data: res.data });
        }
      },
      fail: (err) => {
        if (!config.silent) {
          uni.showToast({
            title: '网络连接失败',
            icon: 'none'
          });
        }
        reject({ statusCode: 0, data: err });
      }
    });
  });
};

export default request;
