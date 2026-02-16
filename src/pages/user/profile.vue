<template>
  <view :class="['profile-container', theme]">
    <scroll-view scroll-y class="body-scroll">
      <!-- 用户核心信息区 - 纯净白色 -->
      <view class="user-header-section" v-if="userStore.userInfo">
        <view class="top-ops">
          <view class="scan-btn" @click="handleScan">
            <van-icon name="scan" size="24px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
          </view>
        </view>
        <view class="user-main">
          <image
            class="avatar"
            :src="formatImageUrl(userStore.userInfo)"
            mode="aspectFill"
            @error="handleAvatarError"
            @click="handleAvatarClick"
          />
          <view class="user-info-content">
            <text class="nickname">{{ userStore.userInfo.nickname || userStore.userInfo.username }}</text>
            <text class="uid">ID: {{ userStore.userInfo.username }}</text>
          </view>
          <view class="edit-btn" @click="handleAvatarClick">
            <text>编辑资料</text>
          </view>
        </view>

        <!-- 社交数据统计 -->
        <view class="social-stats">
          <view class="stat-box">
            <text class="num">{{ profileStats.liked_count }}</text>
            <text class="label">获赞</text>
          </view>
          <view class="stat-box" @click="goToFollowing">
            <text class="num">{{ profileStats.following_count }}</text>
            <text class="label">关注</text>
          </view>
          <view class="stat-box" @click="goToFollowers">
            <text class="num">{{ profileStats.followers_count }}</text>
            <text class="label">粉丝</text>
          </view>
        </view>
      </view>

      <view class="user-header-section" v-else>
        <view class="user-main">
          <image
            class="avatar"
            src="/static/logo.png"
            mode="aspectFill"
            @click="goToLogin"
          />
          <view class="user-info-content">
            <text class="nickname">未登录</text>
            <text class="uid">点击登录后使用完整功能</text>
          </view>
          <view class="edit-btn" @click="goToLogin">
            <text>去登录</text>
          </view>
        </view>
      </view>

      <!-- 资产与功能导航 -->
      <view class="menu-list-container">
        <van-cell-group :border="false" class="custom-group">
          <van-cell title="我的视频" icon="video-o" is-link @click="goToMeWorks" />
          <van-cell title="我的收藏" icon="star-o" is-link @click="goToMeFavorites" />
          <van-cell title="点赞记录" icon="good-job-o" is-link @click="goToMeLikes" />
          <van-cell title="观看历史" icon="clock-o" is-link @click="goToMeHistory" />
          <van-cell title="稍后再看" icon="pause-circle-o" is-link @click="goToMeWatchLater" />
        </van-cell-group>

        <view class="spacer"></view>

        <van-cell-group :border="false" class="custom-group">
          <van-cell title="设置" icon="setting-o" is-link @click="goToSettings" />
          <van-cell title="API 地址" icon="link-o" is-link @click="goToApiSettings" />
          <van-cell title="关于 VidSprout" icon="info-o" is-link @click="goToAbout" />
        </van-cell-group>
      </view>

      <!-- 退出登录 - 极简文字 -->
      <view class="logout-wrapper" v-if="userStore.isLoggedIn">
        <text class="logout-text" @click="handleLogout">退出登录</text>
      </view>

      <view class="scroll-spacer"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatImageUrl } from '@/utils/image'
import request, { BASE_URL } from '@/utils/request'

const userStore = useUserStore()
const theme = ref(uni.getStorageSync('theme') || 'light')
const profileStats = ref({
  liked_count: 0,
  following_count: 0,
  followers_count: 0,
  video_count: 0
})

const onThemeChange = (t: string) => {
  theme.value = t
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  fetchProfileStats()
})

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const fetchProfileStats = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const res = await request({
      url: '/api/users/popup/stats/'
    })
    profileStats.value = {
      liked_count: res.likes_count || 0,
      following_count: res.following_count || 0,
      followers_count: res.followers_count || 0,
      video_count: res.my_works_count || 0
    }
  } catch (err) {
    console.error('Fetch profile stats error:', err)
  }
}

onShow(() => {
  fetchProfileStats()
})

