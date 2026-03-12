<template>
  <view class="page">
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <van-icon name="arrow-left" size="20px" />
      </view>
      <text class="nav-title">编辑视频</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view scroll-y class="content" v-if="!loading && detail">
      <view class="card">
        <video
          v-if="detail.video_url"
          class="preview"
          :src="detail.video_url"
          :poster="detail.thumbnail_url"
          controls
          object-fit="contain"
        ></video>
      </view>

      <view class="card form">
        <view class="form-item">
          <text class="label">标题</text>
          <input class="input" v-model="title" maxlength="200" placeholder="输入标题" />
        </view>

        <view class="form-item">
          <text class="label">描述</text>
          <textarea class="textarea" v-model="description" maxlength="500" placeholder="输入描述（可选）" />
        </view>

        <view class="form-item">
          <text class="label">允许评论</text>
          <switch :checked="allowComments" @change="(e:any)=>allowComments = !!(e?.detail?.value ?? e?.target?.value)" color="#1989fa" />
        </view>

        <view class="form-item">
          <text class="label">允许下载</text>
          <switch :checked="allowDownload" @change="(e:any)=>allowDownload = !!(e?.detail?.value ?? e?.target?.value)" color="#1989fa" />
        </view>

        <view class="form-item">
          <text class="label">可见性</text>
          <picker :range="visibilityOptions" range-key="label" @change="onVisibilityChange">
            <view class="picker-value">
              <text>{{ visibilityLabel }}</text>
              <van-icon name="arrow" size="14px" color="#9499a0" />
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="label">标签</text>
          <view class="tag-input-wrap">
            <view class="tag-list" v-if="selectedTags.length > 0">
              <view class="tag-chip" v-for="tag in selectedTags" :key="tag.id">
                <text>{{ tag.name }}</text>
                <van-icon name="cross" size="12px" @click="removeTag(tag)" />
              </view>
            </view>
            <input 
              v-if="selectedTags.length < 3"
              v-model="tagInput" 
              placeholder="输入并回车添加标签" 
              class="tag-input"
              @confirm="onTagConfirm"
              @input="onTagInput"
            />
          </view>
          <view class="tag-suggest" v-if="showTagSuggest && tagOptions.length > 0">
            <view 
              class="suggest-item" 
              v-for="opt in tagOptions" 
              :key="opt.id"
              @click="addTag(opt)"
            >
              {{ opt.name }}
            </view>
          </view>
          <text class="hint">最多 3 个标签</text>
        </view>

        <view class="form-item">
          <text class="label">分类</text>
          <picker :range="categories" range-key="name" @change="onCategoryChange">
            <view class="picker-value">
              <text :class="{ 'placeholder-text': !selectedCategory }">
                {{ selectedCategory ? selectedCategory.name : '未选择' }}
              </text>
              <van-icon name="arrow" size="14px" color="#9499a0" />
            </view>
          </picker>
        </view>
      </view>

      <view class="card form">
        <view class="form-item">
          <text class="label">封面</text>
          <view class="thumb-row">
            <input class="thumb-ts" type="number" v-model="thumbTs" placeholder="时间点(秒)" />
            <van-button size="small" type="primary" :loading="thumbPicking" @click="pickThumb">从视频截取</van-button>
          </view>
          <view class="thumb-row" style="margin-top: 16rpx;">
            <van-button size="small" plain type="primary" @click="uploadCover">上传图片封面</van-button>
          </view>
          <text class="hint" v-if="coverMsg">{{ coverMsg }}</text>
        </view>
      </view>

      <view class="bottom-actions">
        <van-button block round plain type="primary" @click="goPreview">预览</van-button>
        <view style="height: 16rpx;"></view>
        <van-button block round type="primary" :loading="saving" @click="save">保存</van-button>
      </view>
    </scroll-view>

    <view v-else class="loading">
      <van-loading size="24px" color="#1989fa">加载中...</van-loading>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import request, { getBaseUrl } from '@/utils/request'
import { useUserStore } from '@/store/user'

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

const loading = ref(true)
const saving = ref(false)
const detail = ref<any>(null)

const title = ref('')
const description = ref('')
const allowComments = ref(true)
const allowDownload = ref(false)
const visibility = ref<'public' | 'unlisted' | 'private'>('public')

const categories = ref<any[]>([])
const selectedCategory = ref<any>(null)
const selectedTags = ref<any[]>([])
const tagInput = ref('')
const tagOptions = ref<any[]>([])
const showTagSuggest = ref(false)
let tagTimer: any = null

