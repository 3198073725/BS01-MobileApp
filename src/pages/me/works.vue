<template>
  <view :class="['page', theme]">
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <van-icon name="arrow-left" size="20px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
      </view>
      <text class="nav-title">我的视频</text>
      <view class="nav-right" @click="toggleManageMode">
        <text class="manage-btn">{{ isManageMode ? '取消' : '管理' }}</text>
      </view>
    </view>
    <view class="video-grid" v-if="items.length > 0">
      <view v-for="v in items" :key="v.id" class="video-card" @click="onCardClick(v)">
        <view class="cover-wrap">
          <image class="cover" :src="formatImageUrl(v)" mode="aspectFill" />
          <view class="edit-tag" v-if="!isManageMode" @click.stop="goEdit(v.id)">编辑</view>
          <view class="select-mask" v-if="isManageMode">
            <van-checkbox :value="isSelected(v.id)" @change="toggleSelect(v.id)" color="#fb7299" />
          </view>
          <view class="play-count">
            <van-icon name="play-circle-o" color="#fff" size="12px" />
            <text class="count-text">{{ formatCount(v.view_count || v.views || 0) }}</text>
          </view>
        </view>
        <view class="info">
          <text class="title">{{ v.title }}</text>
          <view class="meta-row">
            <view class="status-tag">
              <van-icon name="video-o" size="12px" color="#9499a0" />
              <text class="meta-text ml-4">{{ statusText(v) }}</text>
            </view>
            <view class="delete-btn" v-if="!isManageMode" @click.stop="handleDelete(v.id)">
              <van-icon name="delete-o" size="14px" color="#ee0a24" />
              <text class="del-text">删除</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 底部管理栏 -->
    <view class="manage-bar" v-if="isManageMode">
      <view class="bar-left" @click="toggleSelectAll">
        <van-checkbox :value="isAllSelected" color="#fb7299" />
        <text class="bar-text">全选</text>
      </view>
      <view class="bar-right">
        <text class="selected-count">已选 {{ selectedIds.length }}</text>
        <van-button 
          type="danger" 
          size="small" 
          round 
          :disabled="selectedIds.length === 0"
          @click="handleBulkDelete"
        >
          删除
        </van-button>
      </view>
    </view>

    <view class="status">
      <van-loading v-if="loading" size="18px">加载中...</van-loading>
      <view v-else-if="finished && items.length === 0" class="empty-wrap">
        <van-empty description="暂无作品" />
      </view>
      <text v-else-if="finished" class="done">没有更多了</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app'
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

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  fetchList(true)
})

const items = ref<any[]>([])
const page = ref(1)
const loading = ref(false)
const finished = ref(false)

// 管理模式相关
const isManageMode = ref(false)
const selectedIds = ref<string[]>([])

const toggleManageMode = () => {
  isManageMode.value = !isManageMode.value
  if (!isManageMode.value) {
    selectedIds.value = []
  }
}

const isSelected = (id: string) => selectedIds.value.includes(id)

const toggleSelect = (id: string) => {
  const index = selectedIds.value.indexOf(id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  } else {
    selectedIds.value.push(id)
  }
}

const isAllSelected = computed(() => {
  return items.value.length > 0 && selectedIds.value.length === items.value.length
})

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    selectedIds.value = []
  } else {
    selectedIds.value = items.value.map(v => v.id)
  }
}

const onCardClick = (v: any) => {
  if (isManageMode.value) {
    toggleSelect(v.id)
  } else {
    goVideo(v.id)
  }
}

const handleBulkDelete = () => {
  if (selectedIds.value.length === 0) return
  uni.showModal({
    title: '批量删除',
    content: `确定要删除这 ${selectedIds.value.length} 个视频吗？删除后不可恢复`,
    confirmColor: '#ee0a24',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: '/api/videos/bulk-delete/',
            method: 'POST',
            data: { video_ids: selectedIds.value }
          })
          uni.showToast({ title: '已删除', icon: 'success' })
          isManageMode.value = false
          selectedIds.value = []
          fetchList(true)
        } catch (err) {}
      }
    }
  })
}

const ensureLogin = () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return false
  }
  return true
}