const handleScan = () => {
  if (!ensureLogin()) return
  uni.scanCode({
    success: async (res) => {
      console.log('扫码结果：', res.result)
      const scanResult = res.result || ''
      
      // 解析 session 参数
      let session = ''
      if (scanResult.includes('session=')) {
        const parts = scanResult.split('session=')
        session = parts[1].split('&')[0]
      } else {
        // 如果二维码内容直接就是 session 字符串
        session = scanResult
      }

      if (!session) {
        uni.showToast({ title: '无效的登录二维码', icon: 'none' })
        return
      }

      uni.showLoading({ title: '确认登录中...' })
      try {
        await request({
          url: '/api/users/login/qr/confirm/',
          method: 'POST',
          data: { session }
        })
        uni.hideLoading()
        uni.showModal({
          title: '登录成功',
          content: 'Web端已同步登录',
          showCancel: false
        })
      } catch (err: any) {
        uni.hideLoading()
        const msg = err?.data?.detail || '登录确认失败'
        uni.showToast({ title: msg, icon: 'none' })
      }
    },
    fail: (err) => {
      console.error('扫码失败：', err)
    }
  })
}

const handleAvatarClick = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/user/edit' })
}

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/auth/login' })
}

const ensureLogin = () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return false
  }
  return true
}

const goToMeWorks = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/me/works' })
}

const goToMeFavorites = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/me/favorites' })
}

const goToMeLikes = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/me/likes' })
}

const goToMeHistory = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/me/history' })
}

const goToMeWatchLater = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/me/watch-later' })
}

const goToSettings = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: '/pages/settings/index' })
}

const goToAbout = () => {
  uni.navigateTo({ url: '/pages/about/index' })
}

const goToApiSettings = () => {
  uni.navigateTo({ url: '/pages/settings/api' })
}

const goToFollowing = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: `/pages/user/following?id=${userStore.userInfo?.id}` })
}

const goToFollowers = () => {
  if (!ensureLogin()) return
  uni.navigateTo({ url: `/pages/user/followers?id=${userStore.userInfo?.id}` })
}

const getAvatarUrl = (url?: string) => {
  if (!url) return '/static/logo.png'
  const base = BASE_URL.replace(/\/$/, '')
  // 如果是绝对路径
  if (/^https?:\/\//i.test(url)) return url
  // 统一去除开头的斜杠
  const rel = String(url).replace(/^\/+/, '')
  // 仿照 Web 端逻辑，确保包含 media/ 前缀
  const path = rel.startsWith('media/') ? rel : `media/${rel}`
  return `${base}/${path}`
}

const handleAvatarError = () => {
  if (userStore.userInfo) {
    userStore.userInfo.profile_picture = '/static/logo.png'
  }
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    confirmColor: '#fa5151',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.reLaunch({ url: '/pages/auth/login' })
      }
    }
  })
}
</script>

<style scoped>
.profile-container {
  height: 100vh;
  background-color: var(--bg-color);
  padding-top: var(--status-bar-height);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.body-scroll {
  flex: 1;
  overflow: hidden;
}

.scroll-spacer {
  height: 40rpx;
}

.user-header-section {
  background-color: var(--card-bg);
  padding: 20rpx 40rpx 52rpx;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
}

.top-ops {
  display: flex;
  justify-content: flex-end;
  padding-bottom: 20rpx;
}

.scan-btn {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-main {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}

.avatar {
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background-color: var(--bg-color);
  flex-shrink: 0;
  border: 1rpx solid var(--border-color);
}

.user-info-content {
  margin-left: 32rpx;
  flex: 1;
}

.nickname {
  font-size: 38rpx;
  font-weight: bold;
  color: var(--text-color);
  display: block;
}

.uid {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-top: 8rpx;
  display: block;
}

.edit-btn {
  padding: 12rpx 28rpx;
  background-color: var(--accent-color);
  border-radius: 32rpx;
  border: 1rpx solid var(--border-color);
}

.edit-btn text {
  font-size: 24rpx;
  color: #fff;
}

.social-stats {
  display: flex;
  justify-content: flex-start;
  gap: 72rpx;
  padding-left: 4rpx;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  min-width: 80rpx;
}

.num {
  font-size: 34rpx;
  font-weight: bold;
  color: var(--text-color);
}

.label {
  font-size: 24rpx;
  color: var(--text-muted);
}

.menu-list-container {
  margin-top: 20rpx;
  padding: 20rpx 24rpx;
}

.custom-group {
  background-color: var(--card-bg);
  border-radius: 18rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.05);
}

.spacer {
  height: 20rpx;
}

.logout-wrapper {
  margin-top: 36rpx;
  padding: 0 24rpx 100rpx;
}

.logout-text {
  display: block;
  text-align: center;
  padding: 26rpx 0;
  background-color: var(--card-bg);
  border-radius: 18rpx;
  box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.045);
  font-size: 28rpx;
  color: var(--text-color);
  font-weight: 600;
}
</style>
