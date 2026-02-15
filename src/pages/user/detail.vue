<template>
  <view :class="['user-detail-container', theme]" v-if="userDetail">
    <view class="header">
      <image class="avatar" :src="formatImageUrl(userDetail)" mode="aspectFill" />
      <view class="meta">
        <text class="nickname">{{ userDetail.nickname || userDetail.username }}</text>
        <text class="username">ID: {{ userDetail.username }}</text>
      </view>
      <view v-if="!isMe" class="follow" @click="handleFollow">
        <van-button
          size="small"
          :type="isFollowing ? 'default' : 'primary'"
          round
          :loading="followLoading"
        >
          {{ isFollowing ? '已关注' : '+ 关注' }}
        </van-button>
      </view>
    </view>

    <view class="stats" v-if="userDetail">
      <view class="stat-item" @click="goToFollowing">
        <text class="count">{{ formatCount(userDetail.following_count || 0) }}</text>
        <text class="label">关注</text>
      </view>
      <view class="stat-item" @click="goToFollowers">
        <text class="count">{{ formatCount(userDetail.followers_count || 0) }}</text>
        <text class="label">粉丝</text>
      </view>
      <view class="stat-item">
        <text class="count">{{ formatCount(userDetail.likes_count || userDetail.liked_count || 0) }}</text>
        <text class="label">获赞</text>
      </view>
    </view>

    <view class="video-section">
      <view class="section-tabs">
        <text class="tab-item active">视频</text>
        <text class="tab-count">{{ formatCount(totalVideos) }}</text>
      </view>
      
      <view class="video-grid" v-if="videoList.length > 0">
        <view 
          v-for="video in videoList" 
          :key="video.id" 
          class="video-card"
          @click="goToDetail(video.id)"
        >
          <view class="cover-wrap">
            <image class="cover" :src="formatImageUrl(video)" mode="aspectFill" />
            <view class="play-count">
              <van-icon name="play-circle-o" color="#fff" size="12px" />
              <text class="count-text">{{ formatCount(video.view_count || 0) }}</text>
            </view>
          </view>
          <view class="video-info">
            <text class="video-title">{{ video.title }}</text>
            <text class="video-date">{{ formatDate(video.created_at) }}</text>
          </view>
        </view>
      </view>
      
      <view class="empty-state" v-else-if="!videoLoading">
        <van-empty image="search" description="TA 还没有发布过视频哦" />
      </view>

      <view class="loading-more" v-if="videoLoading">
        <van-loading size="20px">加载中...</van-loading>
      </view>
    </view>
  </view>

  <view v-else-if="loading" class="loading">
    <van-loading size="24px" color="#1989fa">加载中...</van-loading>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import { formatImageUrl } from '@/utils/image'

const userStore = useUserStore()
const theme = ref(uni.getStorageSync('theme') || 'light')

const onThemeChange = (t: string) => {
  theme.value = t
}

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const userId = ref('')
const userDetail = ref<any>(null)
const loading = ref(true)

const videoList = ref<any[]>([])
const videoPage = ref(1)
const videoLoading = ref(false)
const videoFinished = ref(false)
const totalVideos = ref(0)

const isFollowing = ref(false)
const followLoading = ref(false)

const isMe = computed(() => {
  const me = userStore.userInfo
  if (!me || !userId.value) return false
  return String(me.id) === String(userId.value)
})

const fetchUserDetail = async () => {
  if (!userId.value) return
  loading.value = true
  try {
    const res = await request({
      url: `/api/users/${encodeURIComponent(userId.value)}/`,
      noAuth: !userStore.isLoggedIn,
      silent: true,
    })
    userDetail.value = res
    
    // 如果已登录，获取关注关系
    if (userStore.isLoggedIn && !isMe.value) {
      try {
        const rel = await request({
          url: `/api/interactions/relationship/?user_id=${encodeURIComponent(userId.value)}`,
        })
        isFollowing.value = !!rel.following
      } catch (e) {}
    } else {
      isFollowing.value = Boolean(res?.is_following || res?.following)
    }
    
    fetchUserVideos(true)
  } catch (e) {
    userDetail.value = null
    uni.showToast({ title: '用户不存在或已删除', icon: 'none' })
  } finally {
    loading.value = false
    uni.stopPullDownRefresh()
  }
}

