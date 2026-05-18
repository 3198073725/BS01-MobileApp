# VidSprout Mobile App | 跨端视频社交新势力

VidSprout 移动端是基于 UniApp + Vue 3 打造的跨平台原生体验应用。它完美融合了高性能的视频渲染技术与灵活的移动端交互设计，让用户随时随地畅享 VidSprout。

## 📱 核心亮点

- **多端覆盖**: 一套代码同时适配 iOS、Android、H5 及各类小程序。
- **极致播放**: 深度优化原生视频组件，支持竖屏 Feed 流滑动切换，体验如丝般顺滑。
- **灵动 UI**: 基于 Vant Weapp 深度定制，完美还原 VidSprout 品牌视觉（#fb7299）。
- **智能主题**: 支持原生级深色模式切换，保护视力的同时也保持高颜值的交互界面。

## 🧩 功能矩阵

### 1. 移动交互中心 (Interaction)
- **瀑布流首页**: 智能推荐视频内容。
- **沉浸式发布**: 简洁高效的投稿流程，支持封面自动截取与预览。
- **消息通知**: 关注动态、互动点赞实时提醒。
- **热更新同步**: 启动拉取配置、系统事件推送、回到前台自动补拉。

### 2. 个性化空间 (Personal Space)
- **个人主页**: 展示个人作品、获赞数、关注/粉丝详情。
- **我的库**: 集成历史记录、我的收藏、稍后再看（支持离线缓存同步逻辑）。

### 3. 法律合规 (Legal)
- 内置深度定制的 **用户协议**、**隐私政策**、**开源许可** 页面，支持原生/H5 高性能滚动。

### 4. 系统状态控制 (System State)
- **维护模式**: `maintenance_mode` 开启后，H5 与原生 App 统一跳转维护页。
- **游客访问控制**: `allow_anonymous_view` 关闭后，未登录用户会被拦截到登录流程。

## 🛠 技术深度

- **开发框架**: [UniApp](https://zh.uniapp.dcloud.io/) (Vue 3 + TypeScript)
- **组件中心**: [Vant Weapp](https://vant-ui.github.io/vant-weapp/)
- **全局状态**: Pinia (持久化存储用户凭证)
- **样式方案**: 采用 CSS 变量 + 全局响应式布局。

## 📦 开发者指南

### 1. 环境依赖
- HBuilderX (推荐) 或 VS Code + 插件
- Node.js 16+

### 2. 本地调试
- 使用 HBuilderX 导入本项目。
- 运行 -> 运行到浏览器 -> H5 / 运行到手机或模拟器。

### 3. API 地址注入
- 开发环境可复制 `.env.development.example` 为 `.env.development`。
- 生产环境可复制 `.env.production.example` 为 `.env.production`。
- `VITE_APP_API_BASE` 用于给小程序 / App / H5 注入默认 API 地址。
- `VITE_DEV_API_ORIGIN` 用于 H5 本地开发代理目标；未填写时会回退到 `VITE_APP_API_BASE`。
- `VITE_DEV_ALLOWED_HOST` 用于本地开发时允许访问的 Host，默认 `mobile.bs01.local`。

开发示例：

```env
VITE_APP_API_BASE=http://192.168.1.50:8000
VITE_DEV_API_ORIGIN=http://127.0.0.1:8000
VITE_DEV_ALLOWED_HOST=mobile.bs01.local
```

生产示例：

```env
VITE_APP_API_BASE=https://api.example.com
VITE_DEV_ALLOWED_HOST=mobile.example.local
```

### 4. 注意事项
- **H5 滚动优化**: 针对 H5 端全局 `position:fixed` 锁定问题，已在法律协议等页面实现动态解锁机制。
- **环境配置**: 接口地址优先级为“用户手动填写 > `VITE_APP_API_BASE` > H5 当前域名推导/manifest 注入”。
- **配置生效时机**: 管理端修改系统配置后，移动端会通过系统事件和 `App onShow` 补拉共同保证同步；打包 App 也适用同一套逻辑。

## 🎨 视觉规范
- **品牌色**: `#fb7299`
- **图标库**: Lucide Icons + Vant 内置图标

---
*VidSprout Mobile - 灵动指尖，悦享视频*
