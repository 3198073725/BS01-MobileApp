<template>
  <view :class="['index-container', theme]">
    <view class="top-bar">
      <view class="search-wrap">
        <van-search
          :model-value="searchKeyword"
          @update:model-value="onSearchKeywordChange"
          placeholder="搜索视频、UP主"
          shape="round"
          background="transparent"
          :clearable="false"
          @search="onSearch"
          @focus="showSearchHistory = true"
          @clear="onClear"
          @input="onInput"
          class="custom-search"
        />
      </view>
    </view>

    <!-- 信息流切换（对齐 Web：推荐/关注/精选） -->
    <view class="feed-tabs">
      <view class="tab" :class="{ active: feedTab === 'recommend' }" @click="switchFeed('recommend')">推荐</view>
      <view class="tab" :class="{ active: feedTab === 'following' }" @click="switchFeed('following')">关注</view>
      <view class="tab" :class="{ active: feedTab === 'featured' }" @click="switchFeed('featured')">精选</view>
    </view>

    <!-- 搜索历史层 - 改为按需显示的普通 view -->
    <view class="history-overlay" v-if="showSearchHistory" @click="showSearchHistory = false">
      <view class="history-container" @click.stop>
        <view class="history-header">
          <text class="title">搜索历史</text>
          <van-icon name="delete-o" size="16px" color="#9499a0" @click="clearHistory" />
        </view>
        <view class="history-list" v-if="searchHistory.length > 0">
          <view 
            v-for="(item, index) in searchHistory" 
            :key="index" 
            class="history-item"
            @click="clickHistoryItem(item)"
          >
            <text>{{ item }}</text>
          </view>
        </view>
        <view v-else class="empty-history">
          <text>暂无搜索历史</text>
        </view>
      </view>
    </view>

    <!-- 分类滑动导航 -->
    <view class="category-nav" v-if="categories && categories.length > 0">
      <scroll-view scroll-x class="category-scroll" :show-scrollbar="false" :enhanced="true">
        <view class="category-list">
          <view 
            class="category-item" 
            :class="{ active: currentCategoryId === '' }"
            @click="onCategoryChange('')"
          >
            <text>全部</text>
          </view>
          <view 
            v-for="cat in categories" 
            :key="cat.id"
            class="category-item" 
            :class="{ active: currentCategoryId === cat.id }"
            @click="onCategoryChange(cat.id)"
          >
            <text>{{ cat.name }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 仅媒体区域滚动：列表 + 加载状态 -->
    <scroll-view
      scroll-y
      class="media-scroll"
      @scrolltolower="onScrollToLower"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <!-- 搜索结果排序 -->
      <view class="search-sort-tabs" v-if="searchKeyword">
        <text :class="{ active: searchOrder === '' }" @click="changeSearchOrder('')">综合</text>
        <text :class="{ active: searchOrder === '-created_at' }" @click="changeSearchOrder('-created_at')">最新</text>
        <text :class="{ active: searchOrder === '-view_count' }" @click="changeSearchOrder('-view_count')">最热</text>
      </view>

      <!-- 视频列表 - 优化间距与对比度 -->
      <view class="video-list">
        <view
          v-for="video in videoList"
          :key="video.id"
          class="video-card"
          @click="goToDetail(video.id)"
        >
          <view class="cover-container">
            <image
              class="cover"
              :src="formatImageUrl(video)"
              mode="aspectFill"
            />
            <view class="corner-stats">
              <view class="corner-item">
                <van-icon name="play-circle-o" color="#fff" size="14px" />
                <text class="corner-text">{{ formatCount(video.view_count) }}</text>
              </view>
            </view>
          </view>
          <view class="video-info">
            <text class="title">{{ video.title }}</text>
            <view class="meta-row">
              <text class="author">{{ video.author?.name || video.author?.username || video.owner_nickname || video.owner_username || video.owner?.nickname || video.owner?.username || '未知UP主' }}</text>
              <text class="dot" v-if="formatDate(video.created_at)">·</text>
              <text class="date" v-if="formatDate(video.created_at)">{{ formatDate(video.created_at) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载状态 -->
      <view class="loading-status">
        <van-loading v-if="loading" size="20px" color="#999">加载中...</van-loading>
        <text v-else-if="finished" class="no-more">没有更多了</text>
      </view>
    </scroll-view>

    <van-popup v-model:show="showLoginPopup" round :close-on-click-overlay="true">
      <view class="login-popup">
        <view class="login-popup__icon">
          <van-icon name="lock" size="22px" color="#ffffff" />
        </view>
        <text class="login-popup__title">需要登录</text>
        <text class="login-popup__desc">登录后才能查看{{ loginPopupTabLabel }}内容</text>
        <view class="login-popup__actions">
          <van-button block plain round type="default" class="login-popup__btn" @click="onLoginPopupCancel">先看看</van-button>
          <van-button block round type="primary" class="login-popup__btn" @click="onLoginPopupConfirm">去登录</van-button>
        </view>
      </view>
    </van-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { formatImageUrl } from '@/utils/image'
import request from '@/utils/request'
import { useUserStore } from '@/store/user'

const theme = ref(uni.getStorageSync('theme') || 'light')
const onThemeChange = (t: string) => {
  theme.value = t
}

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

interface Video {
  id: string
  title: string
  status: string
  thumbnail: string
  thumbnail_url?: string
  view_count: number
  created_at: string
  author?: {
    id?: string
    name?: string
    username?: string
    avatar_url?: string
  }
  owner_username?: string
  owner_nickname?: string
  owner?: {
    username: string
    nickname: string
    avatar_url: string
  }
}

const searchKeyword = ref('')
const searchHistory = ref<string[]>([])
const showSearchHistory = ref(false)
const videoList = ref<Video[]>([])
const categories = ref<any[]>([])
const currentCategoryId = ref('')
const loading = ref(false)
const finished = ref(false)
const page = ref(1)
const refreshing = ref(false)
const searchOrder = ref('')

const userStore = useUserStore()
const feedTab = ref<'recommend' | 'following' | 'featured'>('recommend')

const showLoginPopup = ref(false)
const loginPopupTabLabel = ref('')
const loginPopupTargetTab = ref<'recommend' | 'following' | 'featured'>('recommend')

const onSearchKeywordChange = (v: any) => {
  const next = v === undefined || v === null ? '' : String(v)
  searchKeyword.value = next
  onInput(next)
}

const fetchVideos = async (refresh = false) => {
  if (loading.value) return
  if (refresh) {
    page.value = 1
    finished.value = false
    
    // 保存搜索历史
    if (searchKeyword.value.trim()) {
      saveSearchHistory(searchKeyword.value.trim())
    }
  }
  if (finished.value) return

  loading.value = true
  try {
    let url = '/api/videos/list/'
    let noAuth = true
    const data: any = { page: page.value }

    if (feedTab.value === 'featured') {
      url = '/api/recommendation/featured/'
      noAuth = true
      data.page_size = 12
    } else if (feedTab.value === 'following') {
      url = '/api/recommendation/following/'
      noAuth = false
      data.page_size = 12
    } else {
      // recommend
      data.q = searchKeyword.value
      data.category_id = currentCategoryId.value
      if (searchKeyword.value) {
        data.order = searchOrder.value
      }
    }

    const res = await request({ url, data, noAuth })
    
    const newVideos = res.results || []
    if (refresh) {
      videoList.value = newVideos
    } else {
      videoList.value = [...videoList.value, ...newVideos]
    }

    if (!res.next) {
      finished.value = true
    } else {
      page.value++
    }
  } catch (err) {
    console.error('Fetch videos error:', err)
  } finally {
    loading.value = false
    if (refresh) {
      uni.stopPullDownRefresh()
    }
  }
}

const promptLoginForFeed = (tab: 'following' | 'featured') => {
  loginPopupTargetTab.value = tab
  loginPopupTabLabel.value = tab === 'following' ? '关注' : '精选'
  showLoginPopup.value = true
}

const onLoginPopupCancel = () => {
  showLoginPopup.value = false
  feedTab.value = 'recommend'
}

const onLoginPopupConfirm = () => {
  showLoginPopup.value = false
  uni.navigateTo({ url: '/pages/auth/login' })
}

const switchFeed = (tab: 'recommend' | 'following' | 'featured') => {
  if (feedTab.value === tab) return
  
  if (!userStore.isLoggedIn && (tab === 'following' || tab === 'featured')) {
    promptLoginForFeed(tab)
    return
  }
  
  feedTab.value = tab
  fetchVideos(true)
}

watch(searchKeyword, (newVal) => {
  if (!newVal.trim()) {
    showSearchHistory.value = false
    fetchVideos(true)
  }
})

const changeSearchOrder = (order: string) => {
  if (searchOrder.value === order) return
  searchOrder.value = order
  fetchVideos(true)
}

const onSearch = () => {
  showSearchHistory.value = false
  fetchVideos(true)
}

const onInput = (val: string) => {
  if (!val.trim()) {
    onClear()
  }
}

const onClear = () => {
  searchKeyword.value = ''
  showSearchHistory.value = false
  fetchVideos(true)
}

const loadSearchHistory = () => {
  const history = uni.getStorageSync('search_history')
  if (history) {
    searchHistory.value = JSON.parse(history)
  }
}

const saveSearchHistory = (keyword: string) => {
  let history = [...searchHistory.value]
  const index = history.indexOf(keyword)
  if (index !== -1) {
    history.splice(index, 1)
  }
  history.unshift(keyword)
  if (history.length > 10) {
    history = history.slice(0, 10)
  }
  searchHistory.value = history
  uni.setStorageSync('search_history', JSON.stringify(history))
}

const clearHistory = () => {
  uni.showModal({
    title: '提示',
    content: '确定清空全部搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = []
        uni.removeStorageSync('search_history')
      }
    }
  })
}

const clickHistoryItem = (item: string) => {
  searchKeyword.value = item
  showSearchHistory.value = false
  fetchVideos(true)
}

const fetchCategories = async () => {
  try {
    const res = await request({
      url: '/api/content/categories/',
      noAuth: true
    })
    categories.value = res.results || []
  } catch (err) {
    console.error('Fetch categories error:', err)
  }
}

const onCategoryChange = (id: string) => {
  if (id === '') {
    if (currentCategoryId.value === '') return
    currentCategoryId.value = ''
    fetchVideos(true)
  } else {
    const cat = categories.value.find(c => c.id === id)
    uni.navigateTo({
      url: `/pages/video/category?id=${id}&name=${encodeURIComponent(cat?.name || '分类')}`
    })
  }
}

const goToDetail = (id: string) => {
  uni.navigateTo({
    url: `/pages/video/detail?id=${id}`
  })
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}-${date.getDate()}`
}

const formatCount = (count: number) => {
  if (count < 1000) return count
  if (count < 10000) return (count / 1000).toFixed(1) + 'k'
  return (count / 10000).toFixed(1) + 'w'
}

const unread = ref(0)

const fetchUnreadCount = async () => {
  if (!userStore.isLoggedIn) {
    unread.value = 0
    return
  }
  try {
    const res = await request({
      url: '/api/interactions/notifications/unread-count/',
      silent: true
    })
    unread.value = Number(res?.unread || 0)
    if (unread.value > 0) {
      uni.setTabBarBadge({
        index: 2, // 消息 Tab 的索引
        text: unread.value > 99 ? '99+' : String(unread.value)
      })
    } else {
      uni.removeTabBarBadge({ index: 2 })
    }
  } catch (err) {
    unread.value = 0
  }
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  loadSearchHistory()
  fetchCategories()
  
  // 初始化默认启动 Tab
  const defaultTab = uni.getStorageSync('home_default_tab') as any
  if (defaultTab && ['recommend', 'following', 'featured'].includes(defaultTab)) {
    // 如果是关注页，需要检查登录状态
    if (defaultTab === 'following' && !userStore.isLoggedIn) {
      feedTab.value = 'recommend'
    } else {
      feedTab.value = defaultTab
    }
  }
  
  fetchVideos()
  fetchUnreadCount()
  // 每 30 秒轮询一次未读数
  setInterval(fetchUnreadCount, 30000)
})

const onScrollToLower = () => {
  fetchVideos()
}

const onRefresh = () => {
  refreshing.value = true
  fetchVideos(true).finally(() => {
    refreshing.value = false
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

.index-container {
  height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 1000;
  padding: calc(var(--status-bar-height) + 16rpx) 24rpx 12rpx;
  background-color: var(--card-bg);
}

.feed-tabs {
  display: flex;
  justify-content: center;
  gap: 30rpx;
  padding: 10rpx 0 18rpx;
  background-color: var(--card-bg);
  border-bottom: 1rpx solid var(--border-color);
}

/* 覆盖 van-search 适配深色模式 */
:deep(.van-search__content) {
  background-color: var(--bg-color) !important;
}
:deep(.van-field__control) {
  color: var(--text-color) !important;
}

.tab {
  font-size: 28rpx;
  color: var(--text-muted);
  padding: 10rpx 16rpx;
  border-radius: 999px;
}

.tab.active {
  color: var(--accent-color);
  font-weight: 700;
  background-color: rgba(251, 114, 153, 0.10);
}

.history-overlay {
  position: fixed;
  top: calc(var(--status-bar-height) + 100rpx);
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.history-container {
  background-color: var(--card-bg);
  padding: 30rpx 24rpx 40rpx;
  border-bottom-left-radius: 24rpx;
  border-bottom-right-radius: 24rpx;
  box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.05);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.history-header .title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.history-item {
  padding: 12rpx 24rpx;
  background-color: var(--bg-color);
  border-radius: 32rpx;
  max-width: 300rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-item text {
  font-size: 24rpx;
  color: var(--text-muted);
}

.empty-history {
  padding: 40rpx 0;
  text-align: center;
  font-size: 24rpx;
  color: var(--text-muted);
}

.category-nav {
  z-index: 99;
  background-color: var(--card-bg);
  padding: 10rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.media-scroll {
  flex: 1;
  overflow: hidden;
}

.search-sort-tabs {
  display: flex;
  padding: 20rpx 24rpx 10rpx;
  gap: 40rpx;
  background-color: var(--bg-color);
}

.search-sort-tabs text {
  font-size: 26rpx;
  color: var(--text-muted);
}

.search-sort-tabs .active {
  color: var(--accent-color);
  font-weight: 700;
}

.category-scroll {
  white-space: nowrap;
  width: 100%;
}

.category-list {
  display: flex;
  padding: 0 24rpx;
  gap: 30rpx;
}

.category-item {
  display: inline-flex;
  padding: 12rpx 0;
  position: relative;
}

.category-item text {
  font-size: 28rpx;
  color: var(--text-muted);
  transition: all 0.2s;
}

.category-item.active text {
  color: var(--accent-color);
  font-weight: 700;
}

.category-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 28rpx;
  height: 4rpx;
  background-color: var(--accent-color);
  border-radius: 2rpx;
}

.video-list {
  background-color: var(--bg-color);
  border-radius: 36rpx;
  overflow: hidden;
  padding: 0 !important;
}

.video-list {
  display: flex;
  flex-wrap: wrap;
  padding: 20rpx;
  gap: 18rpx;
}

.video-card {
  width: calc(50% - 10rpx);
  background-color: var(--card-bg);
  border-radius: 14rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.06);
}

.cover-container {
  position: relative;
  width: 100%;
  aspect-ratio: 16/9;
  background-color: var(--bg-color);
}

.cover {
  width: 100%;
  height: 100%;
}

.corner-stats {
  position: absolute;
  left: 10rpx;
  bottom: 10rpx;
  z-index: 2;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8rpx;
  padding: 6rpx 10rpx;
}

.corner-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.corner-text {
  font-size: 22rpx;
  color: #fff;
  font-weight: 600;
}

.video-info {
  padding: 12rpx 14rpx 14rpx;
}

.title {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1.35;
  height: 70rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.author {
  font-size: 22rpx;
  color: var(--text-muted);
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dot {
  font-size: 22rpx;
  color: var(--text-muted);
}

.date {
  font-size: 20rpx;
  color: var(--text-muted);
}

.loading-status {
  padding: 40rpx 0;
  text-align: center;
}

.no-more {
  font-size: 24rpx;
  color: var(--text-muted);
}
</style>
