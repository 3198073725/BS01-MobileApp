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
          <view class="native-field">
            <view class="native-label">Base URL</view>
            <input
              class="native-input"
              :value="apiBaseRaw"
              placeholder="例如：https://api.example.com"
              placeholder-style="color: var(--text-muted);"
              @input="onApiBaseNativeInput"
            />
          </view>
          <view class="current">
            <text class="current-label">当前生效：</text>
            <text class="current-value">{{ effectiveBase }}</text>
          </view>
          <view class="current">
            <text class="current-label">恢复默认：</text>
            <text class="current-value">{{ defaultBase || '未注入，请手动填写可访问地址' }}</text>
          </view>
          <view class="tips">
            <text class="tip-line">- 需要以 http:// 或 https:// 开头</text>
            <text class="tip-line">- 不要以 / 结尾（会自动处理）</text>
            <text class="tip-line">- 真机/小程序建议填写手机可访问的局域网 IP 或正式域名</text>
            <text v-if="!defaultBase" class="tip-line">- 当前环境没有注入默认 API 地址，部署时应通过 manifest 或构建变量提供</text>
          </view>
        </van-cell-group>
      </view>

      <view class="group">
        <view class="group-title">操作</view>
        <van-cell-group :border="false" class="cell-group">
          <van-cell title="保存" icon="success" is-link @click="save" />
          <van-cell title="清除自定义" icon="delete-o" is-link @click="clear" />
          <van-cell title="测试连通性（/api/health/）" icon="link-o" is-link @click="testHealth" :value="testStatus" />
        </van-cell-group>
      </view>

      <view class="safe-bottom"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getBaseUrl, getDefaultBaseUrl } from '@/utils/request'
import request from '@/utils/request'
import { useConfigStore } from '@/store/config'

const theme = ref(uni.getStorageSync('theme') || 'light')
const configStore = useConfigStore()
const apiBaseRaw = ref('')
const testing = ref(false)
const lastTestOk = ref<boolean | null>(null)
const effectiveBase = ref('')
const defaultBase = ref('')
const showApiBase = computed(() => configStore.get('show_api_base', true))

const guardAccess = async () => {
  if (!Object.keys(configStore.configs || {}).length) {
    try { await configStore.fetchConfigs() } catch (_) { /* no-op */ }
  }
  if (!showApiBase.value) {
    uni.showToast({ title: 'API 地址入口已关闭', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack({
        fail: () => {
          uni.reLaunch({ url: '/pages/settings/index' })
        }
      })
    }, 120)
    return false
  }
  return true
}

const refreshEffectiveBase = () => {
  try {
    effectiveBase.value = getBaseUrl()
  } catch {
    effectiveBase.value = ''
  }
  try {
    defaultBase.value = getDefaultBaseUrl()
  } catch {
    defaultBase.value = ''
  }
}

const testStatus = computed(() => {
  if (testing.value) return '测试中...'
  if (lastTestOk.value === true) return 'OK'
  if (lastTestOk.value === false) return '失败'
  return ''
})

const goBack = () => {
  uni.navigateBack()
}

const onApiBaseNativeInput = (e: any) => {
  // 原生 input 在 uni-app 下统一从 e.detail.value 取值
  const v = e?.detail?.value
  apiBaseRaw.value = v === undefined || v === null ? '' : String(v)
}

const normalize = (v: string) => {
  const s = (v || '').trim().replace(/\/+$/, '')
  return s
}

onMounted(() => {
  try {
    const current = uni.getStorageSync('api_base')
    apiBaseRaw.value = typeof current === 'string' && current ? current : getDefaultBaseUrl()
  } catch {
    apiBaseRaw.value = getDefaultBaseUrl()
  }

  refreshEffectiveBase()
})

onShow(() => {
  guardAccess()
  try {
    const current = uni.getStorageSync('api_base')
    apiBaseRaw.value = typeof current === 'string' && current ? current : getDefaultBaseUrl()
  } catch {
    apiBaseRaw.value = getDefaultBaseUrl()
  }

  refreshEffectiveBase()
})

const save = () => {
  if (!showApiBase.value) return
  const v = normalize(apiBaseRaw.value)
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
    apiBaseRaw.value = v
    refreshEffectiveBase()
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const clear = () => {
  if (!showApiBase.value) return
  try {
    uni.removeStorageSync('api_base')
    apiBaseRaw.value = defaultBase.value || ''
    lastTestOk.value = null
    refreshEffectiveBase()
    uni.showToast({ title: '已恢复默认', icon: 'none' })
  } catch {
    uni.showToast({ title: '清除失败', icon: 'none' })
  }
}

const testHealth = async () => {
  if (!showApiBase.value) return
  testing.value = true
  lastTestOk.value = null
  try {
    // 使用统一的 request 封装，确保与业务请求行为一致，包括鉴权、代理、超时等
    const res = await request({
      url: '/api/health/',
      method: 'GET',
      timeout: 5000,
      noAuth: true,
      silent: true,
    })

    // request 封装内部已处理 2xx 成功，直接走这里就是成功
    lastTestOk.value = true
    uni.showToast({ title: '连接成功', icon: 'success' })
  } catch (e: any) {
    lastTestOk.value = false
    const msg = String(e?.errMsg || e?.message || '').trim()
    let showMsg = msg ? `连接失败：${msg}` : '网络连接失败'
    uni.showToast({ title: showMsg, icon: 'none', duration: 3000 })
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
  width: 100%;
  overflow-x: hidden;
}

.nav-bar {
  height: 88rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  /* #ifdef APP-PLUS */
  padding-top: var(--status-bar-height);
  height: calc(88rpx + var(--status-bar-height));
  /* #endif */
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
  width: 100%;
  min-width: 0;
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

.native-field {
  padding: 18rpx 24rpx 10rpx;
}

.native-label {
  font-size: 24rpx;
  color: var(--text-muted);
  margin-bottom: 10rpx;
}

.native-input {
  width: 100%;
  height: 72rpx;
  padding: 0 18rpx;
  border-radius: 14rpx;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-size: 28rpx;
  border: 1px solid var(--border-color);
  box-sizing: border-box;
}

.tips {
  padding: 8rpx 24rpx 18rpx;
}

.current {
  padding: 14rpx 24rpx 0;
}

.current-label {
  font-size: 22rpx;
  color: var(--text-muted);
}

.current-value {
  font-size: 22rpx;
  color: var(--text-color);
  display: block;
  max-width: 100%;
  word-break: break-all;
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
