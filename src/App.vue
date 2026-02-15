<script setup lang="ts">
import { ref } from "vue";
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import request from "@/utils/request";
import { useUserStore } from "@/store/user";

const theme = ref(uni.getStorageSync('theme') || 'light');

const applyTheme = (t: string) => {
  theme.value = t;
  uni.setStorageSync('theme', t);
  // #ifdef H5 || APP-PLUS
  try {
    const root = document.documentElement;
    if (t === 'dark') {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
  } catch (e) {}
  // #endif

  // 非 H5：同步原生 UI（tabbar/窗口背景）以匹配主题
  // 说明：CSS 变量在不同端的应用方式不同，但原生容器颜色需要单独设置
  // #ifndef H5
  try {
    const isDark = t === 'dark';
    uni.setBackgroundColor({
      backgroundColor: isDark ? '#111111' : '#F8F8F8',
      backgroundColorTop: isDark ? '#111111' : '#F8F8F8',
      backgroundColorBottom: isDark ? '#111111' : '#F8F8F8'
    });
  } catch (e) {}

  try {
    const isDark = t === 'dark';
    uni.setTabBarStyle({
      color: isDark ? '#7a7a7a' : '#999999',
      selectedColor: '#fb7299',
      backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
      borderStyle: isDark ? 'black' : 'white'
    });
  } catch (e) {}
  // #endif
};

const parseQuery = (q: string): Record<string, string> => {
  const query: Record<string, string> = {};
  const raw = (q || '').replace(/^\?/, '');
  if (!raw) return query;
  raw.split('&').forEach((pair) => {
    if (!pair) return;
    const [k, v] = pair.split('=');
    if (!k) return;
    query[decodeURIComponent(k)] = decodeURIComponent(v || '');
  });
  return query;
}

const handleH5ResetPasswordDeepLink = () => {
  // #ifdef H5
  try {
    const hash = window.location.hash || '';
    const search = window.location.search || '';

    const isResetPath = hash.startsWith('#/reset-password') || hash.startsWith('#/reset-password?');
    const hashQuery = hash.includes('?') ? hash.split('?')[1] : '';

    const query = isResetPath ? parseQuery(hashQuery) : parseQuery(search);
    const uid = query.uid || '';
    const token = query.token || '';

    if (uid && token && (isResetPath || (search.includes('uid=') && search.includes('token=')))) {
      const url = `/pages/auth/forgot?uid=${encodeURIComponent(uid)}&token=${encodeURIComponent(token)}`;
      uni.reLaunch({ url });
    }
  } catch (e) {
    // ignore
  }
  // #endif
}

const initAuthState = async () => {
  const userStore = useUserStore();
  if (!userStore.token) return;
  try {
    const me = await request({ url: '/api/users/me/', silent: true });
    userStore.setUserInfo(me as any);
  } catch (e: any) {
    // 只有明确的 401 (Unauthorized) 才清理登录态，网络错误等不清理
    const sc = Number(e?.statusCode || 0)
    if (sc === 401) {
      userStore.logout();
    }
  }
}

onLaunch(() => {
  console.log("App Launch");
  handleH5ResetPasswordDeepLink();
  initAuthState();
  
  // 初始化主题
  const savedTheme = uni.getStorageSync('theme') || 'light';
  applyTheme(savedTheme);
  
  // 监听主题切换事件
  uni.$on('menu:theme-change', (t: string) => {
    applyTheme(t);
  });
});

onShow(() => {
  console.log("App Show");
});

onHide(() => {
  console.log("App Hide");
});
</script>

<style>
/* 1. 全局变量定义 - 最高优先级 */
:root, html, body, page, .page, uni-page-body, .uni-body {
  --bg-color: #f4f5f7 !important;
  --card-bg: #ffffff !important;
  --text-color: #18191c !important;
  --text-muted: #9499a0 !important;
  --border-color: #f1f2f4 !important;
  --accent-color: #fb7299 !important;
}

/* 2. 深色模式变量强制覆盖 */
html[data-theme='dark'], 
html.dark-mode, 
body.dark-mode, 
.dark-mode, 
page.dark-mode, 
.page.dark, 
.dark, 
page.dark {
  --bg-color: #111111 !important;
  --card-bg: #1c1c1e !important;
  --text-color: #e3e5e7 !important;
  --text-muted: #7a7a7a !important;
  --border-color: #2c2c2e !important;
  --accent-color: #fb7299 !important;
}

/* 3. 强制背景和文字应用 */
html, body, page, .page, .uni-page-body, .uni-body, uni-page-body, .uni-page-wrapper, uni-page-wrapper {
  background-color: var(--bg-color) !important;
  color: var(--text-color) !important;
  transition: background-color 0.2s, color 0.2s;
}

/* 针对 uni-app H5 特殊容器的暴力覆盖 */
uni-app, uni-page, .uni-app--showtabbar uni-page-wrapper::after {
  background-color: var(--bg-color) !important;
}

/* 4. 原生 UI 组件适配 */
.uni-page-head {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}

.uni-tabbar, .uni-tabbar-border, uni-tabbar {
  background-color: var(--card-bg) !important;
  border-top-color: var(--border-color) !important;
}

.uni-tabbar__item {
  color: var(--text-muted) !important;
}

.uni-tabbar__item.uni-tabbar__item--active {
  color: var(--accent-color) !important;
}

/* 5. Vant 组件全局深度适配 */
html[data-theme='dark'] .van-nav-bar, .dark-mode .van-nav-bar, .dark .van-nav-bar { background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-nav-bar__title, .dark-mode .van-nav-bar__title, .dark .van-nav-bar__title { color: var(--text-color) !important; }
html[data-theme='dark'] .van-nav-bar .van-icon, .dark-mode .van-nav-bar .van-icon, .dark .van-nav-bar .van-icon { color: var(--text-color) !important; }
html[data-theme='dark'] .van-cell, .dark-mode .van-cell, .dark .van-cell { background-color: var(--card-bg) !important; color: var(--text-color) !important; }
html[data-theme='dark'] .van-cell__title, .dark-mode .van-cell__title, .dark .van-cell__title { color: var(--text-color) !important; }
html[data-theme='dark'] .van-cell__value, .dark-mode .van-cell__value, .dark .van-cell__value { color: var(--text-muted) !important; }

/* Vant Popup & ActionSheet 全局暗黑适配 */
.dark .van-popup, .dark .van-action-sheet,
.dark-mode .van-popup, .dark-mode .van-action-sheet,
[data-theme='dark'] .van-popup, [data-theme='dark'] .van-action-sheet {
  background-color: var(--card-bg) !important;
}

.dark .van-action-sheet__item, .dark .van-action-sheet__cancel,
.dark-mode .van-action-sheet__item, .dark-mode .van-action-sheet__cancel,
[data-theme='dark'] .van-action-sheet__item, [data-theme='dark'] .van-action-sheet__cancel {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}

.dark .van-action-sheet__description,
.dark-mode .van-action-sheet__description,
[data-theme='dark'] .van-action-sheet__description {
  background-color: var(--card-bg) !important;
  color: var(--text-muted) !important;
}

.dark .van-action-sheet__gap,
.dark-mode .van-action-sheet__gap,
[data-theme='dark'] .van-action-sheet__gap {
  background-color: var(--bg-color) !important;
}

.dark .van-picker, .dark .van-picker__toolbar,
.dark-mode .van-picker, .dark-mode .van-picker__toolbar,
[data-theme='dark'] .van-picker, [data-theme='dark'] .van-picker__toolbar {
  background-color: var(--card-bg) !important;
}

.dark .van-picker__title, .dark .van-picker-column__item,
.dark-mode .van-picker__title, .dark-mode .van-picker-column__item,
[data-theme='dark'] .van-picker__title, [data-theme='dark'] .van-picker-column__item {
  color: var(--text-color) !important;
}

html[data-theme='dark'] .van-cell-group, .dark-mode .van-cell-group { background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-field__control, .dark-mode .van-field__control { color: var(--text-color) !important; }
html[data-theme='dark'] .van-tabs__nav, .dark-mode .van-tabs__nav { background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-tab, .dark-mode .van-tab { color: var(--text-muted) !important; background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-tab--active, .dark-mode .van-tab--active { color: var(--accent-color) !important; font-weight: bold; }
html[data-theme='dark'] .van-popup, .dark-mode .van-popup { background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-picker, .dark-mode .van-picker { background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-picker__toolbar, .dark-mode .van-picker__toolbar { background-color: var(--card-bg) !important; }
html[data-theme='dark'] .van-picker-column__item, .dark-mode .van-picker-column__item { color: var(--text-color) !important; }
html[data-theme='dark'] .van-search, .dark-mode .van-search { background-color: transparent !important; }
html[data-theme='dark'] .van-search__content, .dark-mode .van-search__content { background-color: var(--bg-color) !important; }

/* 禁用原生滚动 */
/* #ifdef H5 */
html, body {
  width: 100%;
  height: 100%;
}

/* 允许特定页面滚动 */
html:not([data-scroll-enabled="true"]), 
body:not([data-scroll-enabled="true"]) {
  position: fixed;
  overscroll-behavior: none;
}
/* #endif */
</style>
