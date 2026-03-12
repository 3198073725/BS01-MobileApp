<template>
  <view :class="['page', theme]">
    <van-nav-bar title="发布视频" fixed placeholder :border="theme !== 'dark'" />
    
    <scroll-view scroll-y class="content-scroll">
      <view class="upload-section">
        <view v-if="!videoPath" class="video-picker" @click="pickVideo">
          <van-icon name="video-o" size="48px" color="var(--text-muted)" />
          <text class="picker-text">点击选择视频</text>
        </view>
        
        <view v-else class="video-preview-wrap">
          <video :src="videoPath" class="video-preview" controls></video>
          <view class="re-pick" @click="pickVideo">
            <van-icon name="exchange" />
            <text>重新选择</text>
          </view>
        </view>
      </view>

      <view class="form-section">
        <van-cell-group inset :border="false" class="custom-group">
          <van-field
            :model-value="title"
            @update:model-value="onTitleChange"
            label="标题"
            placeholder="填写视频标题"
            input-align="right"
            maxlength="50"
            show-word-limit
          />
          <van-field
            :model-value="description"
            @update:model-value="onDescriptionChange"
            label="简介"
            type="textarea"
            placeholder="填写视频简介"
            rows="2"
            autosize
            input-align="right"
            maxlength="200"
            show-word-limit
          />
          <van-cell title="分类" is-link :value="categoryName" @click="openCategorySelector" />
          
          <view class="tag-cell">
            <view class="tag-header">
              <text class="tag-title">标签</text>
              <text class="tag-count">{{ selectedTags.length }}/3</text>
            </view>
            <view class="tag-input-wrap">
              <input 
                v-model="tagInput" 
                placeholder="输入标签名并回车" 
                @confirm="handleTagConfirm"
                confirm-type="send"
                class="tag-field"
              />
              <view class="tag-suggestions" v-if="tagSuggestions.length > 0">
                <view 
                  v-for="tag in tagSuggestions" 
                  :key="tag.id" 
                  class="suggest-item"
                  @click="addTag(tag)"
                >
                  {{ tag.name }}
                </view>
              </view>
            </view>
            <view class="selected-tags" v-if="selectedTags.length > 0">
              <view v-for="tag in selectedTags" :key="tag.id" class="tag-tag">
                <text>{{ tag.name }}</text>
                <van-icon name="cross" size="12px" @click="removeTag(tag)" />
              </view>
            </view>
          </view>
        </van-cell-group>
      </view>

      <view class="btn-wrap">
        <van-button 
          type="primary" 
          block 
          round 
          :loading="uploading" 
          @click="handlePublish"
          :disabled="!canPublish"
        >
          发布视频
        </van-button>
      </view>
      
      <view class="safe-bottom"></view>
    </scroll-view>

    <van-action-sheet
      v-model:show="showCategorySheet"
      title="选择分类"
      :actions="categoryActions"
      cancel-text="取消"
      close-on-click-action
      @select="onCategorySelect"
    />

    <van-popup v-model:show="showLoginPopup" round :close-on-click-overlay="true">
      <view class="login-popup">
        <view class="login-popup__icon">
          <van-icon name="lock" size="22px" color="#ffffff" />
        </view>
        <text class="login-popup__title">需要登录</text>
        <text class="login-popup__desc">登录后才能发布视频</text>
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
import request, { getBaseUrl } from '@/utils/request'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const theme = ref(uni.getStorageSync('theme') || 'light')

const onThemeChange = (t: string) => {
  theme.value = t
}

const videoPath = ref('')
const title = ref('')
const description = ref('')
const uploading = ref(false)
const percent = ref(0)
const categories = ref<any[]>([])
const selectedCategory = ref<any>(null)
const selectedTags = ref<any[]>([])
const tagInput = ref('')
const tagSuggestions = ref<any[]>([])

const showCategorySheet = ref(false)

const showLoginPopup = ref(false)

const onTitleChange = (v: any) => {
  title.value = v === undefined || v === null ? '' : String(v)
}

