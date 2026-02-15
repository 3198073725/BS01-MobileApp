<template>
  <view :class="['login-container', theme]">
    <view class="content">
      <view class="login-type-tabs">
        <text 
          class="tab-item" 
          :class="{ active: loginType === 'password' }"
          @click="loginType = 'password'"
        >密码登录</text>
        <text 
          class="tab-item" 
          :class="{ active: loginType === 'captcha' }"
          @click="loginType = 'captcha'"
        >验证码登录</text>
      </view>

      <view class="login-form">
        <!-- 密码登录表单 -->
        <template v-if="loginType === 'password'">
          <view class="input-item">
            <text class="label">用户名</text>
            <van-field
              v-model="username"
              placeholder="请输入用户名"
              :border="false"
              class="custom-field"
            />
          </view>
          
          <view class="input-item">
            <text class="label">密码</text>
            <van-field
              v-model="password"
              type="password"
              placeholder="请输入密码"
              :border="false"
              class="custom-field"
            />
          </view>
        </template>

        <!-- 验证码登录表单 -->
        <template v-else>
          <view class="login-tip">未注册邮箱验证后将自动登录</view>
          <view class="input-item">
            <text class="label">邮箱</text>
            <van-field
              v-model="email"
              placeholder="请输入电子邮箱"
              :border="false"
              class="custom-field"
            />
          </view>
          
          <view class="input-item">
            <text class="label">验证码</text>
            <view class="captcha-row">
              <van-field
                v-model="captcha"
                placeholder="请输入验证码"
                :border="false"
                class="custom-field captcha-field"
              />
              <van-button 
                size="small" 
                class="send-btn"
                :disabled="!!timer || !email.trim()"
                @click="handleSendCaptcha"
              >
                {{ timer ? `${countdown}s 后重发` : '获取验证码' }}
              </van-button>
            </view>
          </view>
        </template>

        <view class="actions">
          <van-button 
            type="primary" 
            block 
            round 
            @click="handleLogin" 
            :loading="loading"
            class="submit-btn"
          >
            进入系统
          </van-button>
          
          <view class="footer-links">
            <text class="link gray" @click="goToForgot">找回密码</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

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

const username = ref('')
const password = ref('')
const loginType = ref<'password' | 'captcha'>('password')
const email = ref('')
const captcha = ref('')
const loading = ref(false)
const timer = ref<any>(null)
const countdown = ref(60)
const userStore = useUserStore()

const handleSendCaptcha = async () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
    return uni.showToast({ title: '请输入有效的邮箱', icon: 'none' })
  }

  try {
    await request({
      url: '/api/users/login/send-code/', // 修正为后端实际接口路径
      method: 'POST',
      data: { email: email.value.trim() },
      noAuth: true
    })
    uni.showToast({ title: '验证码已发送', icon: 'success' })
    
    // 启动倒计时
    countdown.value = 60
    timer.value = setInterval(() => {
      if (countdown.value > 0) {
        countdown.value--
      } else {
        clearInterval(timer.value)
        timer.value = null
      }
    }, 1000)
  } catch (err) {}
}

const handleLogin = async () => {
  if (loginType.value === 'password') {
    // 账号密码登录验证
    if (!username.value.trim()) {
      return uni.showToast({ title: '请输入用户名', icon: 'none' })
    }
    if (!password.value) {
      return uni.showToast({ title: '请输入密码', icon: 'none' })
    }
  } else {
    // 验证码登录验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.value.trim() || !emailRegex.test(email.value.trim())) {
      return uni.showToast({ title: '请输入有效的邮箱', icon: 'none' })
    }
    if (!captcha.value.trim()) {
      return uni.showToast({ title: '请输入验证码', icon: 'none' })
    }
  }

  loading.value = true
  try {
    const loginData: any = {
      login_type: loginType.value
    }
    
    if (loginType.value === 'password') {
      loginData.username = username.value.trim()
      loginData.password = password.value
    } else {
      loginData.email = email.value.trim()
      loginData.code = captcha.value.trim() // 修正参数名为 code
    }

    const res = await request({
      url: loginType.value === 'password' ? '/api/token/' : '/api/users/login/with-code/', 
      method: 'POST',
      data: loginData,
      noAuth: true
    })
    
    if (res.access) {
      userStore.setToken(res.access)
      // 获取用户信息
      const userInfo = await request({ url: '/api/users/me/' })
      userStore.setUserInfo(userInfo)
      
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 1500)
    } else {
      uni.showToast({ title: '登录失败，请重试', icon: 'none' })
    }
  } catch (err: any) {
    console.error('Login error:', err)
  } finally {
    loading.value = false
  }
}

const goToForgot = () => {
  uni.navigateTo({ url: '/pages/auth/forgot' })
}
</script>

<style scoped>
.login-container {
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
  letter-spacing: 0.5rpx;
}

.subtitle {
  font-size: 26rpx;
  color: var(--text-muted);
  margin-top: 14rpx;
  display: block;
}

.login-type-tabs {
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

.login-tip {
  font-size: 22rpx;
  color: var(--text-muted);
  margin-bottom: 24rpx;
  padding: 0 10rpx;
}

.login-form {
  background-color: var(--card-bg);
  border-radius: 20rpx;
  padding: 44rpx 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.06);
}

.input-item {
  margin-bottom: 30rpx;
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

.captcha-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.captcha-field {
  flex: 1;
}

.send-btn {
  height: 84rpx !important;
  min-width: 180rpx !important;
  border-radius: 14rpx !important;
  font-size: 24rpx !important;
  background-color: var(--bg-color) !important;
  border: none !important;
  color: var(--accent-color) !important;
}

.send-btn[disabled] {
  color: var(--text-muted) !important;
  background-color: var(--border-color) !important;
}

.actions {
  margin-top: 44rpx;
}

.submit-btn {
  height: 92rpx !important;
  font-size: 32rpx !important;
  font-weight: 700 !important;
}

.footer-links {
  display: flex;
  justify-content: space-between;
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
