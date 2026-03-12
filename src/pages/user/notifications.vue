<template>
  <view :class="['page', theme]">
    <view class="nav-bar">
      <view class="nav-left"></view>
      <text class="nav-title">消息</text>
      <view class="nav-right" @click="showActionSheet = true">
        <van-icon name="ellipsis" size="20px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
      </view>
    </view>

    <van-action-sheet
      v-model:show="showActionSheet"
      :actions="actionActions"
      cancel-text="取消"
      close-on-click-action
      @select="onActionSelect"
    />

    <view class="notif-categories">
      <view class="cat-item" @click="activeTab = 'comment'">
        <view class="icon-wrap blue">
          <van-icon name="comment-o" size="24px" color="#fff" />
        </view>
        <text :class="['cat-label', activeTab === 'comment' ? 'active' : '']">回复我的</text>
      </view>
      <view class="cat-item" @click="activeTab = 'like'">
        <view class="icon-wrap red">
          <van-icon name="good-job-o" size="24px" color="#fff" />
        </view>
        <text :class="['cat-label', activeTab === 'like' ? 'active' : '']">收到的赞</text>
      </view>
      <view class="cat-item" @click="activeTab = 'system'">
        <view class="icon-wrap orange">
          <van-icon name="bullhorn-o" size="24px" color="#fff" />
        </view>
        <text :class="['cat-label', activeTab === 'system' ? 'active' : '']">系统消息</text>
      </view>
    </view>

    <scroll-view 
      scroll-y 
      class="content" 
      @scrolltolower="onReachBottom"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="notification-list" v-if="notifications.length > 0">
        <view 
          v-for="item in notifications" 
          :key="item.id" 
          class="notification-item"
          @click="handleNotificationClick(item)"
        >
          <view class="unread-dot" v-if="activeTab === 'system' ? !item.is_read : !item.is_read"></view>
          <image
            v-if="activeTab !== 'system'"
            class="avatar" 
            :src="formatImageUrl(item.actor)" 
            mode="aspectFill"
            @click.stop="goToUser(item.actor?.id)"
          />
          <view v-else class="avatar sys-avatar">
            <van-icon name="bullhorn-o" size="20px" color="#fff" />
          </view>
          <view class="info">
            <view class="user-row">
              <text class="user-name">{{ activeTab === 'system' ? '系统通知' : (item.actor?.nickname || item.actor?.username) }}</text>
              <text class="time">{{ formatDate(item.created_at) }}</text>
            </view>
            <text class="content-text">{{ activeTab === 'system' ? (item.title || item.content || '') : item.content }}</text>
            
            <view class="video-preview" v-if="item.video">
              <image class="video-cover" :src="item.video.thumbnail_url" mode="aspectFill" />
              <text class="video-title">{{ item.video.title }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="loading-status">
        <van-loading v-if="loading" size="20px" color="var(--text-muted)">加载中...</van-loading>
        <view v-else-if="finished && notifications.length === 0" class="empty-state">
          <van-empty description="暂无消息" />
        </view>
        <text v-else-if="finished" class="no-more">没有更多了</text>
      </view>
    </scroll-view>

    <van-popup v-model:show="showLoginPopup" round :close-on-click-overlay="true">
      <view class="login-popup">
        <view class="login-popup__icon">
          <van-icon name="lock" size="22px" color="#ffffff" />
        </view>
        <text class="login-popup__title">需要登录</text>
        <text class="login-popup__desc">登录后才能查看消息内容</text>
        <view class="login-popup__actions">
          <van-button block plain round type="default" class="login-popup__btn" @click="onLoginPopupCancel">先看看</van-button>
          <van-button block round type="primary" class="login-popup__btn" @click="onLoginPopupConfirm">去登录</van-button>
        </view>
      </view>
    </van-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { formatImageUrl } from '@/utils/image'
import { useUserStore } from '@/store/user'

const tabs = [
  { name: 'reply', title: '回复我的', icon: 'comment-o', bgColor: '#1890ff' },
  { name: 'like', title: '收到的赞', icon: 'good-job-o', bgColor: '#ff4d4f' },
  { name: 'system', title: '系统消息', icon: 'bullhorn-o', bgColor: '#faad14' }
]

const activeTab = ref('reply')
const notifications = ref<any[]>([])
const page = ref(1)
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const showActionSheet = ref(false)
const actionActions = [
  { name: '全部标记为已读', value: 'markRead' },
  { name: '清空所有消息', value: 'clearAll', color: '#ee0a24' }
]

const theme = ref(uni.getStorageSync('theme') || 'light')
const userStore = useUserStore()

const showLoginPopup = ref(false)

const ensureLoginWithChoice = () => {
  if (userStore.isLoggedIn) return true

  showLoginPopup.value = true
  return false
}

const onLoginPopupCancel = () => {
  showLoginPopup.value = false
  uni.switchTab({ url: '/pages/index/index' })
}

const onLoginPopupConfirm = () => {
  showLoginPopup.value = false
  uni.navigateTo({ url: '/pages/auth/login' })
}

const onThemeChange = (t: string) => {
  theme.value = t
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  // 首次进入交给 onShow 统一处理（避免未登录时 onMounted/onShow 触发两次弹窗）
})