const onDescriptionChange = (v: any) => {
  description.value = v === undefined || v === null ? '' : String(v)
}

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

const pickVideo = () => {
  if (!ensureLoginWithChoice()) return
  uni.chooseVideo({
    sourceType: ['album', 'camera'],
    success: (res) => {
      videoPath.value = res.tempFilePath
      if (!title.value) {
        const name = res.tempFilePath.split('/').pop() || ''
        title.value = name.split('.').shift() || ''
      }
    }
  })
}

const fetchCategories = async () => {
  try {
    const res = await request({
      url: '/api/content/categories/',
      noAuth: true
    })
    const list = Array.isArray(res)
      ? res
      : (res as any)?.results || (res as any)?.data?.results || (res as any)?.data || []
    categories.value = Array.isArray(list) ? list : []
  } catch (err) {
    categories.value = []
    uni.showToast({ title: '分类加载失败', icon: 'none' })
  }
}

const categoryName = computed(() => {
  return selectedCategory.value?.name || '选择分类'
})

const canPublish = computed(() => {
  return title.value.trim() && videoPath.value && !uploading.value
})

const categoryActions = computed(() => {
  return categories.value.map((c: any) => ({
    name: String(c?.name ?? ''),
    value: c
  }))
})

const openCategorySelector = async () => {
  if (!categories.value.length) {
    await fetchCategories()
  }
  if (!categories.value.length) {
    uni.showToast({ title: '暂无分类数据', icon: 'none' })
    return
  }

  showCategorySheet.value = true
}

const onCategorySelect = (action: any) => {
  selectedCategory.value = action?.value || null
}

let tagTimer: any = null

const fetchTagSuggestions = async () => {
  if (tagTimer) clearTimeout(tagTimer)
  tagTimer = setTimeout(async () => {
    const q = tagInput.value.trim()
    if (!q) {
      tagSuggestions.value = []
      return
    }
    try {
      const res = await request({
        url: '/api/content/tags/',
        data: { q, page_size: 10 },
        noAuth: true,
        silent: true,
      })
      const opts = Array.isArray(res)
        ? res
        : (res as any)?.results || (res as any)?.data?.results || (res as any)?.data || []
      const chosenIds = selectedTags.value.map(t => t.id)
      tagSuggestions.value = (Array.isArray(opts) ? opts : []).filter((o: any) => !chosenIds.includes(o.id))
    } catch {
      tagSuggestions.value = []
    }
  }, 300)
}

watch(tagInput, () => {
  fetchTagSuggestions()
})

const handleTagConfirm = async () => {
  const name = tagInput.value.trim()
  if (!name || selectedTags.value.length >= 3) return
  
  if (tagSuggestions.value.length > 0 && tagSuggestions.value[0].name === name) {
    addTag(tagSuggestions.value[0])
    return
  }

  try {
    const res = await request({
      url: '/api/content/tags/',
      method: 'POST',
      data: { name }
    })
    addTag(res)
  } catch (err) {}
}

const addTag = (tag: any) => {
  if (selectedTags.value.length >= 3) return
  const exists = selectedTags.value.some(t => t.id === tag.id)
  if (!exists) {
    selectedTags.value.push(tag)
  }
  tagInput.value = ''
  tagSuggestions.value = []
}

const removeTag = (tag: any) => {
  selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
}