const fetchList = async (refresh = false) => {
  if (!ensureLogin()) return
  if (loading.value) return
  if (refresh) {
    page.value = 1
    finished.value = false
  }
  if (finished.value) return

  loading.value = true
  try {
    const uid = userStore.userInfo?.id
    const res: any = await request({
      url: `/api/videos/list/?page=${page.value}&page_size=12&user_id=${encodeURIComponent(String(uid || ''))}`,
      noAuth: false,
    })
    const list = res?.results || []
    items.value = refresh ? list : [...items.value, ...list]
    if (res?.has_next) {
      page.value += 1
    } else {
      finished.value = true
    }
  } catch (e) {
  } finally {
    loading.value = false
    if (refresh) uni.stopPullDownRefresh()
  }
}

const goVideo = (id: string) => {
  const vid = String(id || '')
  if (!vid) return
  uni.navigateTo({ url: `/pages/video/detail?id=${encodeURIComponent(vid)}` })
}

const goEdit = (id: string) => {
  const vid = String(id || '')
  if (!vid) return
  uni.navigateTo({ url: `/pages/video/edit?id=${encodeURIComponent(vid)}` })
}

const handleDelete = (id: string) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这段视频吗？删除后不可恢复',
    confirmColor: '#ee0a24',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: `/api/videos/${encodeURIComponent(id)}/`,
            method: 'DELETE'
          })
          uni.showToast({ title: '已删除', icon: 'success' })
          fetchList(true)
        } catch (err) {}
      }
    }
  })
}

const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    }
  })
}

const formatCount = (count: number) => {
  const n = Number(count || 0)
  if (n < 1000) return String(n)
  if (n < 10000) return (n / 1000).toFixed(1) + 'k'
  return (n / 10000).toFixed(1) + 'w'
}

const statusText = (v: any) => {
  const s = String(v?.status || '')
  const vis = String(v?.visibility || '')
  if (s === 'published') {
    if (vis === 'private') return '私密'
    if (vis === 'unlisted') return '不公开'
    return '已发布'
  }
  if (s) return s
  return '视频'
}

onMounted(() => {
  fetchList(true)
})

onShow(() => {
  if (!userStore.isLoggedIn) return
  if (!items.value.length) fetchList(true)
})

onPullDownRefresh(() => {
  fetchList(true)
})

onReachBottom(() => {
  fetchList(false)
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  padding-bottom: env(safe-area-inset-bottom);
}

.nav-bar {
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
  height: 88rpx;
  background-color: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  box-sizing: border-box;
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

.nav-right {
  width: 100rpx;
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

.manage-btn {
  font-size: 28rpx;
  color: var(--text-muted);
}

.placeholder {
  width: 80rpx;
}

.video-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 10rpx;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
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
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.select-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.edit-tag {
  position: absolute;
  right: 12rpx;
  top: 12rpx;
  z-index: 2;
  padding: 6rpx 14rpx;
  border-radius: 999px;
  background-color: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 22rpx;
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
  padding: 60rpx 16rpx 12rpx;
  background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 100%);
  display: flex;
  align-items: center;
  gap: 6rpx;
  z-index: 1;
}

.count-text {
  font-size: 22rpx;
  color: #fff;
}

.info {
  padding: 16rpx 8rpx 12rpx;
}

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-tag {
  display: flex;
  align-items: center;
}

.delete-btn {
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 4rpx 8rpx;
}

.del-text {
  font-size: 22rpx;
  color: #ee0a24;
}

.title {
  font-size: 28rpx;
  font-weight: 500;
  color: var(--text-color);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
  height: 80rpx;
  margin-bottom: 8rpx;
}

.meta {
  display: flex;
  align-items: center;
}

.meta-text {
  font-size: 24rpx;
  color: var(--text-muted);
}

.ml-4 {
  margin-left: 8rpx;
}

.status {
  padding: 60rpx 0;
  text-align: center;
}

.empty-wrap {
  padding-top: 100rpx;
}

.done {
  font-size: 24rpx;
  color: var(--text-muted);
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}

.manage-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  background-color: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30rpx;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.bar-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.bar-text {
  font-size: 28rpx;
  color: var(--text-color);
}

.bar-right {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.selected-count {
  font-size: 24rpx;
  color: var(--text-muted);
}
</style>