const thumbTs = ref('')
const thumbPicking = ref(false)
const coverMsg = ref('')

const visibilityOptions = ref([
  { value: 'public', label: '公开' },
  { value: 'unlisted', label: '未列出' },
  { value: 'private', label: '私密' }
])

const visibilityLabel = computed(() => {
  const opt = visibilityOptions.value.find(o => o.value === visibility.value)
  return opt?.label || '公开'
})

const ensureLogin = () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/auth/login' })
    return false
  }
  return true
}

const goBack = () => {
  uni.navigateBack({
    fail: () => {
      uni.reLaunch({ url: '/pages/index/index' })
    }
  })
}

const onVisibilityChange = (e: any) => {
  const idx = Number(e?.detail?.value)
  const opt = visibilityOptions.value[idx]
  const v = String(opt?.value || '')
  if (v === 'public' || v === 'unlisted' || v === 'private') visibility.value = v
}

const onTagInput = () => {
  if (tagTimer) clearTimeout(tagTimer)
  tagTimer = setTimeout(async () => {
    const q = tagInput.value.trim()
    if (!q) {
      tagOptions.value = []
      showTagSuggest.value = false
      return
    }
    try {
      const res = await request({
        url: '/api/content/tags/',
        data: { q, page_size: 10 },
        noAuth: true
      })
      const opts = res.results || []
      const chosenIds = selectedTags.value.map(t => t.id)
      tagOptions.value = opts.filter((o: any) => !chosenIds.includes(o.id))
      showTagSuggest.value = tagOptions.value.length > 0
    } catch (err) {
      showTagSuggest.value = false
    }
  }, 300)
}

const addTag = (tag: any) => {
  if (selectedTags.value.length >= 3) return
  const exists = selectedTags.value.some(t => t.id === tag.id)
  if (!exists) {
    selectedTags.value.push(tag)
  }
  tagInput.value = ''
  tagOptions.value = []
  showTagSuggest.value = false
}

const removeTag = (tag: any) => {
  selectedTags.value = selectedTags.value.filter(t => t.id !== tag.id)
}

const onTagConfirm = async () => {
  const name = tagInput.value.trim()
  if (!name || selectedTags.value.length >= 3) return
  
  if (tagOptions.value.length > 0 && tagOptions.value[0].name === name) {
    addTag(tagOptions.value[0])
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

const onCategoryChange = (e: any) => {
  const idx = Number(e?.detail?.value)
  selectedCategory.value = categories.value[idx] || null
}

const fetchCategories = async () => {
  try {
    const res = await request({ url: '/api/content/categories/', noAuth: true, silent: true })
    categories.value = res?.results || []
  } catch {
    categories.value = []
  }
}

const fetchDetail = async () => {
  if (!ensureLogin()) return
  loading.value = true
  try {
    const res = await request({ url: `/api/videos/${encodeURIComponent(vid.value)}/`, noAuth: false })
    detail.value = res
    title.value = res?.title || ''
    description.value = res?.description || ''
    allowComments.value = (res?.allow_comments !== undefined) ? !!res.allow_comments : true
    allowDownload.value = (res?.allow_download !== undefined) ? !!res.allow_download : false
    const vis = String(res?.visibility || '')
    if (vis === 'public' || vis === 'unlisted' || vis === 'private') visibility.value = vis
    else visibility.value = 'public'

    // 标签回填
    selectedTags.value = Array.isArray(res?.tags) ? res.tags.map((t: any) => ({ id: t.id, name: t.name })) : []

    // 分类回填
    const catId = String(res?.category?.id || '')
    if (catId && categories.value.length) {
      selectedCategory.value = categories.value.find(c => String(c.id) === catId) || null
    } else {
      selectedCategory.value = null
    }
  } catch (err) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const save = async () => {
  if (!ensureLogin()) return
  if (!vid.value) return

  saving.value = true
  try {
    await request({
      url: `/api/videos/${encodeURIComponent(vid.value)}/`,
      method: 'PATCH',
      data: {
        title: title.value,
        description: description.value,
        allow_comments: !!allowComments.value,
        allow_download: !!allowDownload.value,
        visibility: visibility.value,
        category_id: selectedCategory.value?.id || '',
        tag_ids: selectedTags.value.map(t => t.id)
      }
    })
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: `/pages/video/detail?id=${encodeURIComponent(vid.value)}` })
    }, 600)
  } catch (err) {
  } finally {
    saving.value = false
  }
}

