<template>
  <view :class="['edit-container', theme]">
    <van-cell-group inset class="form-group" :border="theme !== 'dark'">
      <van-cell title="头像" center>
        <template #value>
          <van-image
            round
            width="80rpx"
            height="80rpx"
            :src="formatImageUrl(userInfo)"
            @click="handleUploadAvatar"
          />
        </template>
      </van-cell>
      <van-field
        v-model="userInfo.nickname"
        label="昵称"
        placeholder="请输入昵称"
        input-align="right"
      />
      <van-field
        v-model="userInfo.email"
        label="邮箱"
        readonly
        input-align="right"
      />
    </van-cell-group>

    <view class="actions">
      <van-button type="primary" block @click="handleSave" :loading="loading">保存修改</van-button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/store/user'
import { formatImageUrl } from '@/utils/image'
import request, { BASE_URL } from '@/utils/request'

const userStore = useUserStore()
const theme = ref(uni.getStorageSync('theme') || 'light')
const userInfo = ref({
  nickname: '',
  email: '',
  avatar_url: '',
  profile_picture: ''
})
const loading = ref(false)

const onThemeChange = (t: string) => {
  theme.value = t
}

onMounted(() => {
  uni.$on('menu:theme-change', onThemeChange)
  if (userStore.userInfo) {
    userInfo.value = { ...userStore.userInfo }
  }
})

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const handleUploadAvatar = () => {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const tempFilePath = res.tempFilePaths[0]
      uni.uploadFile({
        url: `${BASE_URL}/api/users/avatar/upload/`,
        filePath: tempFilePath,
        name: 'avatar',
        header: {
          'Authorization': `Bearer ${userStore.token}`
        },
        success: (uploadRes) => {
          const data = JSON.parse(uploadRes.data)
          userInfo.value.profile_picture = data.avatar_url || data.profile_picture
          uni.showToast({ title: '头像上传成功', icon: 'success' })
        }
      })
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

:deep(.van-cell__title) {
  color: var(--text-color) !important;
}
</style>
