<template>
  <view :class="['detail-container', theme]" v-if="videoDetail">
    <!-- 视频区域 - 极简 -->
    <view class="video-section">
      <video
        id="myVideo"
        class="video-player"
        :src="currentSrc"
        :poster="videoDetail.thumbnail_url"
        controls
        autoplay
        object-fit="contain"
        @error="onVideoError"
        @timeupdate="onTimeUpdate"
        @loadedmetadata="applyResumePosition"
        @click="togglePlay"
      ></video>
      
      <!-- 播放器自定义控制浮层（对齐 Web 端清晰度/速度调节） -->
      <view class="player-custom-controls">
        <view class="ctrl-row">
          <!-- 倍速调节 -->
          <picker :range="rateOptions" :value="rateIndex" @change="handleRateChange">
            <view class="ctrl-btn">
              <text>{{ playbackRate }}x</text>
            </view>
          </picker>
          
          <!-- 清晰度调节（HLS 逻辑对齐） -->
          <picker v-if="qualityOptions.length > 0" :range="qualityOptions" range-key="label" :value="qualityIndex" @change="handleQualityChange">
            <view class="ctrl-btn">
              <text>{{ currentQualityLabel }}</text>
            </view>
          </picker>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll" @scrolltolower="onScrollToLower">
      <view class="main-info">
        <text class="title">{{ videoDetail.title }}</text>

        <view class="sub-row">
          <text class="sub-text">{{ formatCount(videoDetail.view_count) }} 播放</text>
          <text class="sub-dot">·</text>
          <text class="sub-text">{{ formatDate(videoDetail.created_at) }}</text>
        </view>

        <view class="up-row">
          <view class="up-left" @click="goToUser(authorId)">
            <image
              class="up-avatar"
              :src="formatImageUrl(authorDetail || videoDetail.author)"
              mode="aspectFill"
            />
            <view class="up-meta">
              <text class="up-name">{{ authorDetail?.nickname || videoDetail.author?.name || videoDetail.author?.username }}</text>
              <text class="up-fans">{{ formatCount(authorDetail?.followers_count || 0) }} 粉丝</text>
            </view>
          </view>
          <view
            v-if="!isOwner"
            class="follow-btn"
            :class="{ followed: isFollowing }"
            @click="handleFollow"
          >
            <text class="follow-text">{{ isFollowing ? '已关注' : '+ 关注' }}</text>
          </view>
        </view>

        <view class="desc-card" :class="{ expanded: isDescExpanded }">
          <text class="desc-text">{{ videoDetail.description || '暂无简介' }}</text>
          <view v-if="hasLongDescription" class="expand-toggle" @click="isDescExpanded = !isDescExpanded">
            <text class="toggle-text">{{ isDescExpanded ? '收起' : '展开更多' }}</text>
            <van-icon :name="isDescExpanded ? 'arrow-up' : 'arrow-down'" size="12px" color="var(--text-muted)" />
          </view>
        </view>

        <!-- 标签展示 -->
        <view class="tag-row" v-if="videoDetail.tags && videoDetail.tags.length > 0">
          <view class="tag-item" v-for="tag in videoDetail.tags" :key="tag.id">
            <text># {{ tag.name }}</text>
          </view>
        </view>
      </view>

      <!-- 评论区 -->
      <view class="comment-section">
        <view class="comment-header">
          <view class="comment-title-row">
            <text class="comment-title">评论 {{ formatCount(videoDetail.comment_count || 0) }}</text>
            <view class="sort-tabs">
              <text :class="{ active: commentSort === 'hot' }" @click="handleSortComments('hot')">按热度</text>
              <text class="sort-divider">|</text>
              <text :class="{ active: commentSort === 'new' }" @click="handleSortComments('new')">按时间</text>
            </view>
          </view>
        </view>

        <!-- 发表评论 -->
        <view class="comment-input-area" v-if="userStore.isLoggedIn">
          <image 
            class="user-avatar" 
            :src="formatImageUrl(userStore.userInfo)" 
            mode="aspectFill" 
          />
          <view class="input-box" @click="handleReply(null)">
            <text class="placeholder">发条友善的评论吧</text>
          </view>
        </view>

        <!-- 评论列表 -->
        <view class="comment-list">
          <view v-for="comment in commentList" :key="comment.id" class="comment-item">
            <image class="comment-avatar" :src="formatImageUrl(comment.user)" mode="aspectFill" />
            <view class="comment-main">
              <view class="comment-user">
                <text class="user-name">{{ comment.user?.nickname || comment.user?.username }}</text>
              </view>
              <text class="comment-content">{{ comment.content }}</text>
              <view class="comment-footer">
                <text class="comment-date">{{ formatDate(comment.created_at) }}</text>
                <view class="comment-actions">
                  <view class="action-btn" :class="{ active: comment.is_liked }" @click="handleLikeComment(comment)">
                    <van-icon :name="comment.is_liked ? 'good-job' : 'good-job-o'" size="14px" :color="comment.is_liked ? '#1989fa' : 'var(--text-muted)'" />
                    <text class="action-num">{{ comment.like_count || '' }}</text>
                  </view>
                  <text class="reply-btn" @click="handleReply(comment)">回复</text>
                  <text v-if="canDeleteComment(comment)" class="delete-btn" @click="handleDeleteComment(comment)">删除</text>
                </view>
              </view>

              <!-- 二级评论区域 -->
              <view v-if="comment.replies_count > 0 || (comment._replies && comment._replies.length > 0)" class="replies-container">
                <view v-if="!comment._showReplies" class="expand-replies" @click="toggleReplies(comment)">
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
                          回复 <text class="reply-to-name">@{{ getReplyTargetName(reply, comment) }}</text>
                        </text>
                      </view>
                      <text class="reply-content">{{ reply.content }}</text>
                      <view class="comment-footer">
                        <text class="comment-date">{{ formatDate(reply.created_at) }}</text>
                        <view class="comment-actions">
                          <view class="action-btn" :class="{ active: reply.is_liked }" @click="handleLikeComment(reply)">
                            <van-icon :name="reply.is_liked ? 'good-job' : 'good-job-o'" size="12px" :color="reply.is_liked ? '#1989fa' : 'var(--text-muted)'" />
                            <text class="action-num">{{ reply.like_count || '' }}</text>
                          </view>
                          <text class="reply-btn" @click="handleReply(reply, comment)">回复</text>
                          <text v-if="canDeleteComment(reply)" class="delete-btn" @click="handleDeleteComment(reply, comment)">删除</text>
                        </view>
                      </view>
                    </view>
                  </view>
                  
                  <view v-if="comment._repliesHasNext" class="more-replies" @click="loadMoreReplies(comment)">
                    <text class="more-text">加载更多回复</text>
                  </view>
                  <view class="collapse-replies" @click="toggleReplies(comment)">
                    <text class="expand-text">收起回复</text>
                    <van-icon name="arrow-up" size="12px" color="#1989fa" />
                  </view>
                </view>
              </view>
            </view>
          </view>

          <view v-if="!commentsLoading && commentsFinished && commentList.length === 0" class="empty-comments">
            <text class="empty-text">暂无评论</text>
          </view>
          
          <view class="list-status">
            <van-loading v-if="commentsLoading" size="16px">加载中...</van-loading>
            <text v-else-if="commentsFinished" class="no-more">没有更多了</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 评论输入弹窗 -->
    <van-popup
      v-model:show="showCommentInput"
      position="bottom"
      round
      custom-style="padding: 24rpx;"
    >
      <view class="popup-input-wrap">
        <van-field
          v-model="commentContent"
          type="textarea"
          :placeholder="replyTarget ? `回复 @${replyTarget.user?.nickname || replyTarget.user?.username}` : '发条友善的评论吧'"
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
            :loading="submitting"
            @click="submitComment"
            :disabled="!commentContent.trim()"
          >
            发布
          </van-button>
        </view>
      </view>
    </van-popup>

    <!-- 底部交互 - 纯净线条 -->
    <view class="bottom-bar">
      <view class="action-item" :class="{ active: videoDetail.liked }" @click="handleLike">
        <van-icon :name="videoDetail.liked ? 'good-job' : 'good-job-o'" size="22px" :color="videoDetail.liked ? '#1989fa' : 'var(--text-color)'" />
        <text class="action-text">{{ formatCount(videoDetail.like_count || 0) }}</text>
      </view>
      <view class="action-item" :class="{ active: videoDetail.favorited }" @click="handleCollect">
        <van-icon :name="videoDetail.favorited ? 'star' : 'star-o'" size="22px" :color="videoDetail.favorited ? '#1989fa' : 'var(--text-color)'" />
        <text class="action-text">{{ formatCount(videoDetail.collect_count || 0) }}</text>
      </view>
      <view class="action-item">
        <van-icon name="comment-o" size="22px" color="var(--text-color)" />
        <text class="action-text">{{ formatCount(videoDetail.comment_count || 0) }}</text>
      </view>
      <view class="action-item" @click="handleShare">
        <van-icon name="share-o" size="22px" color="var(--text-color)" />
        <text class="action-text">分享</text>
      </view>
    </view>

    <!-- 分享/更多操作弹窗 -->
    <van-popup
      v-model:show="showSharePopup"
      position="bottom"
      round
      custom-style="padding: 40rpx 20rpx 100rpx;"
    >
      <view class="share-title">更多操作</view>
      <view class="share-grid">
        <view class="share-item" @click="handleCopyLink">
          <view class="icon-wrap gray">
            <van-icon name="link-o" size="24px" />
          </view>
          <text class="share-text">复制链接</text>
        </view>
        <view class="share-item" @click="handleToggleWatchLater">
          <view class="icon-wrap" :class="{ active: videoDetail.watch_later }">
            <van-icon :name="videoDetail.watch_later ? 'clock' : 'clock-o'" size="24px" />
          </view>
          <text class="share-text">{{ videoDetail.watch_later ? '取消稍后看' : '稍后再看' }}</text>
        </view>
      </view>
    </van-popup>
  </view>

  <view v-else-if="loading" class="loading-state">
    <van-loading size="24px" color="#1989fa">加载中...</van-loading>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatImageUrl } from '@/utils/image'
