<template>
  <view :class="['detail-container', theme]" v-if="page.videoDetail">
    <view class="video-section">
      <video
        id="myVideo"
        class="video-player"
        :src="page.currentSrc"
        :poster="page.currentPoster"
        controls
        autoplay
        object-fit="contain"
        @error="page.onVideoError"
        @timeupdate="page.onTimeUpdate"
        @loadedmetadata="page.applyResumePosition"
        @click="page.togglePlay"
      ></video>

      <view class="player-custom-controls">
        <view class="ctrl-row">
          <picker :range="page.rateOptions" :value="page.rateIndex" @change="page.handleRateChange">
            <view class="ctrl-btn">
              <text>{{ page.playbackRate }}x</text>
            </view>
          </picker>

          <picker
            v-if="page.qualityOptions.length > 0"
            :range="page.qualityOptions"
            range-key="label"
            :value="page.qualityIndex"
            @change="page.handleQualityChange"
          >
            <view class="ctrl-btn">
              <text>{{ page.currentQualityLabel }}</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="content-scroll" @scrolltolower="page.onScrollToLower">
      <view class="main-info">
        <text class="title">{{ page.videoDetail.title }}</text>

        <view class="sub-row">
          <text class="sub-text">{{ page.formatCount(page.videoDetail.view_count) }} 播放</text>
          <text class="sub-dot">·</text>
          <text class="sub-text">{{ page.formatDate(page.videoDetail.created_at) }}</text>
        </view>

        <view class="up-row">
          <view class="up-left" @click="page.goToUser(page.authorId)">
            <image
              class="up-avatar"
              :src="formatImageUrl(page.authorDetail || page.videoDetail.author)"
              mode="aspectFill"
            />
            <view class="up-meta">
              <text class="up-name">{{ page.authorDetail?.nickname || page.videoDetail.author?.name || page.videoDetail.author?.username }}</text>
              <text class="up-fans">{{ page.formatCount(page.authorDetail?.followers_count || 0) }} 粉丝</text>
            </view>
          </view>
          <view
            v-if="!page.isOwner"
            class="follow-btn"
            :class="{ followed: page.isFollowing }"
            @click="page.handleFollow"
          >
            <text class="follow-text">{{ page.isFollowing ? '已关注' : '+ 关注' }}</text>
          </view>
        </view>

        <view class="desc-card" :class="{ expanded: page.isDescExpanded }">
          <text class="desc-text">{{ page.videoDetail.description || '暂无简介' }}</text>
          <view v-if="page.hasLongDescription" class="expand-toggle" @click="page.isDescExpanded = !page.isDescExpanded">
            <text class="toggle-text">{{ page.isDescExpanded ? '收起' : '展开更多' }}</text>
            <van-icon :name="page.isDescExpanded ? 'arrow-up' : 'arrow-down'" size="12px" color="var(--text-muted)" />
          </view>
        </view>

        <view class="tag-row" v-if="page.videoDetail.tags && page.videoDetail.tags.length > 0">
          <view class="tag-item" v-for="tag in page.videoDetail.tags" :key="tag.id">
            <text># {{ tag.name }}</text>
          </view>
        </view>
      </view>

      <view class="comment-section" v-if="page.commentsAllowed">
        <view class="comment-header">
          <view class="comment-title-row">
            <text class="comment-title">评论 {{ page.formatCount(page.videoDetail.comment_count || 0) }}</text>
            <view class="sort-tabs" v-if="page.commentsAllowed">
              <text :class="{ active: page.commentSort === 'hot' }" @click="page.handleSortComments('hot')">按热度</text>
              <text class="sort-divider">|</text>
              <text :class="{ active: page.commentSort === 'new' }" @click="page.handleSortComments('new')">按时间</text>
            </view>
          </view>
        </view>

        <view class="comment-input-area" v-if="page.userStore.isLoggedIn && page.commentsAllowed">
          <image class="user-avatar" :src="formatImageUrl(page.userStore.userInfo)" mode="aspectFill" />
          <view class="input-box" @click="page.handleReply(null)">
            <text class="placeholder">发条友善的评论吧</text>
          </view>
        </view>

        <view class="comment-list">
          <view v-for="comment in page.commentList" :key="comment.id" class="comment-item">
            <image class="comment-avatar" :src="formatImageUrl(comment.user)" mode="aspectFill" />
            <view class="comment-main">
              <view class="comment-user">
                <text class="user-name">{{ comment.user?.nickname || comment.user?.username }}</text>
              </view>
              <text class="comment-content">{{ comment.content }}</text>
              <view class="comment-footer">
                <text class="comment-date">{{ page.formatDate(comment.created_at) }}</text>
                <view class="comment-actions">
                  <view class="action-btn" :class="{ active: comment.is_liked }" @click="page.handleLikeComment(comment)">
                    <van-icon :name="comment.is_liked ? 'good-job' : 'good-job-o'" size="14px" :color="comment.is_liked ? '#1989fa' : 'var(--text-muted)'" />
                    <text class="action-num">{{ comment.like_count || '' }}</text>
                  </view>
                  <text class="reply-btn" @click="page.handleReply(comment)">回复</text>
                  <text v-if="page.canDeleteComment(comment)" class="delete-btn" @click="page.handleDeleteComment(comment)">删除</text>
                </view>
              </view>

              <view v-if="comment.replies_count > 0 || (comment._replies && comment._replies.length > 0)" class="replies-container">
                <view v-if="!comment._showReplies" class="expand-replies" @click="page.toggleReplies(comment)">
                  <text class="expand-text">展开 {{ comment.replies_count }} 条回复</text>
                  <van-icon name="arrow-down" size="12px" color="#1989fa" />
                </view>

                <view v-else class="replies-list">
                  <view v-for="reply in comment._replies" :key="reply.id" class="reply-item">
                    <image class="reply-avatar" :src="formatImageUrl(reply.user)" mode="aspectFill" />
                    <view class="reply-main">
                      <view class="reply-user">
                        <text class="user-name">{{ reply.user?.nickname || reply.user?.username }}</text>
                        <text v-if="reply.parent && reply.parent !== comment.id" class="reply-to">
                          回复 <text class="reply-to-name">@{{ page.getReplyTargetName(reply, comment) }}</text>
                        </text>
                      </view>
                      <text class="reply-content">{{ reply.content }}</text>
                      <view class="comment-footer">
                        <text class="comment-date">{{ page.formatDate(reply.created_at) }}</text>
                        <view class="comment-actions">
                          <view class="action-btn" :class="{ active: reply.is_liked }" @click="page.handleLikeComment(reply)">
                            <van-icon :name="reply.is_liked ? 'good-job' : 'good-job-o'" size="12px" :color="reply.is_liked ? '#1989fa' : 'var(--text-muted)'" />
                            <text class="action-num">{{ reply.like_count || '' }}</text>
                          </view>
                          <text class="reply-btn" @click="page.handleReply(reply, comment)">回复</text>
                          <text v-if="page.canDeleteComment(reply)" class="delete-btn" @click="page.handleDeleteComment(reply, comment)">删除</text>
                        </view>
                      </view>
                    </view>
                  </view>

                  <view v-if="comment._repliesHasNext" class="more-replies" @click="page.loadMoreReplies(comment)">
                    <text class="more-text">加载更多回复</text>
                  </view>
                  <view class="collapse-replies" @click="page.toggleReplies(comment)">
                    <text class="expand-text">收起回复</text>
                    <van-icon name="arrow-up" size="12px" color="#1989fa" />
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-if="!page.commentsLoading && page.commentsFinished && page.commentList.length === 0" class="empty-comments">
            <text class="empty-text">暂无评论</text>
          </view>

          <view class="list-status">
            <van-loading v-if="page.commentsLoading" size="16px">加载中...</van-loading>
            <text v-else-if="page.commentsFinished" class="no-more">没有更多了</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <van-popup
      v-model:show="page.showCommentInput"
      position="bottom"
      round
      custom-style="padding: 24rpx;"
    >
      <view class="popup-input-wrap">
        <van-field
          :model-value="page.commentContent"
          @update:model-value="page.onCommentContentChange"
          type="textarea"
          :placeholder="page.replyTarget ? `回复 @${page.replyTarget.user?.nickname || page.replyTarget.user?.username}` : '发条友善的评论吧'"
          autosize
          :border="false"
          focus
          class="comment-field"
        />
        <view class="popup-footer">
          <van-button
            type="primary"
            size="small"
            round
            :loading="page.submitting"
            @click="page.submitComment"
            :disabled="!String(page.commentContent || '').trim()"
          >
            发布
          </van-button>
        </view>
      </view>
    </van-popup>

    <view class="bottom-bar">
      <view class="action-item" :class="{ active: page.videoDetail.liked }" @click="page.handleLike">
        <van-icon :name="page.videoDetail.liked ? 'good-job' : 'good-job-o'" size="22px" :color="page.videoDetail.liked ? '#1989fa' : 'var(--text-color)'" />
        <text class="action-text">{{ page.formatCount(page.videoDetail.like_count || 0) }}</text>
      </view>
      <view class="action-item" :class="{ active: page.videoDetail.favorited }" @click="page.handleCollect">
        <van-icon :name="page.videoDetail.favorited ? 'star' : 'star-o'" size="22px" :color="page.videoDetail.favorited ? '#1989fa' : 'var(--text-color)'" />
        <text class="action-text">{{ page.formatCount(page.videoDetail.collect_count || 0) }}</text>
      </view>
      <view class="action-item">
        <van-icon name="comment-o" size="22px" color="var(--text-color)" />
        <text class="action-text">{{ page.formatCount(page.videoDetail.comment_count || 0) }}</text>
      </view>
      <view class="action-item" @click="page.handleShare">
        <van-icon name="share-o" size="22px" color="var(--text-color)" />
        <text class="action-text">分享</text>
      </view>
    </view>

    <van-popup
      v-model:show="page.showSharePopup"
      position="bottom"
      round
      custom-style="padding: 40rpx 20rpx 100rpx;"
    >
      <view class="share-title">更多操作</view>
      <view class="share-grid">
        <view class="share-item" @click="page.handleCopyLink">
          <view class="icon-wrap gray">
            <van-icon name="link-o" size="24px" />
          </view>
          <text class="share-text">复制链接</text>
        </view>
        <view class="share-item" @click="page.handleToggleWatchLater">
          <view class="icon-wrap" :class="{ active: page.videoDetail.watch_later }">
            <van-icon :name="page.videoDetail.watch_later ? 'clock' : 'clock-o'" size="24px" />
          </view>
          <text class="share-text">{{ page.videoDetail.watch_later ? '取消稍后看' : '稍后再看' }}</text>
        </view>
      </view>
    </van-popup>
  </view>

  <view v-else-if="page.loading" class="loading-state">
    <van-loading size="24px" color="#1989fa">加载中...</van-loading>
  </view>
