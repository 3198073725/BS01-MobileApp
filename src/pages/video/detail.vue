<template>
  <VideoDetailView :theme="theme" :page="page" />
</template>

<script setup lang="ts">
import { ref, onUnmounted, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import VideoDetailView from '@/components/VideoDetailView.vue'
import { useVideoDetailPage } from '@/composables/useVideoDetailPage'

const theme = ref(uni.getStorageSync('theme') || 'light')
const onThemeChange = (t: string) => {
  theme.value = t
}

const page = reactive(useVideoDetailPage({
  defaultQualityLabel: '自动',
  enableHlsFallback: true,
}))

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

onLoad((options: any) => {
  uni.$on('menu:theme-change', onThemeChange)
  if (options.id) {
    page.videoId = options.id
    page.fetchVideoDetail()
  }
})
</script>
