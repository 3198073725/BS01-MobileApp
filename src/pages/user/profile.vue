<template>
  <view :class="['profile-container', theme]">
    <scroll-view scroll-y class="body-scroll">
      <!-- 用户核心信息区 - 纯净白色 -->
      <view class="user-header-section">
        <view class="top-ops">
          <view class="scan-btn" @click="handleScan">
            <van-icon v-if="userStore.isLoggedIn" name="scan" size="24px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
          </view>
        </view>
        <view class="user-main">
          <image
            v-if="userStore.userInfo"
            class="avatar"
            :src="avatarSrc"
            mode="aspectFill"
            @error="handleAvatarError"
            @longpress="handleAvatarLongPress"
            @click="handleAvatarClick"
          />
          <image v-else class="avatar" src="/static/logo.png" mode="aspectFill" @click="goToLogin" />
          <view class="user-info-content">
            <text class="nickname">{{ userStore.userInfo?.nickname || userStore.userInfo?.username || '未登录' }}</text>
            <text class="uid">{{ userStore.userInfo?.username ? `ID: ${userStore.userInfo.username}` : '点击登录后使用完整功能' }}</text>
          </view>
          <view class="edit-btn" @click="userStore.isLoggedIn ? handleAvatarClick() : goToLogin()">
            <text>{{ userStore.isLoggedIn ? '编辑资料' : '去登录' }}</text>
          </view>
        </view>

        <!-- 社交数据统计 -->
        <view class="social-stats">
          <view class="stat-box">
            <text class="num">{{ userStore.isLoggedIn ? profileStats.liked_count : 0 }}</text>
            <text class="label">获赞</text>
          </view>
          <view class="stat-box" @click="goToFollowing">
            <text class="num">{{ userStore.isLoggedIn ? profileStats.following_count : 0 }}</text>
            <text class="label">关注</text>
          </view>
          <view class="stat-box" @click="goToFollowers">
            <text class="num">{{ userStore.isLoggedIn ? profileStats.followers_count : 0 }}</text>
            <text class="label">粉丝</text>
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
          <van-cell v-if="showApiBase" title="API 地址" icon="link-o" is-link @click="goToApiSettings" />
          <van-cell title="关于 VidSprout" icon="info-o" is-link @click="goToAbout" />
        </van-cell-group>
      </view>

      <!-- 退出登录 - 极简文字 -->
      <view class="logout-wrapper" v-if="userStore.isLoggedIn">
        <text class="logout-text" @click="handleLogout">退出登录</text>
      </view>

      <view class="scroll-spacer"></view>
    </scroll-view>

    <van-popup v-model:show="showLoginPopup" round :close-on-click-overlay="true">
      <view class="login-popup">
        <view class="login-popup__icon">
          <van-icon name="lock" size="22px" color="#ffffff" />
        </view>
        <text class="login-popup__title">需要登录</text>
        <text class="login-popup__desc">登录后才能使用{{ loginPopupFeatureLabel }}</text>
        <view class="login-popup__actions">
          <van-button block plain round type="default" class="login-popup__btn" @click="onLoginPopupCancel">先看看</van-button>
          <van-button block round type="primary" class="login-popup__btn" @click="onLoginPopupConfirm">去登录</van-button>
        </view>
      </view>
    </van-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useConfigStore } from '@/store/config'
import { formatImageUrl } from '@/utils/image'
import request from '@/utils/request'

const userStore = useUserStore()
const configStore = useConfigStore()

const showApiBase = computed(() => configStore.get('show_api_base', true))
const theme = ref(uni.getStorageSync('theme') || 'light')
const avatarNonce = ref(Date.now())
const avatarSrc = computed(() => {
  const raw = formatImageUrl(userStore.userInfo)
  const sep = raw.includes('?') ? '&' : '?' 
  return `${raw}${sep}t=${avatarNonce.value}`
})

watch(
  () => {
    const u: any = userStore.userInfo as any
    return `${u?.profile_picture || ''}|${u?.avatar_url || ''}`
  },
  () => { avatarNonce.value = Date.now() },
  { immediate: true }
)
const profileStats = ref({
  liked_count: 0,
  following_count: 0,
  followers_count: 0,
  video_count: 0
})