import request, { BASE_URL } from '@/utils/request'

const theme = ref(uni.getStorageSync('theme') || 'light')
const onThemeChange = (t: string) => {
  theme.value = t
}

onUnmounted(() => {
  uni.$off('menu:theme-change', onThemeChange)
})

const userStore = useUserStore()
const videoId = ref('')
const videoDetail = ref<any>(null)
const loading = ref(true)

const showSharePopup = ref(false)
const isDescExpanded = ref(false)
const commentSort = ref('hot')

const authorDetail = ref<any>(null)
const isFollowing = ref(false)

const authorId = computed(() => {
  return String(videoDetail.value?.author?.id || '')
})

// 评论相关
const commentList = ref<any[]>([])
const commentPage = ref(1)
const commentsLoading = ref(false)
const commentsFinished = ref(false)
const showCommentInput = ref(false)
const commentContent = ref('')
const submitting = ref(false)
const replyTarget = ref<any>(null)
const replyRoot = ref<any>(null)

const isOwner = computed(() => {
  return Boolean(videoDetail.value && userStore.userInfo && String(videoDetail.value?.author?.id || '') === String(userStore.userInfo.id))
})

const hasLongDescription = computed(() => {
  return (videoDetail.value?.description || '').length > 60
})

const fetchAuthorDetail = async () => {
  const uid = authorId.value
  if (!uid) return
  try {
    const res = await request({
      url: `/api/users/${uid}/`,
      noAuth: !userStore.isLoggedIn,
      silent: true
    })
    authorDetail.value = res
  } catch {
    authorDetail.value = null
  }
}