</template>

<script setup lang="ts">
import { formatImageUrl } from '@/utils/image'

defineProps<{
  theme: string
  page: any
}>()
</script>

<style scoped>
.detail-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--card-bg);
  color: var(--text-color);
  width: 100%;
  overflow-x: hidden;
}

.video-section {
  width: 100%;
  aspect-ratio: 16/9;
  background-color: #000;
  position: relative;
}

.video-player {
  width: 100%;
  height: 100%;
}

.player-custom-controls {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.ctrl-row {
  display: flex;
  gap: 12rpx;
}

.ctrl-btn {
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 8rpx;
  padding: 6rpx 16rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
}

.ctrl-btn text {
  color: #fff;
  font-size: 22rpx;
}

.content-scroll {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 0 24rpx 120rpx;
  overflow-x: hidden;
}

.main-info {
  padding: 28rpx 0 24rpx;
}

.title {
  font-size: 34rpx;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text-color);
}

.sub-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 14rpx;
}

.sub-text,
.sub-dot {
  font-size: 22rpx;
  color: var(--text-muted);
}

.up-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20rpx;
  margin-top: 28rpx;
  min-width: 0;
}

.up-left {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.up-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: var(--border-color);
}

.up-meta {
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.up-name {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.up-fans {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.follow-btn {
  min-width: 132rpx;
  height: 56rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: #1989fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.follow-btn.followed {
  background: var(--border-color);
}

.follow-text {
  font-size: 24rpx;
  color: #fff;
}

.follow-btn.followed .follow-text {
  color: var(--text-muted);
}

.desc-card {
  margin-top: 24rpx;
  padding: 22rpx;
  background: var(--bg-color);
  border-radius: 20rpx;
}

.desc-text {
  font-size: 26rpx;
  color: var(--text-color);
  line-height: 1.7;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.desc-card.expanded .desc-text {
  display: block;
}

.expand-toggle {
  margin-top: 14rpx;
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.toggle-text {
  font-size: 24rpx;
  color: var(--text-muted);
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 22rpx;
}

.tag-item {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: var(--bg-color);
}

.tag-item text {
  font-size: 22rpx;
  color: var(--text-muted);
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100rpx;
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--card-bg);
  border-top: 1rpx solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 30;
}

.action-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  flex: 1;
}

.action-item.active .action-text {
  color: #1989fa;
}

.action-text {
  font-size: 20rpx;
  color: var(--text-muted);
}

.share-title {
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 32rpx;
}

.share-grid {
  display: flex;
  justify-content: center;
  gap: 60rpx;
}

.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(25, 137, 250, 0.12);
  color: #1989fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrap.gray {
  background: var(--bg-color);
  color: var(--text-color);
}

.icon-wrap.active {
  background: #1989fa;
  color: #fff;
}

.share-text {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.comment-section {
  padding-bottom: 32rpx;
}

.comment-header {
  margin-bottom: 24rpx;
}

.comment-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20rpx;
  min-width: 0;
}

.comment-title {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--text-color);
  flex: 1;
  min-width: 0;
}

.sort-tabs {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 22rpx;
  color: var(--text-muted);
  flex-shrink: 0;
  white-space: nowrap;
}

.sort-tabs .active {
  color: #1989fa;
  font-weight: 600;
}

.sort-divider {
  color: var(--border-color);
}

.comment-input-area {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--border-color);
}

