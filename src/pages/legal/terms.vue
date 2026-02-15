<template>
  <view :class="['page', theme]">
    <van-nav-bar title="用户协议" left-arrow @click-left="goBack" fixed placeholder :border="theme !== 'dark'" />

    <view class="content">
      <view class="legal-content">
        <view class="header-section">
          <text class="h1">VidSprout 用户协议</text>
          <view class="meta-tag">生效日期：2026-02-15</view>
        </view>

        <view class="card-section intro">
          <text class="p">欢迎使用 VidSprout。本协议适用于你通过 VidSprout 移动端、Web 端及其他客户端访问与使用本服务的行为。你使用本服务即表示已阅读并同意本协议的全部条款。</text>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>一、账号与安全</text>
          </view>
          <text class="p">你应当提供真实、准确的注册信息并妥善保管账号凭证。因你自身原因导致账号、密码泄露或被他人使用造成的损失，由你自行承担。</text>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>二、内容发布规则</text>
          </view>
          <view class="p-group">
            <text class="p">你在本服务中发布、上传、评论、点幕、私信等行为应遵守适用法律法规，不得发布或传播违法、侵权、暴力、色情、诈骗、恶意营销等内容。</text>
            <text class="p">你应保证对所上传内容拥有合法权利或已取得必要授权；如因内容引发第三方主张权利或产生争议，你应独立承担相应责任。</text>
          </view>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>三、知识产权</text>
          </view>
          <text class="p">VidSprout 及其相关的产品形态、界面、程序、商标、标识等均受法律保护。未经许可，你不得复制、修改、传播、反向工程或用于任何商业用途。</text>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>四、违规处理</text>
          </view>
          <text class="p">如你违反本协议或相关规则，VidSprout 有权采取包括但不限于：内容删除/屏蔽、限制功能、暂停/终止账号使用、保存并向有关部门报告等措施。</text>
        </view>

        <view class="card-section">
          <view class="section-title">
            <view class="title-line"></view>
            <text>五、免责声明</text>
          </view>
          <text class="p">用户内容由用户自行提供并独立承担责任。VidSprout 将基于法律法规与平台规则进行必要管理，但不对用户内容的真实性、合法性、准确性作出保证。</text>
        </view>

        <view class="card-section contact">
          <text class="p">如对本协议有疑问，可通过邮箱联系我们：</text>
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
  background: rgba(251, 114, 153, 0.1);
  color: #fb7299;
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
  background: #fb7299;
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
  background: #fb7299;
  border-radius: 4rpx;
  margin-right: 16rpx;
}

.p-group {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
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
  color: #fb7299;
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
