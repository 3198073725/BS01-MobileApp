<template>
  <view class="maintenance-page">
    <view class="maintenance-card">
      <text class="maintenance-icon">🚧</text>
      <text class="maintenance-title">系统维护中</text>
      <text class="maintenance-desc">为了提供更好的服务，系统正在升级维护，请稍后再试。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style scoped>
.maintenance-page {
  min-height: 100vh;
  padding: 32px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-color);
}

.maintenance-card {
  width: 100%;
  max-width: 360px;
  padding: 40px 24px;
  border-radius: 24px;
  background: var(--card-bg);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.maintenance-icon {
  font-size: 56px;
  line-height: 1;
}

.maintenance-title {
  margin-top: 18px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color);
}

.maintenance-desc {
  margin-top: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