.input-box {
  flex: 1;
  height: 68rpx;
  border-radius: 999rpx;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.placeholder {
  font-size: 24rpx;
  color: var(--text-muted);
}

.comment-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
}

.comment-avatar,
.reply-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: var(--border-color);
  flex-shrink: 0;
}

.comment-main,
.reply-main {
  flex: 1;
  min-width: 0;
}

.comment-user,
.reply-user {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.user-name {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-color);
}

.reply-to,
.reply-to-name {
  font-size: 22rpx;
  color: var(--text-muted);
}

.comment-content,
.reply-content {
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: var(--text-color);
  word-break: break-word;
}

.comment-footer {
  margin-top: 14rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20rpx;
}

.comment-date {
  font-size: 20rpx;
  color: var(--text-muted);
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.action-btn,
.reply-btn,
.delete-btn {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.action-btn.active {
  color: #1989fa;
}

.action-num {
  font-size: 20rpx;
}

.delete-btn {
  color: #ee0a24;
}

.replies-container {
  margin-top: 18rpx;
  padding: 18rpx;
  border-radius: 18rpx;
  background: var(--bg-color);
}

.expand-replies,
.collapse-replies,
.more-replies {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
}

.expand-text,
.more-text {
  font-size: 22rpx;
  color: #1989fa;
}

.replies-list {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.reply-item {
  display: flex;
  gap: 14rpx;
}

.empty-comments {
  padding: 40rpx 0;
  display: flex;
  justify-content: center;
}

.empty-text,
.no-more {
  font-size: 22rpx;
  color: var(--text-muted);
}

.list-status {
  padding: 16rpx 0 0;
  display: flex;
  justify-content: center;
}

.popup-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.comment-field {
  min-height: 160rpx;
  background: var(--bg-color);
  border-radius: 16rpx;
  padding: 16rpx;
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
}

.loading-state {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg);
}
</style>