watch(activeTab, () => {
  if (!userStore.isLoggedIn) return
  fetchNotifications(true)
})

const fetchNotifications = async (refresh = false) => {
  if (!ensureLoginWithChoice()) return
  if (loading.value || (finished.value && !refresh)) return
  if (refresh) {
    page.value = 1
    finished.value = false
  }
  loading.value = true
  try {
    if (activeTab.value === 'system') {
      const res = await request({
        url: '/api/notifications/announcements/',
        data: { page: page.value, page_size: 10 },
        noAuth: false
      })
      const list = res.results || []
      // normalize for UI
      const mapped = list.map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        is_read: !!a.is_read,
        created_at: a.published_at || a.created_at,
        video: null,
        actor: null,
      }))
      notifications.value = refresh ? mapped : [...notifications.value, ...mapped]
      finished.value = !res.has_next
      if (res.has_next) page.value++
    } else {
      let type = 'comment'
      if (activeTab.value === 'like') type = 'like'

      const res = await request({
        url: '/api/interactions/notifications/',
        data: {
          page: page.value,
          type: type
        },
        noAuth: false
      })
      const list = res.results || []
      notifications.value = refresh ? list : [...notifications.value, ...list]
      finished.value = !res.next
      if (res.next) page.value++
    }
  } catch (err) {
    console.error('Fetch notifications error:', err)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const switchTab = (name: string) => {
  if (activeTab.value === name) return
  activeTab.value = name
  fetchNotifications(true)
}

const onActionSelect = (action: any) => {
  if (action.value === 'markRead') {
    handleMarkAllRead()
  } else if (action.value === 'clearAll') {
    handleClearAll()
  }
}

const handleMarkAllRead = () => {
  if (activeTab.value === 'system') {
    uni.showToast({ title: '请逐条查看系统通知以标记已读', icon: 'none' })
    return
  }
  uni.showModal({
    title: '提示',
    content: '确定将所有消息标记为已读吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: '/api/interactions/notifications/mark-all-read/',
            method: 'POST'
          })
          uni.showToast({ title: '已全部标记已读', icon: 'none' })
          fetchNotifications(true)
        } catch (err) {}
      }
    }
  })
}

const handleClearAll = () => {
  if (activeTab.value === 'system') {
    uni.showToast({ title: '系统通知不支持清空', icon: 'none' })
    return
  }
  uni.showModal({
    title: '危险操作',
    content: '确定清空所有消息吗？清空后无法恢复。',
    confirmColor: '#ee0a24',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: '/api/interactions/notifications/clear/',
            method: 'POST'
          })
          uni.showToast({ title: '已清空', icon: 'none' })
          notifications.value = []
          finished.value = true
        } catch (err) {}
      }
    }
  })
}