const fetchUserVideos = async (refresh = false) => {
  if (videoLoading.value || (videoFinished.value && !refresh)) return
  
  if (refresh) {
    videoPage.value = 1
    videoFinished.value = false
  }
  
  videoLoading.value = true
  try {
    const res = await request({
      url: `/api/videos/list/`,
      data: {
        user_id: userId.value,
        page: videoPage.value,
        page_size: 18
      },
      noAuth: true
    })
    
    const list = res.results || []
    totalVideos.value = res.total || 0
    videoList.value = refresh ? list : [...videoList.value, ...list]
    
    if (!res.next && !res.has_next) {
      videoFinished.value = true
    } else {
      videoPage.value++
    }
  } catch (err) {
    console.error('Fetch user videos error:', err)
  } finally {
    videoLoading.value = false
  }
}

const handleFollow = async () => {
  if (followLoading.value) return
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return
  }
  if (!userId.value || isMe.value) return

  followLoading.value = true
  try {
    const method = isFollowing.value ? 'unfollow' : 'follow'
    const res = await request({
      url: `/api/interactions/${method}/`,
      method: 'POST',
      data: { user_id: userId.value }
    })
    
    // Web 端返回逻辑：follow 返回 {following: true}, unfollow 返回 {following: false}
    isFollowing.value = !!res.following
    
    if (userDetail.value) {
      const prev = Number(userDetail.value.followers_count || 0)
      const next = isFollowing.value ? (prev + 1) : Math.max(0, prev - 1)
      userDetail.value.followers_count = next
    }
    
    uni.showToast({
      title: isFollowing.value ? '已关注' : '已取消关注',
      icon: 'none'
    })
  } catch (e) {
    console.error('Follow error:', e)
  } finally {
    followLoading.value = false
  }
}

const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/video/detail?id=${id}`
  })
}

const goToUser = (id: string) => {
  uni.navigateTo({ url: `/pages/user/detail?id=${id}` })
}

const goToFollowing = () => {
  if (!userId.value) return
  uni.navigateTo({ url: `/pages/user/following?id=${userId.value}` })
}

const goToFollowers = () => {
  if (!userId.value) return
  uni.navigateTo({ url: `/pages/user/followers?id=${userId.value}` })
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatCount = (count: number) => {
  const n = Number(count || 0)
  if (n < 1000) return String(n)
  if (n < 10000) return (n / 1000).toFixed(1) + 'k'
  return (n / 10000).toFixed(1) + 'w'
}

onLoad((options: any) => {
  uni.$on('menu:theme-change', onThemeChange)
  userId.value = String(options?.id || '')
  fetchUserDetail()
})

onPullDownRefresh(() => {
  fetchUserDetail()
})

onReachBottom(() => {
  fetchUserVideos()
})
</script>

<style scoped>
.user-detail-container {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  padding-top: var(--status-bar-height);
}

.header {
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 60rpx 32rpx 40rpx;
  background-color: var(--card-bg);
}

.avatar {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  border: 4rpx solid var(--border-color);
  background-color: var(--bg-color);
  flex-shrink: 0;
}

.meta {
  flex: 1;
  overflow: hidden;
}

.nickname {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-color);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.username {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-top: 12rpx;
  display: block;
}

.stats {
  display: flex;
  gap: 60rpx;
  padding: 20rpx 32rpx 40rpx;
  background-color: var(--card-bg);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.count {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-color);
}

.label {
  font-size: 24rpx;
  color: var(--text-muted);
}

.video-section {
  margin-top: 12rpx;
  background-color: var(--card-bg);
}

.section-tabs {
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  height: 88rpx;
  border-bottom: 1rpx solid var(--border-color);
}

.tab-item {
  font-size: 28rpx;
  color: var(--text-color);
  font-weight: 700;
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 4rpx;
  background-color: var(--accent-color);
  border-radius: 2rpx;
}

.tab-count {
  font-size: 22rpx;
  color: var(--text-muted);
  margin-left: 8rpx;
}

.video-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 16rpx;
}

.video-card {
  width: 50%;
  padding: 12rpx;
  box-sizing: border-box;
}

.cover-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16/10;
  background-color: var(--bg-color);
  border-radius: 12rpx;
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 100%;
}

.play-count {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  padding: 40rpx 12rpx 8rpx;
  background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%);
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.count-text {
  font-size: 22rpx;
  color: #fff;
}

.video-info {
  padding: 12rpx 4rpx 8rpx;
}

.video-title {
  font-size: 26rpx;
  color: var(--text-color);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  height: 72rpx;
  margin-bottom: 8rpx;
}

.video-date {
  font-size: 20rpx;
  color: var(--text-muted);
}

.empty-state {
  padding: 120rpx 0;
}

.loading-more {
  padding: 40rpx 0;
  display: flex;
  justify-content: center;
}

.loading {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color);
}
</style>
