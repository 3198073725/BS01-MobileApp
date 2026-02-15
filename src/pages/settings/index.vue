<template>
  <view :class="['page', theme]">
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <van-icon name="arrow-left" size="20px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
      </view>
      <text class="nav-title">设置</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="group">
        <view class="group-title">账户与隐私</view>
        <van-cell-group :border="false" class="cell-group">
          <van-cell title="编辑资料" icon="edit" is-link @click="goEditProfile" />
          <van-cell title="主页可见性">
            <template #value>
              <picker :range="privacyOptions" range-key="label" @change="onPrivacyChange">
                <view class="picker-value">
                  <text>{{ privacyLabel }}</text>
                  <van-icon name="arrow" size="14px" :color="theme === 'dark' ? '#7a7a7a' : '#9499a0'" />
                </view>
              </picker>
            </template>
          </van-cell>
          <van-cell title="深色模式">
            <template #right-icon>
              <switch :checked="isDarkMode" @change="onDarkModeChange" color="#fb7299" size="20" />
            </template>
          </van-cell>
        </van-cell-group>
      </view>

      <view class="group">
        <view class="group-title">播放偏好</view>
        <van-cell-group :border="false" class="cell-group">
          <van-cell title="默认开启连播">
            <template #right-icon>
              <switch :checked="autoplay" @change="onAutoplayChange" color="#fb7299" size="20" />
            </template>
          </van-cell>
          <van-cell title="默认播放速度">
            <template #value>
              <picker :range="rateOptions" @change="onRateChange">
                <view class="picker-value">
                  <text>{{ playbackRate }}x</text>
                  <van-icon name="arrow" size="14px" :color="theme === 'dark' ? '#7a7a7a' : '#9499a0'" />
                </view>
              </picker>
            </template>
          </van-cell>
          <van-cell title="断点续播">
            <template #right-icon>
              <switch :checked="resumeEnabled" @change="onResumeChange" color="#fb7299" size="20" />
            </template>
          </van-cell>
        </van-cell-group>
      </view>

      <view class="group">
        <view class="group-title">通用设置</view>
        <van-cell-group :border="false" class="cell-group">
          <van-cell title="启动默认页">
            <template #value>
              <picker :range="startTabOptions" range-key="label" @change="onStartTabChange">
                <view class="picker-value">
                  <text>{{ startTabLabel }}</text>
                  <van-icon name="arrow" size="14px" :color="theme === 'dark' ? '#7a7a7a' : '#9499a0'" />
                </view>
              </picker>
            </template>
          </van-cell>
        </van-cell-group>
      </view>

      <view class="group">
        <view class="group-title">数据管理</view>
        <van-cell-group :border="false" class="cell-group">
          <van-cell title="清空搜索历史" is-link @click="clearSearchHistory" />
          <van-cell title="清空播放进度" is-link @click="clearResumeData" />
        </van-cell-group>
      </view>
      
      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import request from '@/utils/request'

const userStore = useUserStore()
const theme = ref(uni.getStorageSync('theme') || 'light')

const onThemeChange = (t: string) => {
  theme.value = t
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  loadSettings()
})

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

// 隐私
const privacyMode = ref('public')
const privacyOptions = [
  { value: 'public', label: '公开' },
  { value: 'friends_only', label: '仅好友可见' },
  { value: 'private', label: '私密' }
]
const privacyLabel = computed(() => privacyOptions.find(o => o.value === privacyMode.value)?.label || '公开')

// 播放偏好
const autoplay = ref(false)
const playbackRate = ref(1.0)
const rateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0]
const resumeEnabled = ref(true)
const isDarkMode = ref(false)

// 启动页
const startTab = ref('recommend')
const startTabOptions = [
  { value: 'recommend', label: '推荐' },
  { value: 'featured', label: '精选' },
  { value: 'following', label: '关注' }
]
const startTabLabel = computed(() => startTabOptions.find(o => o.value === startTab.value)?.label || '推荐')

const ensureLogin = () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return false
  }
  return true
}

const goBack = () => {
  uni.navigateBack()
}

