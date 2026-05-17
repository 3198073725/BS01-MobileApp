import { computed, onUnmounted, ref } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useConfigStore } from '@/store/config'
import { ensureLogin as ensureAuth } from '@/utils/auth'
import request, { getBaseUrl } from '@/utils/request'

type UseVideoDetailPageOptions = {
  defaultQualityLabel?: string
  enableHlsFallback?: boolean
}

export const useVideoDetailPage = (options: UseVideoDetailPageOptions = {}) => {
  const {
    defaultQualityLabel = '清晰度',
    enableHlsFallback = false,
  } = options

  const userStore = useUserStore()
  const configStore = useConfigStore()

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

  const commentsAllowed = computed(() => {
    const globalAllowed = configStore.get('allow_comments', true)
    const perVideoAllowed = videoDetail.value?.allow_comments !== false
    return globalAllowed && perVideoAllowed
  })

  const commentList = ref<any[]>([])
  const commentPage = ref(1)
  const commentsLoading = ref(false)
  const commentsFinished = ref(false)
  const showCommentInput = ref(false)
  const commentContent = ref('')
  const submitting = ref(false)
  const replyTarget = ref<any>(null)
  const replyRoot = ref<any>(null)

  const isPageActive = ref(true)
  let processingTimer: ReturnType<typeof setTimeout> | null = null
  const processingToastShown = ref(false)

  const clearProcessingTimer = () => {
    if (processingTimer) {
      clearTimeout(processingTimer)
      processingTimer = null
    }
  }

  const onCommentContentChange = (v: any) => {
    commentContent.value = v === undefined || v === null ? '' : String(v)
  }

  const isOwner = computed(() => {
    return Boolean(videoDetail.value && userStore.userInfo && String(videoDetail.value?.author?.id || '') === String(userStore.userInfo.id))
  })

  const normalizeMediaUrl = (url?: string): string => {
    if (!url) return ''
    const u = String(url)
    if (/^https?:\/\//i.test(u)) return u
    if (/^blob:/i.test(u)) return u

    const base = getBaseUrl().replace(/\/$/, '')
    if (u.startsWith('/')) return `${base}${u}`
    const rel = u.replace(/^\/+/, '')
    const path = rel.includes('media/') ? rel : `media/${rel}`
    return `${base}/${path}`
  }

  const currentPoster = computed(() => {
    return normalizeMediaUrl(videoDetail.value?.thumbnail_url)
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
    if (!commentsAllowed.value) {
      commentList.value = []
      commentsFinished.value = true
      commentsLoading.value = false
      return
    }
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
        noAuth: !userStore.isLoggedIn,
        silent: true
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

      const hasNext = typeof res?.has_next === 'boolean' ? res.has_next : !!res?.next
      if (!hasNext) {
        commentsFinished.value = true
      } else {
        commentPage.value++
      }
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.status === 404) {
        commentList.value = []
        commentsFinished.value = true
        return
      }
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
    if (now - lastSaveTs.value < 2000) return

    const resumeEnabled = uni.getStorageSync('vp_resume') !== '0'
    if (!resumeEnabled) return

    videoContext.value.requestComponentInfo((_res: any) => {
      // no-op: uni-app video currentTime persistence is driven by timeupdate
    })
  }

  const isPlaying = ref(true)
  const playbackRate = ref(1.0)
  const rateOptions = ['0.5', '0.75', '1.0', '1.25', '1.5', '2.0']
  const rateIndex = ref(2)

  const qualityOptions = ref<any[]>([])
  const qualityIndex = ref(0)
  const currentSrc = ref('')
  const currentQualityLabel = computed(() => qualityOptions.value[qualityIndex.value]?.label || defaultQualityLabel)

  const hlsFailed = ref(false)

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
    const idx = Number(e?.detail?.value ?? e?.target?.value)
    if (!Number.isFinite(idx)) return
    rateIndex.value = idx
    const rate = parseFloat(rateOptions[idx])
    if (!Number.isFinite(rate)) return
    playbackRate.value = rate
    videoContext.value = uni.createVideoContext('myVideo')
    videoContext.value.playbackRate(rate)
  }

  const lastCurrentTime = ref(0)

  const handleQualityChange = (e: any) => {
    const idx = Number(e?.detail?.value ?? e?.target?.value)
    if (!Number.isFinite(idx)) return
    qualityIndex.value = idx
    const option = qualityOptions.value[idx]
    if (!option?.url) return

    videoContext.value = uni.createVideoContext('myVideo')
    const lastPos = lastCurrentTime.value

    currentSrc.value = option.url
    setTimeout(() => {
      videoContext.value.seek(lastPos)
      videoContext.value.play()
    }, 200)
  }

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

      const status = String((res as any)?.status || '')
      const isProcessing = status && ['processing', 'pending', 'transcoding', 'queued'].includes(status)
      if (isProcessing) {
        if (!processingToastShown.value && isPageActive.value) {
          processingToastShown.value = true
          uni.showToast({ title: '视频处理中，稍后可播放', icon: 'none' })
        }
        clearProcessingTimer()
        if (isPageActive.value) {
          processingTimer = setTimeout(() => {
            if (isPageActive.value) fetchVideoDetail()
          }, 2500)
        }
      } else {
        processingToastShown.value = false
        clearProcessingTimer()
      }

      const options: any[] = []
      const hls = normalizeMediaUrl((res as any)?.hls_master_url)
      const low = normalizeMediaUrl((res as any)?.low_mp4_url)
      const raw = normalizeMediaUrl((res as any)?.video_url)

      const supportsHls = (() => {
        try {
          if (typeof document === 'undefined') return false
          const v = document.createElement('video')
          const t1 = v.canPlayType('application/vnd.apple.mpegurl')
          const t2 = v.canPlayType('application/x-mpegURL')
          return Boolean(t1 || t2)
        } catch {
          return false
        }
      })()

      const canUseHls = Boolean(supportsHls && (!enableHlsFallback || !hlsFailed.value))

      if (hls && canUseHls) options.push({ label: '自动', url: hls })
      if (low) options.push({ label: '流畅', url: low })
      if (raw) options.push({ label: '原始', url: raw })

      qualityOptions.value = options
      currentSrc.value = (hls && canUseHls) ? hls : (low || raw || '')

      if (!currentSrc.value) {
        uni.showToast({ title: '视频地址无效，暂无法播放', icon: 'none' })
      }

      try {
        console.info('[video] sources resolved', {
          hls,
          low,
          raw,
          supportsHls,
          currentSrc: currentSrc.value,
        })
      } catch {}

      const savedRate = parseFloat(uni.getStorageSync('vp_rate'))
      if (!isNaN(savedRate)) {
        playbackRate.value = savedRate
        const rIdx = rateOptions.findIndex(r => parseFloat(r) === savedRate)
        if (rIdx > -1) rateIndex.value = rIdx
      }

      if (userStore.isLoggedIn && authorId.value) {
        try {
          const rel = await request({
            url: `/api/interactions/relationship/?user_id=${authorId.value}`,
          })
          isFollowing.value = !!rel.following
        } catch {
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
        url: `/api/interactions/comments/replies/`,
        data: {
          parent_id: comment.id,
          page: p,
          page_size: 10
        },
        noAuth: !userStore.isLoggedIn,
        silent: true
      })
      const list = res.results || []
      comment._replies = p === 1 ? list : [...(comment._replies || []), ...list]
      comment._repliesPage = p
      comment._repliesHasNext = typeof res?.has_next === 'boolean' ? res.has_next : !!res?.next
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.status === 404) {
        comment._replies = []
        comment._repliesHasNext = false
        return
      }
      console.error('Load replies error:', err)
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

  const requireLogin = () => ensureAuth(userStore.isLoggedIn, 'navigateTo')

  const handleReply = (target: any, root?: any) => {
    if (!requireLogin()) return
    replyTarget.value = target
    replyRoot.value = root || target
    commentContent.value = ''
    showCommentInput.value = true
  }

  const submitComment = async () => {
    if (!requireLogin()) return
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
      uni.showToast({ title: '评论发送失败', icon: 'none' })
    } finally {
      submitting.value = false
    }
  }

  const handleLikeComment = async (comment: any) => {
    if (!requireLogin()) return
    try {
      const res = await request({
        url: `/api/interactions/comments/${comment.id}/like/`,
        method: 'POST'
      })
      comment.is_liked = !!res.liked
      comment.like_count = res.count
      uni.vibrateShort({})
    } catch {
      uni.showToast({ title: '评论点赞失败', icon: 'none' })
    }
  }

  const handleSortComments = (sort: string) => {
    if (!commentsAllowed.value) return
    if (commentSort.value === sort) return
    commentSort.value = sort
    fetchComments(true)
  }

  const canDeleteComment = (comment: any) => {
    if (!userStore.isLoggedIn || !userStore.userInfo) return false
    const currentUserId = String(userStore.userInfo.id)
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
              const idx = parent._replies?.findIndex((r: any) => r.id === comment.id)
              if (idx !== -1) {
                parent._replies.splice(idx, 1)
                parent.replies_count = Math.max(0, (parent.replies_count || 1) - 1)
              }
            } else {
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
    if (!commentsAllowed.value) return
    fetchComments()
  }

  const handleLike = async () => {
    if (!requireLogin()) return
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
    } catch {
      uni.showToast({ title: '点赞失败', icon: 'none' })
    }
  }

  const handleCollect = async () => {
    if (!requireLogin()) return
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
    } catch {
      uni.showToast({ title: '收藏失败', icon: 'none' })
    }
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
    const baseUrl = getBaseUrl().replace(/\/$/, '')
    shareUrl = `${baseUrl}/#/pages/video/detail?id=${videoId.value}`
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
    if (!requireLogin()) return
    try {
      const res = await request({
        url: '/api/interactions/watch-later/toggle/',
        method: 'POST',
        data: { video_id: videoId.value }
      })
      if (videoDetail.value) {
        videoDetail.value.watch_later = !!res.saved
      }
      uni.showToast({
        title: res.saved ? '已加入稍后看' : '已移除稍后看',
        icon: 'none'
      })
      uni.vibrateShort({})
    } catch {
      uni.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    }
  }

  const handleFollow = async () => {
    if (!requireLogin()) return
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
        authorDetail.value.is_following = isFollowing.value
        authorDetail.value.following = isFollowing.value
      }

      uni.showToast({
        title: isFollowing.value ? '已关注' : '已取消关注',
        icon: 'none'
      })
    } catch (err) {
      console.error('Follow error:', err)
      uni.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    }
  }

  const goToUser = (id: string) => {
    const uid = String(id || '')
    if (!uid) return
    uni.navigateTo({ url: `/pages/user/detail?id=${encodeURIComponent(uid)}` })
  }

  const onVideoError = (e: any) => {
    try {
      const elFromEvent: any = e?.currentTarget || e?.target
      const domEl: any = typeof document !== 'undefined' ? document.getElementById('myVideo') : null
      const el: any = domEl || elFromEvent
      const mediaErr = el?.error

      let canPlay: any = null
      try {
        if (el?.canPlayType) {
          canPlay = {
            mp4: el.canPlayType('video/mp4'),
            m3u8_1: el.canPlayType('application/vnd.apple.mpegurl'),
            m3u8_2: el.canPlayType('application/x-mpegURL'),
          }
        }
      } catch {}

      console.error('Video error:', {
        src: currentSrc.value,
        elementSrc: el?.src,
        elementCurrentSrc: el?.currentSrc,
        networkState: el?.networkState,
        readyState: el?.readyState,
        canPlay,
        error: mediaErr ? { code: mediaErr.code, message: mediaErr.message } : null,
        event: e,
      })

      if (enableHlsFallback) {
        const isHlsPlaying = currentSrc.value.includes('.m3u8') || currentSrc.value.includes('/hls/')
        if (isHlsPlaying && !hlsFailed.value) {
          hlsFailed.value = true
          const raw = normalizeMediaUrl((videoDetail.value as any)?.video_url)
          if (raw && raw !== currentSrc.value) {
            console.info('[video] HLS failed, falling back to raw MP4:', raw)
            currentSrc.value = raw
            uni.showToast({ title: '切换至兼容模式播放', icon: 'none', duration: 2000 })
            return
          }
        }
      }
    } catch {
      console.error('Video error:', e)
    }
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

  onHide(() => {
    isPageActive.value = false
    clearProcessingTimer()
  })

  onShow(() => {
    isPageActive.value = true
    if (videoId.value && videoDetail.value) {
      const status = String(videoDetail.value?.status || '')
      const isProcessing = status && ['processing', 'pending', 'transcoding', 'queued'].includes(status)
      if (isProcessing) {
        fetchVideoDetail()
      }
    }
  })

  onUnmounted(() => {
    isPageActive.value = false
    clearProcessingTimer()
  })

  return {
    userStore,
    videoId,
    videoDetail,
    loading,
    currentPoster,
    currentSrc,
    qualityOptions,
    qualityIndex,
    currentQualityLabel,
    playbackRate,
    rateOptions,
    rateIndex,
    authorDetail,
    authorId,
    isOwner,
    isFollowing,
    isDescExpanded,
    hasLongDescription,
    commentsAllowed,
    commentSort,
    commentList,
    commentsLoading,
    commentsFinished,
    showCommentInput,
    commentContent,
    submitting,
    replyTarget,
    showSharePopup,
    onCommentContentChange,
    fetchVideoDetail,
    togglePlay,
    handleRateChange,
    handleQualityChange,
    onTimeUpdate,
    applyResumePosition,
    toggleReplies,
    loadMoreReplies,
    getReplyTargetName,
    handleReply,
    submitComment,
    handleLikeComment,
    handleSortComments,
    canDeleteComment,
    handleDeleteComment,
    onScrollToLower,
    handleLike,
    handleCollect,
    handleShare,
    handleCopyLink,
    handleToggleWatchLater,
    handleFollow,
    goToUser,
    onVideoError,
    formatDate,
    formatCount,
    saveResumePosition,
  }
}
