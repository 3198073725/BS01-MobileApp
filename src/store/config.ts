import { defineStore } from 'pinia';
import request from '@/utils/request';

export const useConfigStore = defineStore('config', {
  state: () => ({
    configs: {} as Record<string, any>,
    version: uni.getStorageSync('config_version') || '0',
    loading: false
  }),
  actions: {
    async fetchConfigs() {
      this.loading = true;
      try {
        const data: any = await request({ url: '/api/configs/global/', noAuth: true, silent: true });
        const newVersion = String(data.config_version || '0');
        
        // 如果版本号变更，且不是第一次加载（version不为0），则强制重启/刷新
        if (this.version !== '0' && this.version !== newVersion) {
          uni.setStorageSync('config_version', newVersion);
          // 移动端通常使用 reLaunch 重置整个应用栈，模拟刷新
          uni.reLaunch({
            url: '/pages/index/index',
            success: () => {
              // #ifdef H5
              window.location.reload();
              // #endif
            }
          });
          return;
        }
        
        this.configs = data;
        this.version = newVersion;
        uni.setStorageSync('config_version', newVersion);
      } catch (e) {
        console.error('Failed to fetch global configs:', e);
      } finally {
        this.loading = false;
      }
    }
  },
  getters: {
    get: (state) => (key: string, defaultValue: any = true) => {
      const val = state.configs[key];
      if (val === undefined || val === null) return defaultValue;
      return val;
    }
  }
});