const handlePublish = async () => {
  if (!videoPath.value) return
  if (!ensureLoginWithChoice()) return

  uploading.value = true
  percent.value = 0
  
  const token = uni.getStorageSync('token')
  const baseUrl = getBaseUrl().replace(/\/$/, '')
  const uploadTask = uni.uploadFile({
    url: `${baseUrl}/api/videos/upload/`,
    filePath: videoPath.value,
    name: 'file',
    header: {
      'Authorization': `Bearer ${token}`
    },
    formData: {
      title: title.value,
      description: description.value,
      category_id: selectedCategory.value?.id || '',
      tag_ids: selectedTags.value.map(t => String(t.id)).join(',')
    },
    success: (res) => {
      let payload: any = null
      try {
        if (typeof (res as any)?.data === 'string') payload = JSON.parse((res as any).data)
        else payload = (res as any)?.data
      } catch {
        payload = null
      }

      if (res.statusCode >= 200 && res.statusCode < 300) {
        uni.showToast({ title: '发布成功', icon: 'success' })
        setTimeout(() => {
          try { uni.setStorageSync('works_refresh', '1') } catch { }
          uni.redirectTo({ url: '/pages/me/works' })
        }, 800)
        return
      }
      const msg = String(payload?.detail || payload?.message || '发布失败')
      uni.showToast({ title: msg, icon: 'none' })
    },
    fail: () => {
      uni.showToast({ title: '网络连接失败', icon: 'none' })
    },
    complete: () => {
      uploading.value = false
    }
  })

  uploadTask.onProgressUpdate((res) => {
    percent.value = res.progress
  })
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  fetchCategories()
})

onShow(() => {
  ensureLoginWithChoice()
})

onUnmounted(() => {
  if (tagTimer) clearTimeout(tagTimer)
  uni.$off('menu:theme-change', onThemeChange)
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
}

:deep(.van-nav-bar) {
  background-color: var(--card-bg) !important;
}
:deep(.van-nav-bar__title) {
  color: var(--text-color) !important;
}
:deep(.van-nav-bar .van-icon) {
  color: var(--text-color) !important;
}

.content-scroll {
  flex: 1;
  overflow: hidden;
}

.upload-section {
  padding: 60rpx 24rpx 20rpx;
  display: flex;
  justify-content: center;
}

.video-picker {
  width: 100%;
  height: 360rpx;
  background-color: var(--bg-color);
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed var(--border-color);
}

.picker-text {
  margin-top: 20rpx;
  font-size: 28rpx;
  color: var(--text-muted);
}

.video-preview-wrap {
  position: relative;
  width: 100%;
  border-radius: 16rpx;
  overflow: hidden;
  background-color: #000;
}

.video-preview {
  width: 100%;
  height: 400rpx;
}

.re-pick {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  color: #ffffff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  z-index: 10;
}

.form-section {
  margin-top: 20rpx;
}

.custom-group {
  background-color: var(--card-bg) !important;
}

:deep(.van-cell) {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}

:deep(.van-field__control) {
  color: var(--text-color) !important;
}

:deep(.van-cell__title) {
  color: var(--text-color) !important;
}

:deep(.van-cell__value) {
  color: var(--text-muted) !important;
}

.tag-cell {
  padding: 24rpx 32rpx;
  background-color: var(--card-bg);
}

.tag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.tag-title {
  font-size: 28rpx;
  color: var(--text-color);
}

.tag-count {
  font-size: 24rpx;
  color: var(--text-muted);
}

.tag-input-wrap {
  position: relative;
  margin-bottom: 20rpx;
}

.tag-field {
  height: 72rpx;
  background-color: var(--bg-color);
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: var(--text-color);
}

.tag-suggestions {
  position: absolute;
  top: 80rpx;
  left: 0;
  right: 0;
  background-color: var(--card-bg);
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1);
  border-radius: 8rpx;
  z-index: 100;
  max-height: 300rpx;
  overflow-y: auto;
  border: 1rpx solid var(--border-color);
}

.suggest-item {
  padding: 20rpx 24rpx;
  font-size: 26rpx;
  color: var(--text-color);
  border-bottom: 1rpx solid var(--border-color);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-tag {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background-color: var(--accent-color);
  color: #fff;
  padding: 6rpx 20rpx;
  border-radius: 30rpx;
  font-size: 24rpx;
}

.btn-wrap {
  padding: 60rpx 32rpx;
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}

:deep(.van-popup) {
  background-color: var(--card-bg) !important;
}
:deep(.van-picker) {
  background-color: var(--card-bg) !important;
}
:deep(.van-picker__toolbar) {
  background-color: var(--card-bg) !important;
}
:deep(.van-picker-column__item) {
  color: var(--text-color) !important;
}
</style>
