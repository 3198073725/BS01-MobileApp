import { defineStore } from 'pinia';
import request from '@/utils/request';

export const useConfigStore = defineStore('config', {
  state: () => ({
    configs: {} as Record<string, any>,
    version: uni.getStorageSync('config_version') || '0',
    loading: false,
    lastUpdatedAt: 0
  }),
  actions: {
    async fetchConfigs() {
      this.loading = true;
      try {
        const data: any = await request({ url: '/api/configs/global/', noAuth: true, silent: true });
        const newVersion = String(data.config_version || '0');
        this.configs = data;
        this.version = newVersion;
        this.lastUpdatedAt = Date.now();
        uni.setStorageSync('config_version', newVersion);
        try { uni.$emit('config-store:updated', { version: newVersion, at: this.lastUpdatedAt }) } catch { }
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
