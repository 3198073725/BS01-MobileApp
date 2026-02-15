<template>
  <view :class="['page', theme]">
    <van-nav-bar title="开源许可" left-arrow @click-left="goBack" fixed placeholder :border="theme !== 'dark'" />

    <view class="content">
      <view class="legal-content">
        <view class="header-section">
          <text class="h1">VidSprout 开源许可</text>
          <view class="meta-tag">更新日期：2026-02-15</view>
        </view>

        <view class="card-section intro">
          <text class="p">VidSprout 项目包含多个仓库与组件。不同模块可能使用不同的开源许可协议。你在使用、复制、修改或分发相关代码前，应查看对应仓库中的 LICENSE 文件并遵守其条款。</text>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>一、正规许可参考</text>
          </view>
          <text class="p">你可以在以下官方/权威站点查看各类开源许可的完整文本：</text>

          <view class="link-card" @click="openUrl(links.opensourceMit)">
            <view class="link-left">
              <van-icon name="link" size="24px" color="#ed6a0c" />
            </view>
            <view class="link-right">
              <text class="link-title">MIT License (OSI)</text>
              <text class="link-url">{{ shortUrl(links.opensourceMit) }}</text>
            </view>
            <van-icon name="arrow" size="16px" color="#c8c9cc" />
          </view>

          <view class="link-card" @click="openUrl(links.spdxMit)">
            <view class="link-left">
              <van-icon name="link" size="24px" color="#ed6a0c" />
            </view>
            <view class="link-right">
              <text class="link-title">MIT License (SPDX)</text>
              <text class="link-url">{{ shortUrl(links.spdxMit) }}</text>
            </view>
            <van-icon name="arrow" size="16px" color="#c8c9cc" />
          </view>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>二、许可证以仓库为准</text>
          </view>
          <text class="p">如果你在 VidSprout 的某个仓库中看到 LICENSE 文件或 SPDX 标识（如 MIT、Apache-2.0、GPL-3.0 等），请以该仓库的声明为准。</text>
        </view>

        <view class="card-section contact">
          <text class="p">如需确认授权范围或商业使用，请联系：</text>
          <text class="email">{{ contactEmail }}</text>
        </view>
      </view>

      <view class="safe-bottom"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const theme = ref(uni.getStorageSync('theme') || 'light')
const contactEmail = 'mediacms@126.com'

const onThemeChange = (t: string) => {
  theme.value = t
}

const enableScroll = () => {
  // #ifdef H5
  document.documentElement.setAttribute('data-scroll-enabled', 'true')
  document.body.setAttribute('data-scroll-enabled', 'true')
  // #endif
}

const disableScroll = () => {
  // #ifdef H5
  document.documentElement.removeAttribute('data-scroll-enabled')
  document.body.removeAttribute('data-scroll-enabled')
  // #endif
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  enableScroll()
})

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
  disableScroll()
})

const links = {
  opensourceMit: 'https://opensource.org/license/mit/',
  spdxMit: 'https://spdx.org/licenses/MIT.html'
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

  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'none' })
    }
  })
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  display: block;
}

.content {
  width: 100%;
  min-height: 101vh;
}

.legal-content {
  padding: 40rpx 32rpx;
}

.header-section {
  text-align: center;
  margin-bottom: 48rpx;
}

.h1 {
  font-size: 48rpx;
  font-weight: 800;
  color: var(--text-color);
  display: block;
}

.meta-tag {
  display: inline-block;
  margin-top: 16rpx;
  padding: 6rpx 20rpx;
  background: rgba(237, 106, 12, 0.1);
  color: #ed6a0c;
  font-size: 24rpx;
  border-radius: 30rpx;
}

.card-section {
  background: var(--card-bg);
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
}

.card-section.intro {
  background: #ed6a0c;
}
.card-section.intro .p {
  color: #ffffff;
  opacity: 1;
}

.section-title {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-color);
}

.title-line {
  width: 8rpx;
  height: 32rpx;
  background: #ed6a0c;
  border-radius: 4rpx;
  margin-right: 16rpx;
}

.p {
  font-size: 28rpx;
  line-height: 1.8;
  color: var(--text-color);
  opacity: 0.9;
  text-align: justify;
}

.link-card {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background-color: var(--bg-color);
  border-radius: 16rpx;
  margin-top: 16rpx;
  border: 1rpx solid var(--border-color);
}

.link-left {
  width: 80rpx;
  height: 80rpx;
  background-color: rgba(237, 106, 12, 0.1);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.link-right {
  flex: 1;
  min-width: 0;
}

.link-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-color);
}

.link-url {
  display: block;
  font-size: 22rpx;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4rpx;
}

.card-section.contact {
  text-align: center;
  border: 2rpx dashed var(--border-color);
  background: transparent;
  box-shadow: none;
}

.email {
  display: block;
  margin-top: 8rpx;
  color: #ed6a0c;
  font-weight: 700;
  font-size: 32rpx;
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}

:deep(.van-nav-bar) {
  background-color: var(--card-bg) !important;
}
:deep(.van-nav-bar__title) {
  color: var(--text-color) !important;
}
:deep(.van-nav-bar .van-icon) {
  color: var(--text-color) !important;
}
</style>