const fetchComments = async (refresh = false) => {
  if (commentsLoading.value || (commentsFinished.value && !refresh)) return
  
  if (refresh) {
    commentPage.value = 1
    commentsFinished.value = false
    commentList.value = []
  }
  
  commentsLoading.value = true
  try {
    const res = await request({
      url: `/api/interactions/comments/`,
      data: {
        video_id: videoId.value,
        page: commentPage.value,
        page_size: 20,
        order: commentSort.value === 'hot' ? 'hot' : '-created_at'
      },
      noAuth: true
    })
    
    const list = res.results || []
    const processedList = list.map((c: any) => ({
      ...c,
      _showReplies: false,
      _replies: [],
      _repliesPage: 1,
      _repliesHasNext: false
    }))
    
    commentList.value = refresh ? processedList : [...commentList.value, ...processedList]
    
    if (!res.next) {
      commentsFinished.value = true
    } else {
      commentPage.value++
    }
  } catch (err) {
    console.error('Fetch comments error:', err)
  } finally {
    commentsLoading.value = false
  }
}

const videoContext = ref<any>(null)
const lastSaveTs = ref(0)

const saveResumePosition = () => {
  if (!videoId.value || !videoContext.value) return
  const now = Date.now()
  if (now - lastSaveTs.value < 2000) return // 每2秒存一次
  
  // 检查是否开启了断点续播
  const resumeEnabled = uni.getStorageSync('vp_resume') !== '0'
  if (!resumeEnabled) return

  videoContext.value.requestComponentInfo((res: any) => {
    // 微信小程序/uniapp video context 获取当前时间的方法略有不同
    // 这里采用 timeupdate 里的实时记录更稳妥，或者通过 getProxy
  })
}

