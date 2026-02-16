<template>
  <view :class="['page', theme]">
    <view class="nav-bar">
      <view class="back-btn" @click="goBack">
        <van-icon name="arrow-left" size="20px" :color="theme === 'dark' ? '#e3e5e7' : '#18191c'" />
      </view>
      <text class="nav-title">API 地址</text>
      <view class="placeholder"></view>
    </view>

    <scroll-view scroll-y class="content">
      <view class="group">
        <view class="group-title">接口地址</view>
        <van-cell-group :border="false" class="cell-group">
          <van-field
            v-model="apiBase"
            label="Base URL"
            placeholder="例如：https://api.bs01.local"
            clearable
            :border="false"
          />
          <view class="tips">
            <text class="tip-line">- 需要以 http:// 或 https:// 开头</text>
            <text class="tip-line">- 不要以 / 结尾（会自动处理）</text>
          </view>
        </van-cell-group>
      </view>

      <view class="group">
        <view class="group-title">操作</view>
        <van-cell-group :border="false" class="cell-group">
          <van-cell title="保存" icon="success" is-link @click="save" />
          <van-cell title="清除自定义（恢复默认）" icon="delete-o" is-link @click="clear" />
          <van-cell title="测试连通性（/api/health/）" icon="link-o" is-link @click="testHealth" :value="testStatus" />
        </van-cell-group>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'

const theme = ref(uni.getStorageSync('theme') || 'light')
const apiBase = ref('')
const testing = ref(false)
const lastTestOk = ref<boolean | null>(null)

const testStatus = computed(() => {
  if (testing.value) return '测试中...'
  if (lastTestOk.value === true) return 'OK'
  if (lastTestOk.value === false) return '失败'
  return ''
})

const goBack = () => {
  uni.navigateBack()
}

const normalize = (v: string) => {
  const s = (v || '').trim().replace(/\/+$/, '')
  return s
}

onMounted(() => {
  try {
    const current = uni.getStorageSync('api_base')
    apiBase.value = typeof current === 'string' ? current : ''
  } catch {
    apiBase.value = ''
  }
})

const save = () => {
  const v = normalize(apiBase.value)
  if (!v) {
    uni.showToast({ title: '请输入 API 地址', icon: 'none' })
    return
  }
  if (!/^https?:\/\//i.test(v)) {
    uni.showToast({ title: '必须以 http:// 或 https:// 开头', icon: 'none' })
    return
  }

  try {
    uni.setStorageSync('api_base', v)
    apiBase.value = v
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const clear = () => {
  try {
    uni.removeStorageSync('api_base')
    apiBase.value = ''
    lastTestOk.value = null
    uni.showToast({ title: '已清除', icon: 'none' })
  } catch {
    uni.showToast({ title: '清除失败', icon: 'none' })
  }
}

const testHealth = async () => {
  const base = normalize(apiBase.value)
  const url = base ? `${base}/api/health/` : ''

  if (!url) {
    uni.showToast({ title: '请先填写并保存 API 地址', icon: 'none' })
    return
  }
  if (!/^https?:\/\//i.test(base)) {
    uni.showToast({ title: '必须以 http:// 或 https:// 开头', icon: 'none' })
    return
  }

  testing.value = true
  lastTestOk.value = null
  try {
    const res = await new Promise<UniApp.RequestSuccessCallbackResult>((resolve, reject) => {
      uni.request({
        url,
        method: 'GET',
        timeout: 4000,
        success: (r) => resolve(r),
        fail: (e) => reject(e),
      })
    })

    if (res.statusCode >= 200 && res.statusCode < 300) {
      lastTestOk.value = true
      uni.showToast({ title: '连接成功', icon: 'none' })
    } else {
      lastTestOk.value = false
      uni.showToast({ title: `失败：HTTP ${res.statusCode}`, icon: 'none' })
    }
  } catch {
    lastTestOk.value = false
    uni.showToast({ title: '网络连接失败', icon: 'none' })
  } finally {
    testing.value = false
  }
}
</script>

<style scoped>
.page {
  height: 100vh;
  background-color: var(--bg-color);
  color: var(--text-color);
  display: flex;
  flex-direction: column;
}

.nav-bar {
  height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
}

.back-btn {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 700;
}

.placeholder {
  width: 80rpx;
}

.content {
  flex: 1;
  overflow: hidden;
}

.group {
  padding: 24rpx;
}

.group-title {
  margin-bottom: 14rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-muted);
}

.cell-group {
  border-radius: 18rpx;
  overflow: hidden;
  background-color: var(--card-bg) !important;
}

.tips {
  padding: 8rpx 24rpx 18rpx;
}

.tip-line {
  display: block;
  font-size: 22rpx;
  color: var(--text-muted);
  line-height: 34rpx;
}

.safe-bottom {
  height: env(safe-area-inset-bottom);
}
</style>
