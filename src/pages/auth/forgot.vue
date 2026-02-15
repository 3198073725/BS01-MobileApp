<template>
  <view :class="['forgot-container', theme]">
    <view class="content">
      <view class="forgot-type-tabs">
        <text
          class="tab-item"
          :class="{ active: mode === 'request' }"
          @click="mode = 'request'"
        >发送重置邮件</text>
        <text
          class="tab-item"
          :class="{ active: mode === 'confirm' }"
          @click="mode = 'confirm'"
        >设置新密码</text>
      </view>

      <view class="card">
        <template v-if="mode === 'request'">
          <view class="input-item">
            <text class="label">邮箱</text>
            <van-field
              v-model="email"
              placeholder="请输入注册邮箱"
              :border="false"
              class="custom-field"
            />
          </view>

          <van-button
            type="primary"
            block
            round
            :loading="sending"
            class="primary-btn"
            @click="handleSendReset"
          >
            发送重置邮件
          </van-button>

          <view class="tip">
            <text>若邮箱存在，我们会发送一封重置邮件（请查看垃圾箱）。</text>
          </view>
        </template>

        <template v-else>
          <view class="input-item">
            <text class="label">UID</text>
            <van-field
              v-model="uid"
              placeholder="从邮件链接中复制 uid"
              :border="false"
              class="custom-field"
            />
          </view>

          <view class="input-item">
            <text class="label">Token</text>
            <van-field
              v-model="token"
              placeholder="从邮件链接中复制 token"
              :border="false"
              class="custom-field"
            />
          </view>

          <view class="input-item">
            <text class="label">新密码</text>
            <van-field
              v-model="newPassword"
              type="password"
              placeholder="请输入新密码"
              :border="false"
              class="custom-field"
            />
          </view>

          <view class="input-item">
            <text class="label">确认新密码</text>
            <van-field
              v-model="confirmPassword"
              type="password"
              placeholder="请再次输入新密码"
              :border="false"
              class="custom-field"
            />
          </view>

          <van-button
            type="primary"
            block
            round
            :loading="submitting"
            class="primary-btn"
            @click="handleConfirmReset"
          >
            重置密码
          </van-button>

          <view class="tip">
            <text>邮件链接中包含 uid 与 token，粘贴后即可在此完成重置。</text>
          </view>
        </template>
      </view>

      <view class="footer-links">
        <text class="link gray" @click="goBack">返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request from '@/utils/request'

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

const mode = ref<'request' | 'confirm'>('request')
const email = ref('')
const uid = ref('')
const token = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const sending = ref(false)
const submitting = ref(false)

onLoad((options) => {
  if (options?.uid) uid.value = String(options.uid)
  if (options?.token) token.value = String(options.token)
  if (uid.value && token.value) mode.value = 'confirm'
})

const handleSendReset = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
    return uni.showToast({ title: '请输入有效的邮箱', icon: 'none' })
  }

  sending.value = true
  try {
    await request({
      url: '/api/users/password-reset/request/',
      method: 'POST',
      data: { email: email.value.trim() },
      noAuth: true
    })
    uni.showToast({ title: '已发送，请查收邮件', icon: 'success' })
  } catch (err) {
  } finally {
    sending.value = false
  }
}

const handleConfirmReset = async () => {
  if (!uid.value.trim() || !token.value.trim()) {
    return uni.showToast({ title: '请填写 uid 和 token', icon: 'none' })
  }
  if (!newPassword.value || !confirmPassword.value) {
    return uni.showToast({ title: '请填写两次新密码', icon: 'none' })
  }
  if (newPassword.value !== confirmPassword.value) {
    return uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
  }

  submitting.value = true
  try {
    await request({
      url: '/api/users/password-reset/confirm/',
      method: 'POST',
      data: {
        uid: uid.value.trim(),
        token: token.value.trim(),
        new_password: newPassword.value
      },
      noAuth: true
    })
    uni.showToast({ title: '重置成功，请登录', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1200)
  } catch (err) {
  } finally {
    submitting.value = false
  }
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.forgot-container {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding: 0 40rpx;
}

.content {
  padding-top: calc(var(--status-bar-height) + 60rpx);
}

.header {
  margin-bottom: 56rpx;
}

.title {
  font-size: 52rpx;
  font-weight: 700;
  color: var(--text-color);
  display: block;
}

.subtitle {
  font-size: 26rpx;
  color: var(--text-muted);
  margin-top: 14rpx;
  display: block;
}

.forgot-type-tabs {
  display: flex;
  gap: 40rpx;
  margin-bottom: 32rpx;
  padding: 0 10rpx;
}

.tab-item {
  font-size: 30rpx;
  color: var(--text-muted);
  position: relative;
  padding-bottom: 12rpx;
  transition: all 0.2s;
}

.tab-item.active {
  color: var(--text-color);
  font-weight: 700;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: var(--accent-color);
  border-radius: 4rpx;
}

.card {
  background-color: var(--card-bg);
  border-radius: 20rpx;
  padding: 44rpx 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.06);
}

.section {
  margin-bottom: 10rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
  display: block;
  margin-bottom: 26rpx;
}

.input-item {
  margin-bottom: 28rpx;
}

.label {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 14rpx;
  display: block;
}

.custom-field {
  background-color: var(--bg-color) !important;
  border-radius: 14rpx !important;
  padding: 20rpx 22rpx !important;
}

:deep(.custom-field .van-field__control) {
  color: var(--text-color) !important;
}

.primary-btn {
  height: 92rpx !important;
  font-size: 32rpx !important;
  font-weight: 700 !important;
}

.tip {
  margin-top: 18rpx;
  padding: 0 6rpx;
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 1.6;
}

.footer-links {
  display: flex;
  justify-content: center;
  margin-top: 32rpx;
}

.link {
  font-size: 26rpx;
  color: var(--accent-color);
  font-weight: 600;
}

.link.gray {
  color: var(--text-muted);
}
</style>