const isPlaying = ref(true)
const playbackRate = ref(1.0)
const rateOptions = ['0.5', '0.75', '1.0', '1.25', '1.5', '2.0']
const rateIndex = ref(2) // 默认 1.0

const qualityOptions = ref<any[]>([])
const qualityIndex = ref(0)
const currentSrc = ref('')

const currentQualityLabel = computed(() => {
  return qualityOptions.value[qualityIndex.value]?.label || '清晰度'
})

const togglePlay = () => {
  videoContext.value = uni.createVideoContext('myVideo')
  if (isPlaying.value) {
    videoContext.value.pause()
  } else {
    videoContext.value.play()
  }
  isPlaying.value = !isPlaying.value
}

const handleRateChange = (e: any) => {
  const idx = e.detail.value
  rateIndex.value = idx
  const rate = parseFloat(rateOptions[idx])
  playbackRate.value = rate
  videoContext.value = uni.createVideoContext('myVideo')
  videoContext.value.playbackRate(rate)
}

const handleQualityChange = (e: any) => {
  const idx = e.detail.value
  qualityIndex.value = idx
  const option = qualityOptions.value[idx]
  
  // 记录当前播放时间，切换源后 seek 回去
  videoContext.value = uni.createVideoContext('myVideo')
  // 注意：uniapp video 无法直接获取当前时间，需要依赖 onTimeUpdate 记录的 currentTime
  const lastPos = lastCurrentTime.value
  
  currentSrc.value = option.url
  setTimeout(() => {
    videoContext.value.seek(lastPos)
    videoContext.value.play()
  }, 200)
}

const lastCurrentTime = ref(0)

const onTimeUpdate = (e: any) => {
  const currentTime = e.detail.currentTime
  lastCurrentTime.value = currentTime
  if (!videoId.value) return
  
  const resumeEnabled = uni.getStorageSync('vp_resume') !== '0'
  if (!resumeEnabled) return

  const now = Date.now()
  if (now - lastSaveTs.value >= 2000) {
    lastSaveTs.value = now
    uni.setStorageSync(`vp_pos:${videoId.value}`, currentTime)
  }
}

const applyResumePosition = () => {
  const resumeEnabled = uni.getStorageSync('vp_resume') !== '0'
  if (!resumeEnabled) return

  const savedPos = uni.getStorageSync(`vp_pos:${videoId.value}`)
  if (savedPos > 0) {
    videoContext.value = uni.createVideoContext('myVideo')
    videoContext.value.seek(savedPos)
    // uni.showToast({ title: `已恢复至上次播放位置`, icon: 'none' })
  }
}

