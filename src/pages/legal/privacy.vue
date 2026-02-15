<template>
  <view :class="['page', theme]">
    <van-nav-bar title="隐私政策" left-arrow @click-left="goBack" fixed placeholder :border="theme !== 'dark'" />

    <view class="content">
      <view class="legal-content">
        <view class="header-section">
          <text class="h1">VidSprout 隐私政策</text>
          <view class="meta-tag">生效日期：2026-02-15</view>
        </view>

        <view class="card-section intro">
          <text class="p">我们非常重视你的个人信息与隐私保护。本政策说明我们在你使用 VidSprout 服务时，如何收集、使用、存储与保护你的个人信息，以及你如何管理你的信息。</text>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>一、我们收集的信息</text>
          </view>
          <text class="p">为向你提供服务，我们可能会收集：</text>
          <view class="sub-p-wrap">
            <text class="sub-p">● 账号信息：用户名、昵称、头像等。</text>
            <text class="sub-p">● 内容互动：发布的视频、评论、点赞、收藏、稍后再看、观看历史等数据。</text>
            <text class="sub-p">● 设备日志：设备型号、系统版本、网络信息、操作日志、错误日志等。</text>
          </view>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>二、我们如何使用信息</text>
          </view>
          <view class="sub-p-wrap">
            <text class="sub-p">● 提供与维护登录、视频上传、内容展示、通知与互动等核心功能。</text>
            <text class="sub-p">● 安全保障与风控，如识别异常登录、反作弊、内容治理等。</text>
            <text class="sub-p">● 统计分析以改进产品体验，尽可能采用去标识化处理。</text>
          </view>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>三、信息存储与保护</text>
          </view>
          <text class="p">我们会采取合理的安全措施保护信息安全。你的账号登录凭证（如 Token）会保存在你的设备本地存储中，请妥善保管。</text>
        </view>

        <view class="card-section contact">
          <text class="p">如对本政策有疑问，可通过邮箱联系我们：</text>
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
  background: rgba(7, 193, 96, 0.1);
  color: #07c160;
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
  background: #07c160;
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
  background: #07c160;
  border-radius: 4rpx;
  margin-right: 16rpx;
}

.sub-p-wrap {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding-left: 24rpx;
  margin-top: 16rpx;
}

.sub-p {
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-color);
  opacity: 0.8;
}

.p {
  font-size: 28rpx;
  line-height: 1.8;
  color: var(--text-color);
  opacity: 0.9;
  text-align: justify;
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
  color: #07c160;
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