const onThemeChange = (t: string) => {
  theme.value = t
}

const showLoginPopup = ref(false)
const loginPopupFeatureLabel = ref('')

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

const fetchMe = async () => {
  if (!userStore.isLoggedIn) return
  try {
    const res = await request({ url: '/api/users/me/', silent: true })
    if (res) userStore.setUserInfo(res)
  } catch { }
}

onShow(() => {
  fetchMe()
  fetchProfileStats()
  avatarNonce.value = Date.now()
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

const handleAvatarLongPress = () => {
  try {
    const url = String(avatarSrc.value || '')
    if (!url) return
    uni.setClipboardData({
      data: url,
      success: () => {
        uni.showModal({
          title: '头像地址已复制',
          content: url,
          showCancel: false,
        })
      },
      fail: () => {
        uni.showModal({
          title: '头像地址',
          content: url,
          showCancel: false,
        })
      }
    })
  } catch { }
}

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/auth/login' })
}

const ensureLogin = (featureLabel = '该功能') => {
  if (userStore.isLoggedIn) return true
  loginPopupFeatureLabel.value = featureLabel
  showLoginPopup.value = true
  return false
}

const onLoginPopupCancel = () => {
  showLoginPopup.value = false
}

const onLoginPopupConfirm = () => {
  showLoginPopup.value = false
  goToLogin()
}

const goToMeWorks = () => {
  if (!ensureLogin('我的视频')) return
  uni.navigateTo({ url: '/pages/me/works' })
}

const goToMeFavorites = () => {
  if (!ensureLogin('我的收藏')) return
  uni.navigateTo({ url: '/pages/me/favorites' })
}

const goToMeLikes = () => {
  if (!ensureLogin('点赞记录')) return
  uni.navigateTo({ url: '/pages/me/likes' })
}

const goToMeHistory = () => {
  if (!ensureLogin('观看历史')) return
  uni.navigateTo({ url: '/pages/me/history' })
}

const goToMeWatchLater = () => {
  if (!ensureLogin('稍后再看')) return
  uni.navigateTo({ url: '/pages/me/watch-later' })
}

const goToSettings = () => {
  if (!ensureLogin('设置')) return
  uni.navigateTo({ url: '/pages/settings/index' })
}

const goToAbout = () => {
  uni.navigateTo({ url: '/pages/about/index' })
}

const goToApiSettings = () => {
  uni.navigateTo({ url: '/pages/settings/api' })
}

const goToFollowing = () => {
  if (!ensureLogin('关注')) return
  uni.navigateTo({ url: `/pages/user/following?id=${userStore.userInfo?.id}` })
}

const goToFollowers = () => {
  if (!ensureLogin('粉丝')) return
  uni.navigateTo({ url: `/pages/user/followers?id=${userStore.userInfo?.id}` })
}

const handleAvatarError = () => {
  // 不在这里覆盖 userInfo 字段，避免把真实头像路径抹掉（影响刷新与排查）
}

const handleLogout = () => {
  uni.showModal({
    title: '提示',
    content: '确定要退出登录吗？',
    confirmColor: '#fa5151',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.switchTab({ url: '/pages/index/index' })
      }
    }
  })
}
</script>

<style scoped>
.login-popup {
  width: 620rpx;
  padding: 40rpx 36rpx 32rpx;
  box-sizing: border-box;
  background-color: var(--card-bg);
}

.login-popup__icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #1989fa, #4facfe);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6rpx auto 22rpx;
}

.login-popup__title {
  display: block;
  text-align: center;
  font-size: 34rpx;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 14rpx;
}

.login-popup__desc {
  display: block;
  text-align: center;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 28rpx;
}

.login-popup__actions {
  display: flex;
  gap: 18rpx;
}

.login-popup__btn {
  flex: 1;
}

:deep(.van-popup) {
  background: transparent;
}

:deep(.van-button) {
  height: 80rpx;
}

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
  border-radius: 40rpx;
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
  justify-content: space-between;
  width: 100%;
}

.stat-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
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
