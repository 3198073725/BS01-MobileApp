<template>
  <view :class="['page', theme]">
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <van-icon name="arrow-left" size="20px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
      </view>
      <text class="nav-title">关于 VidSprout</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="hero">
        <image class="logo" src="/static/logo-1.png" mode="aspectFill" />
        <text class="app-name">VidSprout</text>
        <text class="app-desc">一个简单、清爽的视频平台</text>
        <text class="version">版本 {{ versionText }}</text> 
      </view>

      <van-cell-group inset :border="false" class="custom-group">
        <van-cell title="项目主页" icon="link-o" is-link @click="openUrl(urls.homepage)" :value="shortUrl(urls.homepage)" />
        <van-cell title="GitHub" icon="share-o" is-link @click="openUrl(urls.github)" :value="shortUrl(urls.github)" />
        <van-cell title="反馈邮箱" icon="envelop-o" is-link @click="copyText(urls.email, '邮箱已复制')" :value="urls.email" />
      </van-cell-group>

      <view class="spacer"></view>

      <van-cell-group inset :border="false" class="custom-group">
        <van-cell title="用户协议" icon="description" is-link @click="goTerms" />
        <van-cell title="隐私政策" icon="shield-o" is-link @click="goPrivacy" />
        <van-cell title="开源许可" icon="notes-o" is-link @click="goLicense" />
      </van-cell-group>

      <view class="footer">
        <text class="copyright">Copyright © {{ year }} VidSprout</text>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const theme = ref(uni.getStorageSync('theme') || 'light')

const onThemeChange = (t: string) => {
  theme.value = t
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
})

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const urls = {
  homepage: 'https://github.com/3198073725/BS01',
  github: 'https://github.com/3198073725',
  email: 'mediacms@126.com',
  terms: 'https://example.com/terms',
  privacy: 'https://example.com/privacy',
  license: 'https://example.com/license'
}

const year = new Date().getFullYear()

const versionText = computed(() => {
  try {
    const info = uni.getSystemInfoSync() as any
    const v = info?.appVersion || info?.version
    return v ? String(v) : '1.0.0'
  } catch {
    return '1.0.0'
  }
})

const goBack = () => {
  uni.navigateBack()
}

const copyText = (text: string, toastTitle: string) => {
  uni.setClipboardData({
    data: text,
    success: () => {
      uni.showToast({ title: toastTitle, icon: 'none' })
    }
  })
}

const shortUrl = (url: string) => {
  try {
    return url.replace(/^https?:\/\//i, '')
  } catch {
    return url
  }
}

const openUrl = (url: string) => {
  try {
    const p: any = (globalThis as any).plus
    if (p?.runtime?.openURL) {
      p.runtime.openURL(url)
      return
    }
  } catch {}

  try {
    const w: any = (globalThis as any).window
    if (w?.open) {
      w.open(url, '_blank')
      return
    }
  } catch {}

  copyText(url, '链接已复制')
}

const goTerms = () => {
  uni.navigateTo({ url: '/pages/legal/terms' })
}

const goPrivacy = () => {
  uni.navigateTo({ url: '/pages/legal/privacy' })
}

const goLicense = () => {
  uni.navigateTo({ url: '/pages/legal/license' })
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
}

.nav-bar {
  height: 88rpx;
  background-color: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  border-bottom: 1rpx solid var(--border-color);
  /* #ifdef APP-PLUS */
  padding-top: var(--status-bar-height);
  height: calc(88rpx + var(--status-bar-height));
  /* #endif */
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-color);
}

.back-btn, .placeholder {
  width: 80rpx;
}

.content {
  flex: 1;
  overflow: hidden;
}

.hero {
  padding: 48rpx 32rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo {
  width: 140rpx;
  height: 140rpx;
  border-radius: 28rpx;
  background-color: var(--card-bg);
}

.app-name {
  margin-top: 18rpx;
  font-size: 36rpx;
  font-weight: 700;
}

.app-desc {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: var(--text-muted);
}

.version {
  margin-top: 10rpx;
  font-size: 24rpx;
  color: var(--text-muted);
}

.spacer {
  height: 20rpx;
}

.custom-group {
  background-color: var(--card-bg) !important;
}

.footer {
  padding: 40rpx 32rpx 24rpx;
  display: flex;
  justify-content: center;
}

.copyright {
  font-size: 24rpx;
  color: var(--text-muted);
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}

:deep(.van-cell) {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}
:deep(.van-cell__title) {
  color: var(--text-color) !important;
}
:deep(.van-cell__value) {
  color: var(--text-muted) !important;
  font-size: 22rpx !important;
  max-width: 420rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
