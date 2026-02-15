import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useTheme() {
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

  return {
    theme,
    isDark: computed(() => theme.value === 'dark')
  }
}