const loadSettings = () => {
  // 从本地存储加载偏好设置
  autoplay.value = uni.getStorageSync('vp_autonext') === '1'
  const rate = parseFloat(uni.getStorageSync('vp_rate'))
  playbackRate.value = isNaN(rate) ? 1.0 : rate
  resumeEnabled.value = uni.getStorageSync('vp_resume') !== '0'
  startTab.value = uni.getStorageSync('home_default_tab') || 'recommend'
  isDarkMode.value = uni.getStorageSync('theme') === 'dark'
  
  if (userStore.userInfo) {
    privacyMode.value = userStore.userInfo.privacy_mode || 'public'
  }
}

onMounted(() => {
  loadSettings()
})

const goEditProfile = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/user/edit' })
}

const onPrivacyChange = async (e: any) => {
  const index = e.detail.value
  const mode = privacyOptions[index].value
  try {
    const res = await request({
      url: '/api/users/me/',
      method: 'PATCH',
      data: { privacy_mode: mode }
    })
    privacyMode.value = mode
    userStore.setUserInfo(res)
    uni.showToast({ title: '已更新', icon: 'none' })
  } catch (err) {}
}

const onAutoplayChange = (e: any) => {
  const val = e.detail.value
  autoplay.value = val
  uni.setStorageSync('vp_autonext', val ? '1' : '0')
}

const onRateChange = (e: any) => {
  const val = rateOptions[e.detail.value]
  playbackRate.value = val
  uni.setStorageSync('vp_rate', String(val))
}

const onResumeChange = (e: any) => {
  const val = e.detail.value
  resumeEnabled.value = val
  uni.setStorageSync('vp_resume', val ? '1' : '0')
}

const onStartTabChange = (e: any) => {
  const val = startTabOptions[e.detail.value].value
  startTab.value = val
  uni.setStorageSync('home_default_tab', val)
}

const onDarkModeChange = (e: any) => {
  const val = e.detail.value
  isDarkMode.value = val
  const newTheme = val ? 'dark' : 'light'
  uni.setStorageSync('theme', newTheme)
  // 发送全局事件通知主题变更
  uni.$emit('menu:theme-change', newTheme)
  
  // H5 平台特殊处理：直接给 body 增加类名以确保全局变量生效
  // #ifdef H5
  if (val) {
    document.body.classList.add('dark-mode')
  } else {
    document.body.classList.remove('dark-mode')
  }
  // #endif
  
  uni.showToast({ title: `已切换为${val ? '深色' : '浅色'}模式`, icon: 'none' })
}

const clearSearchHistory = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        uni.removeStorageSync('search_history')
        uni.showToast({ title: '已清空', icon: 'none' })
      }
    }
  })
}

const clearResumeData = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空所有播放进度记录吗？',
    success: (res) => {
      if (res.confirm) {
        const info = uni.getStorageInfoSync()
        info.keys.forEach(key => {
          if (key.startsWith('vp_pos:')) {
            uni.removeStorageSync(key)
          }
        })
        uni.showToast({ title: '已清空', icon: 'none' })
      }
    }
  })
}

const handleLogout = () => {
  if (!ensureLogin()) return
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    confirmColor: '#fa5151',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/auth/login' })
      }
    },
  })
}
</script>

<style scoped>
.page {
  height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.nav-bar {
  height: 88rpx;
  background-color: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
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
}

.group {
  padding: 24rpx 24rpx 0;
}

.group-title {
  font-size: 24rpx;
  color: var(--text-muted);
  padding: 0 12rpx 16rpx;
}

.cell-group {
  background-color: var(--card-bg) !important;
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.05);
}

/* 覆盖 van-cell 样式以适配深色模式 */
:deep(.van-cell) {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}

:deep(.van-cell__title) {
  color: var(--text-color) !important;
}

:deep(.van-cell__value) {
  color: var(--text-muted) !important;
}

.picker-value {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 28rpx;
  color: var(--text-color);
}

.logout-group {
  margin-top: 40rpx;
  padding-bottom: 60rpx;
}

.logout-title {
  color: #fa5151 !important;
  text-align: center;
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