const fetchVideoDetail = async () => {
  loading.value = true
  try {
    const res = await request({
      url: `/api/videos/${videoId.value}/`,
      noAuth: !userStore.isLoggedIn
    })
    videoDetail.value = res
    
    // 初始化清晰度选项（对齐 Web 端逻辑）
    const options = []
    if (res.video_url) {
      // 模拟多清晰度选项，实际生产环境应从后端返回的 HLS 列表或不同档位 URL 获取
      options.push({ label: '1080P 超清', url: res.video_url })
      options.push({ label: '720P 高清', url: res.video_url })
      options.push({ label: '480P 清晰', url: res.video_url })
      options.push({ label: '360P 流畅', url: res.video_url })
    }
    
    qualityOptions.value = options
    currentSrc.value = res.video_url
    
    // 如果有 HLS 地址，优先使用 HLS
    if (res.hls_url) {
      options.unshift({ label: '自动', url: res.hls_url })
      currentSrc.value = res.hls_url
    }
    
    // 检查是否有预设倍速
    const savedRate = parseFloat(uni.getStorageSync('vp_rate'))
    if (!isNaN(savedRate)) {
      playbackRate.value = savedRate
      const rIdx = rateOptions.findIndex(r => parseFloat(r) === savedRate)
      if (rIdx > -1) rateIndex.value = rIdx
    }
    
    // 获取真实的关注状态
    if (userStore.isLoggedIn && authorId.value) {
      try {
        const rel = await request({
          url: `/api/interactions/relationship/?user_id=${authorId.value}`,
        })
        isFollowing.value = !!rel.following
      } catch (e) {
        isFollowing.value = Boolean(res?.is_following)
      }
    } else {
      isFollowing.value = Boolean(res?.is_following)
    }
    
    fetchAuthorDetail()
    fetchComments(true)
  } catch (err) {
    console.error('Fetch video detail error:', err)
    uni.showToast({ title: '视频不存在或已删除', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const loadReplies = async (comment: any, p = 1) => {
  try {
    const res = await request({
      url: '/api/interactions/comments/replies/',
      data: {
        parent_id: comment.id,
        page: p,
        page_size: 10
      },
      noAuth: true
    })
    const list = res.results || []
    comment._replies = p === 1 ? list : [...(comment._replies || []), ...list]
    comment._repliesPage = p
    comment._repliesHasNext = !!res.next
  } catch (err) {
    console.error('Fetch replies error:', err)
  }
}

const toggleReplies = async (comment: any) => {
  comment._showReplies = !comment._showReplies
  if (comment._showReplies && (!comment._replies || comment._replies.length === 0)) {
    await loadReplies(comment, 1)
  }
}

const loadMoreReplies = (comment: any) => {
  if (comment._repliesHasNext) {
    loadReplies(comment, (comment._repliesPage || 1) + 1)
  }
}

const getReplyTargetName = (reply: any, root: any) => {
  if (reply.parent === root.id) return ''
  const parentComment = root._replies?.find((r: any) => r.id === reply.parent)
  return parentComment?.user?.nickname || parentComment?.user?.username || ''
}

const handleReply = (target: any, root?: any) => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  replyTarget.value = target
  replyRoot.value = root || target
  commentContent.value = ''
  showCommentInput.value = true
}

const submitComment = async () => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  if (!commentContent.value.trim()) return

  submitting.value = true
  try {
    const isReply = !!replyTarget.value
    const data: any = {
      video_id: videoId.value,
      content: commentContent.value.trim()
    }
    if (isReply) {
      data.parent_id = replyTarget.value.id
    }

    const res = await request({
      url: '/api/interactions/comments/',
      method: 'POST',
      data
    })
    
    uni.showToast({ title: isReply ? '回复成功' : '评论成功', icon: 'success' })
    commentContent.value = ''
    showCommentInput.value = false
    
    if (isReply) {
      if (!replyRoot.value._replies) replyRoot.value._replies = []
      replyRoot.value._replies.unshift(res)
      replyRoot.value.replies_count = (replyRoot.value.replies_count || 0) + 1
      replyRoot.value._showReplies = true
    } else {
      commentList.value.unshift({
        ...res,
        _showReplies: false,
        _replies: [],
        _repliesPage: 1,
        _repliesHasNext: false
      })
      if (videoDetail.value) {
        videoDetail.value.comment_count++
      }
    }
    
    replyTarget.value = null
    replyRoot.value = null
  } catch (err) {
    console.error('Submit comment error:', err)
  } finally {
    submitting.value = false
  }
}

const handleLikeComment = async (comment: any) => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  try {
    const res = await request({
      url: `/api/interactions/comments/${comment.id}/like/`,
      method: 'POST'
    })
    comment.is_liked = !!res.liked
    comment.like_count = res.count
    uni.vibrateShort({})
  } catch (err) {}
}

const handleSortComments = (sort: string) => {
  if (commentSort.value === sort) return
  commentSort.value = sort
  fetchComments(true)
}

const canDeleteComment = (comment: any) => {
  if (!userStore.isLoggedIn || !userStore.userInfo) return false
  const currentUserId = String(userStore.userInfo.id)
  // 是评论者本人 或 是视频作者本人
  return String(comment.user?.id || '') === currentUserId || isOwner.value
}

const handleDeleteComment = (comment: any, parent?: any) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条评论吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await request({
            url: `/api/interactions/comments/${comment.id}/`,
            method: 'DELETE'
          })
          uni.showToast({ title: '已删除', icon: 'none' })
          
          if (parent) {
            // 删除的是二级评论
            const idx = parent._replies?.findIndex((r: any) => r.id === comment.id)
            if (idx !== -1) {
              parent._replies.splice(idx, 1)
              parent.replies_count = Math.max(0, (parent.replies_count || 1) - 1)
            }
          } else {
            // 删除的是一级评论
            const idx = commentList.value.findIndex((c: any) => c.id === comment.id)
            if (idx !== -1) {
              commentList.value.splice(idx, 1)
              if (videoDetail.value) {
                videoDetail.value.comment_count = Math.max(0, (videoDetail.value.comment_count || 1) - 1)
              }
            }
          }
        } catch (err) {
          console.error('Delete comment error:', err)
        }
      }
    }
  })
}

