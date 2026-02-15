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
            v-model="title"
            label="标题"
            placeholder="填写视频标题"
            input-align="right"
            maxlength="50"
            show-word-limit
          />
          <van-field
            v-model="description"
            label="简介"
            type="textarea"
            placeholder="填写视频简介"
            rows="2"
            autosize
            input-align="right"
            maxlength="200"
            show-word-limit
          />
          <van-cell title="分类" is-link :value="categoryName" @click="showCategoryPicker = true" />
          
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

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        :columns="categoryColumns"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
        show-toolbar
      />
    </van-popup>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import request, { BASE_URL } from '@/utils/request'
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
const showCategoryPicker = ref(false)

const pickVideo = () => {
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
    categories.value = res.results || []
  } catch (err) {}
}

const categoryName = computed(() => {
  return selectedCategory.value?.name || '选择分类'
})

const canPublish = computed(() => {
  return title.value.trim() && selectedCategory.value && videoPath.value && !uploading.value
})

const categoryColumns = computed(() => {
  return categories.value.map(c => c.name)
})

const onCategoryConfirm = (e: any) => {
  const { index } = e
  selectedCategory.value = categories.value[index]
  showCategoryPicker.value = false
}

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
  if (!userStore.isLoggedIn) {
    return uni.navigateTo({ url: '/pages/auth/login' })
  }

  uploading.value = true
  percent.value = 0
  
  const token = uni.getStorageSync('token')
  const uploadTask = uni.uploadFile({
    url: `${BASE_URL}/api/videos/upload/`,
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
        const vid = String(payload?.id || payload?.video_id || '')
        setTimeout(() => {
          if (vid) {
            uni.redirectTo({ url: `/pages/video/detail?id=${encodeURIComponent(vid)}` })
          } else {
            uni.redirectTo({ url: '/pages/me/works' })
          }
        }, 800)
      } else {
        const msg = String(payload?.detail || payload?.message || '发布失败')
        uni.showToast({ title: msg, icon: 'none' })
      }
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

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})
</script>

<style scoped>
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
  padding: 40rpx 24rpx;
  display: flex;
  justify-content: center;
}

.video-picker {
  width: 100%;
  height: 400rpx;
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
