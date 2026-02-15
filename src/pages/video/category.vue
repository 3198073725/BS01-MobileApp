<template>
  <view :class="['page', theme]">
    <van-nav-bar :title="categoryName" left-arrow @click-left="goBack" fixed placeholder :border="theme !== 'dark'" />
    
    <view class="filter-bar">
      <view class="sort-tabs">
        <text :class="{ active: order === '' }" @click="changeOrder('')">综合</text>
        <text :class="{ active: order === '-created_at' }" @click="changeOrder('-created_at')">最新</text>
        <text :class="{ active: order === '-view_count' }" @click="changeOrder('-view_count')">最热</text>
      </view>
    </view>

    <scroll-view 
      scroll-y 
      class="video-scroll" 
      @scrolltolower="onLoadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh"
    >
      <view class="video-grid" v-if="items.length > 0">
        <view v-for="v in items" :key="v.id" class="video-card" @click="goToDetail(v.id)">
          <view class="cover-wrap">
            <image class="cover" :src="formatImageUrl(v)" mode="aspectFill" />
            <view class="play-count">
              <van-icon name="play-circle-o" color="#fff" size="12px" />
              <text class="count-text">{{ formatCount(v.view_count) }}</text>
            </view>
          </view>
          <view class="info">
            <text class="title">{{ v.title }}</text>
            <view class="meta">
              <text class="author">{{ v.author?.nickname || v.author?.username }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <view class="status-wrap">
        <van-loading v-if="loading" size="20px">加载中...</van-loading>
        <van-empty v-else-if="finished && items.length === 0" description="暂无视频" />
        <text v-else-if="finished" class="no-more">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request from '@/utils/request'
import { formatImageUrl } from '@/utils/image'

const categoryId = ref('')
const categoryName = ref('分类详情')
const items = ref<any[]>([])
const page = ref(1)
const order = ref('')
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const theme = ref(uni.getStorageSync('theme') || 'light')

const onThemeChange = (t: string) => {
  theme.value = t
}

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const fetchVideos = async (refresh = false) => {
  if (loading.value || (finished.value && !refresh)) return
  if (refresh) {
    page.value = 1
    finished.value = false
  }
  
  loading.value = true
  try {
    const res = await request({
      url: '/api/videos/list/',
      data: { 
        category_id: categoryId.value,
        order: order.value,
        page: page.value,
        page_size: 12
      },
      noAuth: true
    })
    const list = res.results || []
    items.value = refresh ? list : [...items.value, ...list]
    if (!res.next) finished.value = true
    else page.value++
  } catch (err) {
    finished.value = true
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

const changeOrder = (newOrder: string) => {
  if (order.value === newOrder) return
  order.value = newOrder
  fetchVideos(true)
}

const onRefresh = () => {
  refreshing.value = true
  fetchVideos(true)
}

const onLoadMore = () => fetchVideos()

const goToDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/video/detail?id=${id}` })
}

const goBack = () => uni.navigateBack()

const formatCount = (n: number) => {
  if (!n) return '0'
  if (n < 10000) return String(n)
  return (n / 10000).toFixed(1) + 'w'
}

onLoad((options: any) => {
  uni.$on('menu:theme-change', onThemeChange)
  if (options.id) {
    categoryId.value = options.id
    categoryName.value = options.name || '分类详情'
    fetchVideos(true)
  }
})
</script>

<style scoped>
.page {
  height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
}

/* 适配 Vant NavBar 深色模式 */
:deep(.van-nav-bar) {
  background-color: var(--card-bg) !important;
}
:deep(.van-nav-bar__title) {
  color: var(--text-color) !important;
}
:deep(.van-nav-bar .van-icon) {
  color: var(--text-color) !important;
}

.filter-bar {
  background-color: var(--card-bg);
  padding: 20rpx 24rpx;
  border-bottom: 1rpx solid var(--border-color);
}

.sort-tabs {
  display: flex;
  gap: 40rpx;
}

.sort-tabs text {
  font-size: 26rpx;
  color: var(--text-muted);
}

.sort-tabs .active {
  color: var(--accent-color);
  font-weight: 700;
}

.video-scroll {
  flex: 1;
  overflow: hidden;
}

.video-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx;
  gap: 0;
}

.video-card {
  width: 50%;
  padding: 10rpx;
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
  left: 12rpx;
  bottom: 12rpx;
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  background-color: rgba(0,0,0,0.4);
  border-radius: 6rpx;
}

.count-text {
  font-size: 20rpx;
  color: #fff;
}

.info {
  padding: 12rpx 4rpx;
}

.title {
  font-size: 26rpx;
  color: var(--text-color);
  line-height: 1.4;
  height: 72rpx;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.author {
  font-size: 22rpx;
  color: var(--text-muted);
}

.status-wrap {
  padding: 40rpx 0;
  text-align: center;
}

.no-more {
  font-size: 24rpx;
  color: var(--text-muted);
}
</style>