const pickThumb = async () => {
  if (!ensureLogin()) return
  if (!vid.value) return

  coverMsg.value = ''
  const ts = Math.max(0, Number(thumbTs.value || 0))
  thumbPicking.value = true
  try {
    const res = await request({
      url: `/api/videos/${encodeURIComponent(vid.value)}/thumbnail/pick/`,
      method: 'POST',
      data: { ts }
    })
    if (res?.thumbnail_url) {
      if (detail.value) detail.value.thumbnail_url = res.thumbnail_url
      coverMsg.value = '封面已更新'
    } else {
      coverMsg.value = '封面更新成功'
    }
  } catch (err) {
  } finally {
    thumbPicking.value = false
  }
}

const uploadCover = async () => {
  if (!ensureLogin()) return
  if (!vid.value) return

  coverMsg.value = ''
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (imgRes) => {
      const path = imgRes?.tempFilePaths?.[0]
      if (!path) return

      const token = uni.getStorageSync('token')
      const baseUrl = getBaseUrl().replace(/\/$/, '')
      uni.uploadFile({
        url: `${baseUrl}/api/videos/${encodeURIComponent(vid.value)}/thumbnail/upload/`,
        filePath: path,
        name: 'file',
        header: {
          'Authorization': `Bearer ${token}`
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
            if (payload?.thumbnail_url && detail.value) detail.value.thumbnail_url = payload.thumbnail_url
            coverMsg.value = '封面已更新'
            uni.showToast({ title: '封面已更新', icon: 'success' })
          } else {
            const msg = String(payload?.detail || payload?.message || '封面上传失败')
            uni.showToast({ title: msg, icon: 'none' })
          }
        },
        fail: () => {
          uni.showToast({ title: '网络连接失败', icon: 'none' })
        }
      })
    }
  })
}

const goPreview = () => {
  if (!vid.value) return
  uni.navigateTo({ url: `/pages/video/detail?id=${encodeURIComponent(vid.value)}` })
}

const vid = ref('')
onLoad(async (options: any) => {
  vid.value = String(options?.id || '')
  if (!vid.value) {
    uni.showToast({ title: '缺少视频ID', icon: 'none' })
    loading.value = false
    return
  }
  await fetchCategories()
  await fetchDetail()
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
  box-sizing: border-box;
  /* #ifdef APP-PLUS */
  padding-top: var(--status-bar-height);
  height: calc(88rpx + var(--status-bar-height));
  /* #endif */
}

.back-btn {
  width: 80rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-color);
}

.placeholder {
  width: 80rpx;
}

.content-scroll {
  flex: 1;
  overflow: hidden;
}

.card {
  background-color: var(--card-bg);
  margin: 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
  box-shadow: 0 10rpx 20rpx rgba(0, 0, 0, 0.05);
}

.preview {
  width: 100%;
  height: 380rpx;
  background-color: #000;
}

.form {
  padding: 0 24rpx;
}

.form-item {
  padding: 30rpx 0;
  border-bottom: 1rpx solid var(--border-color);
}

.form-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
  display: block;
  margin-bottom: 20rpx;
}

.input {
  font-size: 28rpx;
  width: 100%;
}

.textarea {
  font-size: 28rpx;
  width: 100%;
  height: 200rpx;
}

.picker-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.placeholder-text {
  color: var(--text-muted);
  font-size: 28rpx;
}

.tag-input-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  min-height: 64rpx;
  align-items: center;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  background-color: var(--accent-color);
  padding: 8rpx 16rpx;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #fff;
}

.tag-input {
  flex: 1;
  min-width: 200rpx;
  font-size: 28rpx;
}

.tag-suggest {
  margin-top: 12rpx;
  background-color: var(--card-bg);
  border: 1rpx solid var(--border-color);
  border-radius: 8rpx;
  max-height: 300rpx;
  overflow-y: auto;
}

.suggest-item {
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  color: #18191c;
  border-bottom: 1rpx solid #f6f7f8;
}

.suggest-item:last-child {
  border-bottom: none;
}

.hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #9499a0;
}

.thumb-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.thumb-ts {
  flex: 1;
  padding: 14rpx 16rpx;
  border-radius: 12rpx;
  background-color: #f1f2f4;
  font-size: 28rpx;
}

.hint {
  margin-top: 16rpx;
  display: block;
  font-size: 24rpx;
  color: #1989fa;
}

.bottom-actions {
  padding: 10rpx 24rpx 90rpx;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