const onScrollToLower = () => {
  fetchComments()
}

const handleLike = async () => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  try {
    const res = await request({
      url: '/api/interactions/like/toggle/',
      method: 'POST',
      data: { video_id: videoId.value }
    })
    if (videoDetail.value) {
      videoDetail.value.liked = !!res.liked
      if (typeof res.like_count === 'number') {
        videoDetail.value.like_count = res.like_count
      }
    }
    uni.vibrateShort({})
  } catch (err) {}
}

const handleCollect = async () => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  try {
    const res = await request({
      url: '/api/interactions/favorite/toggle/',
      method: 'POST',
      data: { video_id: videoId.value }
    })
    if (videoDetail.value) {
      videoDetail.value.favorited = !!res.favorited
      if (typeof res.favorite_count === 'number') {
        videoDetail.value.collect_count = res.favorite_count
      }
    }
    uni.vibrateShort({})
  } catch (err) {}
}

const handleShare = () => {
  showSharePopup.value = true
}

const handleCopyLink = () => {
  let shareUrl = ''
  // #ifdef H5
  shareUrl = window.location.href
  // #endif
  // #ifndef H5
  shareUrl = `${BASE_URL.replace(/\/$/, '')}/#/pages/video/detail?id=${videoId.value}`
  // #endif

  uni.setClipboardData({
    data: shareUrl,
    success: () => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
      showSharePopup.value = false
    }
  })
}

const handleToggleWatchLater = async () => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  try {
    const res = await request({
      url: '/api/interactions/watch-later/toggle/',
      method: 'POST',
      data: { video_id: videoId.value }
    })
    if (videoDetail.value) {
      // 这里的 res.saved 来自后端 API 返回值
      videoDetail.value.watch_later = !!res.saved
    }
    uni.showToast({
      title: res.saved ? '已加入稍后看' : '已移除稍后看',
      icon: 'none'
    })
    uni.vibrateShort({})
  } catch (err) {}
}

