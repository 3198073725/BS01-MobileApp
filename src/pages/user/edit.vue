<template>
  <view :class="['edit-container', theme]">
    <van-cell-group inset class="form-group" :border="theme !== 'dark'">
      <van-cell title="头像" center>
        <template #value>
          <van-image round width="80rpx" height="80rpx" :key="avatarSrc" :src="avatarSrc" @click="handleUploadAvatar" />
        </template>
      </van-cell>
      <van-cell title="昵称" center>
        <template #value>
          <view class="nickname-wrap">
            <van-field
              v-model="nicknameModel"
              placeholder="请输入昵称"
              input-align="right"
              :border="false"
              class="nickname-field"
            />
          </view>
        </template>
      </van-cell>
      <van-cell title="邮箱" :value="userInfo.email" />
      <van-cell title="邮箱验证" center>
        <template #value>
          <view class="verify-row">
            <text class="verify-status" :class="{ ok: userInfo.is_verified }">{{ userInfo.is_verified ? '已验证' : '未验证'
              }}</text>
            <van-button v-if="!userInfo.is_verified" size="small" type="primary" plain :loading="verifying"
              @click="handleSendVerifyEmail">
              发送验证邮件
            </van-button>
            <van-button v-else size="small" type="primary" plain :loading="refreshing" @click="fetchMe">
              刷新状态
            </van-button>
          </view>
        </template>
      </van-cell>
    </van-cell-group>

    <view class="actions">
      <van-button type="primary" block @click="handleSave" :loading="loading">保存修改</van-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatImageUrl } from '@/utils/image'
import request, { getBaseUrl } from '@/utils/request'

const userStore = useUserStore()
const theme = ref(uni.getStorageSync('theme') || 'light')
const userInfo = ref({
  nickname: '',
  email: '',
  avatar_url: '',
  profile_picture: '',
  is_verified: false,
})

const nicknameModel = computed({
  get() {
    const v: any = (userInfo.value as any)?.nickname
    return v === undefined || v === null ? '' : String(v)
  },
  set(val: any) {
    let v: any = val
    // App/小程序等环境下，部分组件可能把事件对象作为 v-model 值回传
    if (v && typeof v === 'object') {
      v = v?.detail?.value ?? v?.target?.value ?? v?.value
    }
    userInfo.value.nickname = v === undefined || v === null ? '' : String(v)
  }
})

const loading = ref(false)
const verifying = ref(false)
const refreshing = ref(false)

const avatarNonce = ref(Date.now())
const avatarSrc = computed(() => {
  const raw = formatImageUrl(userInfo.value)
  const sep = raw.includes('?') ? '&' : '?'
  return `${raw}${sep}t=${avatarNonce.value}`
})

const onThemeChange = (t: string) => {
  theme.value = t
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
})

watch(
  () => userStore.userInfo,
  async (val) => {
    if (!val) return
    const u: any = val
    userInfo.value = {
      ...u,
      nickname: u?.nickname === undefined || u?.nickname === null ? '' : String(u.nickname),
      email: u?.email === undefined || u?.email === null ? '' : String(u.email),
      is_verified: !!u?.is_verified,
    }
    await nextTick()
  },
  { immediate: true }
)

const fetchMe = async () => {
  if (!userStore.isLoggedIn) return
  if (refreshing.value) return
  refreshing.value = true
  try {
    const res = await request({ url: '/api/users/me/', silent: true })
    if (res) {
      userStore.setUserInfo(res)
      const u: any = res
      userInfo.value = {
        ...u,
        nickname: u?.nickname === undefined || u?.nickname === null ? '' : String(u.nickname),
        email: u?.email === undefined || u?.email === null ? '' : String(u.email),
        is_verified: !!u?.is_verified,
      }
      await nextTick()
    }
  } catch { }
  finally {
    refreshing.value = false
  }
}

const handleSendVerifyEmail = async () => {
  if (verifying.value) return
  verifying.value = true
  try {
    await request({
      url: '/api/users/verify-email/request/',
      method: 'POST',
      data: {},
    })

    uni.showModal({
      title: '已发送验证邮件',
      content: '请前往邮箱打开验证链接完成认证。完成后回到 App 点击“刷新状态”。',
      confirmText: '刷新状态',
      cancelText: '知道了',
      success: (res) => {
        if (res.confirm) fetchMe()
      }
    })
  } catch {
  } finally {
    verifying.value = false
  }
}

