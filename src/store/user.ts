import { defineStore } from 'pinia';
import { notifySystemEventsAuthChanged } from '@/utils/systemEvents';

interface UserInfo {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  is_verified: boolean;
  is_creator: boolean;
}

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: uni.getStorageSync('userInfo') || null as UserInfo | null,
  }),
  getters: {
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    setToken(token: string) {
      this.token = token;
      uni.setStorageSync('token', token);
      try { notifySystemEventsAuthChanged() } catch {}
    },
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo;
      uni.setStorageSync('userInfo', userInfo);
    },
    logout() {
      this.token = '';
      this.userInfo = null;
      uni.removeStorageSync('token');
      uni.removeStorageSync('refreshToken');
      uni.removeStorageSync('userInfo');
      uni.removeStorageSync('login_redirect');
      uni.removeStorageSync('login_intent');
      try { notifySystemEventsAuthChanged() } catch {}
      try {
        uni.removeTabBarBadge({ index: 2 });
      } catch {}
    },
  },
});