const handleFollow = async () => {
  if (!userStore.isLoggedIn) return uni.navigateTo({ url: '/pages/auth/login' })
  const uid = authorId.value
  if (!uid || isOwner.value) return
  
  try {
    const method = isFollowing.value ? 'unfollow' : 'follow'
    const res = await request({
      url: `/api/interactions/${method}/`,
      method: 'POST',
      data: { user_id: uid }
    })
    
    isFollowing.value = !!res.following
    
    if (authorDetail.value) {
      const prev = Number(authorDetail.value.followers_count || 0)
      const next = isFollowing.value ? (prev + 1) : Math.max(0, prev - 1)
      authorDetail.value.followers_count = next
    }
    
    uni.showToast({
      title: isFollowing.value ? '已关注' : '已取消关注',
      icon: 'none'
    })
  } catch (err) {
    console.error('Follow error:', err)
  }
}

const goToUser = (id: string) => {
  const uid = String(id || '')
  if (!uid) return
  uni.navigateTo({ url: `/pages/user/detail?id=${encodeURIComponent(uid)}` })
}

const onVideoError = (e: any) => {
  console.error('Video error:', e)
  uni.showToast({ title: '播放失败', icon: 'none' })
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

const formatCount = (count: number) => {
  if (count < 1000) return count
  if (count < 10000) return (count / 1000).toFixed(1) + 'k'
  return (count / 10000).toFixed(1) + 'w'
}

onLoad((options: any) => {
  uni.$on('menu:theme-change', onThemeChange)
  if (options.id) {
    videoId.value = options.id
    fetchVideoDetail()
  }
})
</script>

<style scoped>
.detail-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--card-bg);
  color: var(--text-color);
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
  font-weight: 500;
}

.content-scroll {
  flex: 1;
  overflow: hidden;
}

.main-info {
  padding: 22rpx 24rpx 40rpx;
}

.title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1.4;
  display: block;
}

.sub-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
}

.sub-text {
  font-size: 22rpx;
  color: var(--text-muted);
}

.sub-dot {
  margin: 0 10rpx;
  font-size: 22rpx;
  color: var(--border-color);
}

.up-row {
  margin-top: 22rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.up-left {
  display: flex;
  align-items: center;
  overflow: hidden;
}

.up-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: var(--bg-color);
  flex-shrink: 0;
}

.up-meta {
  margin-left: 16rpx;
  overflow: hidden;
}

.up-name {
  font-size: 26rpx;
  font-weight: 700;
  color: var(--text-color);
  display: block;
  max-width: 380rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.up-fans {
  font-size: 22rpx;
  color: var(--text-muted);
  margin-top: 4rpx;
  display: block;
}

.follow-btn {
  min-width: 140rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background-color: var(--accent-color);
}

.follow-text {
  font-size: 24rpx;
  color: #fff;
  font-weight: 700;
}

.follow-btn.followed {
  background-color: var(--bg-color);
}

.follow-btn.followed .follow-text {
  color: var(--text-muted);
}

.desc-card {
  margin-top: 20rpx;
  background-color: var(--bg-color);
  border-radius: 12rpx;
  padding: 18rpx 20rpx;
  position: relative;
}

.desc-card:not(.expanded) .desc-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.desc-text {
  font-size: 24rpx;
  color: var(--text-color);
  line-height: 1.6;
}

.tag-row {
  margin-top: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  background-color: var(--bg-color);
  padding: 6rpx 20rpx;
  border-radius: 30rpx;
}

.tag-item text {
  font-size: 24rpx;
  color: var(--accent-color);
}

.expand-toggle {
  display: flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 10rpx;
}

.toggle-text {
  font-size: 22rpx;
  color: var(--text-muted);
}

.bottom-bar {
  height: 100rpx;
  display: flex;
  border-top: 1rpx solid var(--border-color);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  background-color: var(--card-bg);
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  transition: all 0.2s;
}

.action-item:active {
  transform: scale(0.9);
  opacity: 0.7;
}

.action-item.active {
  color: var(--accent-color);
}

.action-item.active .action-text {
  color: var(--accent-color);
  font-weight: 700;
}

.share-title {
  text-align: center;
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 40rpx;
}

.share-grid {
  display: flex;
  padding: 0 20rpx;
  padding-bottom: 20px;
  gap: 40rpx;
}

.share-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.icon-wrap {
  width: 96rpx;
  height: 96rpx;
  background-color: var(--bg-color);
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-color);
}