const onRefresh = () => {
  refreshing.value = true
  fetchNotifications(true)
}

const getActionText = (item: any) => {
  const verb = (item.verb || '').toLowerCase()
  switch (verb) {
    case 'comment':
      return '评论了你的视频'
    case 'reply':
      return '回复了你的评论'
    case 'like':
    case 'like_video':
      return '点赞了你的视频'
    case 'like_comment':
      return '点赞了你的评论'
    case 'favorite':
      return '收藏了你的视频'
    case 'follow':
      return '关注了你'
    case 'at':
      return '在评论中提到了你'
    case 'system':
      return item.content || '系统通知'
    default:
      return item.content || '发来了新动态'
  }
}

const handleNotificationClick = (item: any) => {
  if (activeTab.value === 'system') {
    const title = item.title || '系统通知'
    const content = item.content || ''
    uni.showModal({
      title,
      content,
      showCancel: false,
      success: async () => {
        try {
          await request({
            url: `/api/notifications/announcements/${item.id}/read/`,
            method: 'POST'
          })
          item.is_read = true
        } catch (e) { /* no-op */ }
      }
    })
    return
  }
  if (item.video?.id) {
    goToVideo(item.video.id)
  }
}

const goToVideo = (id: string) => {
  uni.navigateTo({ url: `/pages/video/detail?id=${id}` })
}

const goToUser = (id: string) => {
  uni.navigateTo({ url: `/pages/user/detail?id=${id}` })
}

const onReachBottom = () => {
  fetchNotifications()
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

onShow(() => {
  if (!ensureLoginWithChoice()) return
  fetchNotifications(true)
})
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

.page {
  min-height: 100vh;
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
  padding: 0 30rpx;
  /* #ifdef APP-PLUS */
  padding-top: var(--status-bar-height);
  height: calc(88rpx + var(--status-bar-height));
  /* #endif */
  border-bottom: 1rpx solid var(--border-color);
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-color);
}

.notif-categories {
  display: flex;
  justify-content: space-around;
  padding: 30rpx 0;
  background-color: var(--card-bg);
}

.cat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  flex: 1;
}

.icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8rpx;
}

.icon-wrap.blue { background-color: #3fa1ff; }
.icon-wrap.green { background-color: #4cd964; }
.icon-wrap.red { background-color: #ff5b5b; }
.icon-wrap.orange { background-color: #ff9500; }

.cat-label {
  font-size: 24rpx;
  color: var(--text-color);
}

.cat-label.active {
  color: var(--accent-color);
  font-weight: bold;
}

.content {
  flex: 1;
  overflow: hidden;
}

.notification-list {
  padding: 20rpx 24rpx;
}

.notification-item {
  display: flex;
  padding: 24rpx;
  background-color: var(--card-bg);
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  position: relative;
}

.unread-dot {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  width: 12rpx;
  height: 12rpx;
  background-color: var(--accent-color);
  border-radius: 50%;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  flex-shrink: 0;
  background-color: var(--bg-color);
}

.sys-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ff9500;
}

.info {
  flex: 1;
  overflow: hidden;
}

.user-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.user-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
}

.time {
  font-size: 22rpx;
  color: var(--text-muted);
}

.content-text {
  font-size: 26rpx;
  color: var(--text-color);
  line-height: 1.4;
  margin-bottom: 12rpx;
  display: block;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.video-preview {
  width: 140rpx;
  height: 88rpx;
  border-radius: 8rpx;
  overflow: hidden;
  flex-shrink: 0;
  background-color: var(--bg-color);
}

.video-preview image {
  width: 100%;
  height: 100%;
}

.status-footer {
  padding: 40rpx 0 100rpx;
  text-align: center;
}

.no-more {
  display: block;
  padding: 30rpx 0 60rpx;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-muted);
}

.done-text {
  font-size: 24rpx;
  color: var(--text-muted);
}

/* 适配 Vant ActionSheet 深色模式已在 App.vue 全局实现 */
</style>