onShow(() => {
  fetchMe()
})

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const handleUploadAvatar = () => {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      const baseUrl = getBaseUrl().replace(/\/$/, '')
      uni.uploadFile({
        url: `${getBaseUrl()}/api/users/avatar/upload/`,
        filePath: tempFilePath,
        name: 'avatar',
        header: {
          'Authorization': `Bearer ${userStore.token}`
        },
        success: (uploadRes) => {
          try {
            if (uploadRes.statusCode < 200 || uploadRes.statusCode >= 300) {
              let msg = `上传失败：HTTP ${uploadRes.statusCode}`
              try {
                const parsed = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : uploadRes.data
                msg = String(parsed?.detail || parsed?.file || parsed?.message || msg)
              } catch { }
              uni.showToast({ title: msg, icon: 'none' })
              return
            }
            const data = typeof uploadRes.data === 'string' ? JSON.parse(uploadRes.data) : (uploadRes.data as any)
            const newPic = data?.profile_picture || data?.avatar_url
            if (newPic) {
              userInfo.value.profile_picture = newPic
              try {
                userStore.setUserInfo({ ...(userStore.userInfo || {}), ...userInfo.value })
              } catch { }
            }
            uni.showToast({ title: '头像上传成功', icon: 'success' })
          } catch (e) {
            uni.showToast({ title: '头像上传失败：返回解析错误', icon: 'none' })
          }
        },
        fail: (e) => {
          const msg = String((e as any)?.errMsg || '').trim()
          uni.showToast({ title: msg ? `头像上传失败：${msg}` : '头像上传失败', icon: 'none' })
        }
      }
      )
    }
  })
}

const handleSave = async () => {
  loading.value = true
  try {
    const res = await request({
      url: '/api/users/me/',
      method: 'PATCH',
      data: {
        nickname: userInfo.value.nickname
      }
    })
    userStore.setUserInfo(res)
    try {
      const me = await request({ url: '/api/users/me/', silent: true })
      if (me) userStore.setUserInfo(me)
    } catch { }
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.edit-container {
  min-height: 100vh;
  background-color: var(--bg-color);
  padding-top: 30rpx;
  box-sizing: border-box;
  /* #ifdef APP-PLUS */
  padding-top: calc(var(--status-bar-height) + 30rpx);
  /* #endif */
}

.form-group {
  margin-top: 20rpx;
  background-color: var(--card-bg) !important;
}

.actions {
  margin-top: 60rpx;
  padding: 0 32rpx;
}

:deep(.van-cell) {
  background-color: var(--card-bg) !important;
  color: var(--text-color) !important;
}

:deep(.van-field__control) {
  color: var(--text-color) !important;
}

.nick-input {
  width: 420rpx;
  text-align: right;
  font-size: 28rpx;
  color: var(--text-color);
}

:deep(.van-cell__title) {
  color: var(--text-color) !important;
}

.verify-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16rpx;
}

.verify-status {
  font-size: 24rpx;
  color: var(--text-muted);
}

.verify-status.ok {
  color: #07c160;
}

.nickname-wrap {
  flex: 1;
  min-width: 260rpx;
  display: flex;
}

:deep(.nickname-field) {
  width: 100%;
  display: block;
}

:deep(.nickname-field .van-field__body) {
  width: 100%;
  min-width: 0;
}

:deep(.nickname-field .van-field__control) {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  text-align: right;
}

:deep(.nickname-field .van-field__control::placeholder) {
  text-align: right;
}

.native-field {
  flex: 1;
  min-width: 200rpx;
  background-color: var(--bg-color);
  border-radius: 14rpx;
  padding: 16rpx 20rpx;
}

.native-input {
  width: 100%;
  text-align: right;
  font-size: 28rpx;
  color: var(--text-color, #18191c);
  -webkit-text-fill-color: var(--text-color, #18191c);
  background-color: transparent;
}
</style>