.icon-wrap.active {
  background-color: rgba(25, 137, 250, 0.1);
  color: var(--accent-color);
}

.icon-wrap.gray {
  background-color: var(--bg-color);
  color: var(--text-color);
}

.share-text {
  font-size: 22rpx;
  color: var(--text-muted);
}

.comment-section {
  margin-top: 40rpx;
  padding: 0 24rpx 140rpx;
  border-top: 1rpx solid var(--border-color);
}

.comment-header {
  padding: 30rpx 0;
}

.comment-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comment-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-color);
}

.sort-tabs {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 22rpx;
  color: var(--text-muted);
}

.sort-tabs .active {
  color: var(--text-color);
  font-weight: 700;
}

.sort-divider {
  font-size: 18rpx;
  color: var(--border-color);
}

.comment-input-area {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: var(--bg-color);
}

.input-box {
  flex: 1;
  height: 64rpx;
  background-color: var(--bg-color);
  border-radius: 32rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
}

.placeholder {
  font-size: 24rpx;
  color: var(--text-muted);
}

.comment-list {
  padding-bottom: 40rpx;
}

.comment-item {
  display: flex;
  gap: 20rpx;
  margin-bottom: 40rpx;
}

.comment-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: var(--bg-color);
  flex-shrink: 0;
}

.comment-main {
  flex: 1;
  border-bottom: 1rpx solid var(--border-color);
  padding-bottom: 30rpx;
}

.user-name {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--text-muted);
}

.comment-content {
  font-size: 28rpx;
  color: var(--text-color);
  line-height: 1.5;
  display: block;
  margin-bottom: 16rpx;
}

.comment-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.comment-date {
  font-size: 22rpx;
  color: var(--text-muted);
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 30rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.action-num {
  font-size: 22rpx;
  color: var(--text-muted);
}

.reply-btn, .delete-btn {
  font-size: 22rpx;
  color: var(--text-muted);
}

.delete-btn {
  margin-left: 20rpx;
}

.list-status {
  padding: 30rpx 0;
  text-align: center;
}

.empty-comments {
  padding: 50rpx 0 20rpx;
  text-align: center;
}

.empty-text {
  font-size: 24rpx;
  color: var(--text-muted);
}

.no-more {
  font-size: 24rpx;
  color: var(--text-muted);
}

.popup-input-wrap {
  padding: 30rpx;
  background-color: var(--card-bg);
}

.comment-field {
  background-color: var(--bg-color);
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  padding: 20rpx !important;
}

:deep(.comment-field .van-field__control) {
  color: var(--text-color);
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
}

.action-text {
  font-size: 24rpx;
  color: var(--text-color);
  margin-top: 8rpx;
}

.loading-state {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: var(--bg-color);
}

.replies-container {
  margin-top: 20rpx;
  background-color: var(--bg-color);
  border-radius: 12rpx;
  padding: 0 20rpx;
}

.expand-replies, .collapse-replies {
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.expand-text {
  font-size: 24rpx;
  color: var(--accent-color);
  font-weight: 600;
}

.replies-list {
  padding-top: 10rpx;
}

.reply-item {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 0;
}

.reply-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background-color: var(--bg-color);
}

.reply-main {
  flex: 1;
}

/* 适配 Vant Popup 深色模式已在 App.vue 全局实现 */

.reply-user {
  margin-bottom: 8rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.reply-to {
  font-size: 22rpx;
  color: var(--text-muted);
}

.reply-to-name {
  color: #1989fa;
}

.reply-content {
  font-size: 26rpx;
  color: var(--text-color);
  line-height: 1.5;
  display: block;
  margin-bottom: 12rpx;
}

.more-replies {
  padding: 20rpx 0;
  text-align: center;
}

.more-text {
  font-size: 22rpx;
  color: var(--text-muted);
}
</style>
