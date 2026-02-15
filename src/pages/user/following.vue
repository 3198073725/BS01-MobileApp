<template>
  <view :class="['page', theme]">
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <van-icon name="arrow-left" size="20px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
      </view>
      <text class="nav-title">关注列表</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view scroll-y class="list-scroll" @scrolltolower="onReachBottom">
      <view class="user-list" v-if="userList.length > 0">
        <view v-for="user in userList" :key="user.id" class="user-item" @click="goToUser(user.id)">
          <image class="avatar" :src="formatImageUrl(user)" mode="aspectFill" />
          <view class="info">
            <text class="nickname">{{ user.nickname || user.username }}</text>
            <text class="bio">{{ user.bio || '这个人很懒，什么都没有写' }}</text>
          </view>
          <view v-if="userStore.userInfo && String(user.id) !== String(userStore.userInfo.id)" 
                class="follow-btn" 
                :class="{ followed: user.is_following }"
                @click.stop="handleFollow(user)">
            <text class="follow-text">{{ user.is_following ? '已关注' : '关注' }}</text>
          </view>
        </view>
      </view>

      <view class="status">
        <van-loading v-if="loading" size="20px">加载中...</van-loading>
        <view v-else-if="finished && userList.length === 0" class="empty-wrap">
          <van-empty description="暂无关注" />
        </view>
        <text v-else-if="finished" class="done">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'
import { formatImageUrl } from '@/utils/image'

const userStore = useUserStore()
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
const userId = ref('')
const userList = ref<any[]>([])
const page = ref(1)
const loading = ref(false)
const finished = ref(false)

const fetchList = async (refresh = false) => {
  if (loading.value || (finished.value && !refresh)) return
  
  if (refresh) {
    page.value = 1
    finished.value = false
  }

  loading.value = true
  try {
    const res = await request({
      url: `/api/interactions/following/`,
      data: {
        user_id: userId.value,
        page: page.value,
        page_size: 20
      },
      noAuth: true
    })
    
    const list = res.results || []
    userList.value = refresh ? list : [...userList.value, ...list]
    
    if (!res.next) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (err) {
    console.error('Fetch following error:', err)
  } finally {
    loading.value = false
  }
}

const handleFollow = async (user: any) => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  try {
    const method = user.is_following ? 'unfollow' : 'follow'
    const res = await request({
      url: `/api/interactions/${method}/`,
      method: 'POST',
      data: { user_id: user.id }
    })
    user.is_following = !!res.following
    uni.showToast({
      title: user.is_following ? '已关注' : '已取消关注',
      icon: 'none'
    })
  } catch (err) {}
}

const goToUser = (id: string) => {
  uni.navigateTo({ url: `/pages/user/detail?id=${id}` })
}

const goBack = () => {
  uni.navigateBack()
}

const onReachBottom = () => {
  fetchList()
}

onLoad((options: any) => {
  userId.value = options.id || userStore.userInfo?.id
  fetchList(true)
})
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--bg-color);
  color: var(--text-color);
}

.nav-bar {
  position: sticky;
  top: 0;
  z-index: 100;
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
  border-bottom: 1rpx solid var(--border-color);
}

.back-btn {
  width: 80rpx;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-color);
}

.placeholder {
  width: 80rpx;
}

.list-scroll {
  flex: 1;
}

.user-list {
  padding: 0 24rpx;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background-color: var(--bg-color);
  flex-shrink: 0;
}

.info {
  flex: 1;
  margin-left: 24rpx;
  margin-right: 20rpx;
  overflow: hidden;
}

.nickname {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
  display: block;
  margin-bottom: 8rpx;
}

.bio {
  font-size: 24rpx;
  color: var(--text-muted);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.follow-btn {
  width: 140rpx;
  height: 60rpx;
  background-color: var(--accent-color);
  border-radius: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.follow-btn.followed {
  background-color: var(--bg-color);
}

.follow-text {
  font-size: 24rpx;
  color: #fff;
}

.followed .follow-text {
  color: var(--text-muted);
}

.status {
  padding: 40rpx 0;
  text-align: center;
}

.done {
  font-size: 24rpx;
  color: var(--text-muted);
}
</style>
