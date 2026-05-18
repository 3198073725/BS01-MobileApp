export const extractChangedKeys = (payload: any): string[] => {
  try {
    const changed = Array.isArray(payload?.changed_keys) ? payload.changed_keys : []
    return changed.map((item: any) => String(item || '')).filter(Boolean)
  } catch {
    return []
  }
}

export const shouldRefreshMobileHomeFeed = (
  feedTab: 'recommend' | 'following' | 'featured',
  changedKeys: string[]
): boolean => {
  if (!Array.isArray(changedKeys) || !changedKeys.length) return false
  if (feedTab === 'recommend') {
    return changedKeys.includes('recommend_algorithm') || changedKeys.includes('home_layout')
  }
  if (feedTab === 'featured') {
    return changedKeys.includes('featured_limit') || changedKeys.includes('featured_video_ids')
  }
  return false
}

export const getMobileFeedChannel = (route: string): string => {
  if (route === 'pages/index/index') {
    return 'home-feed'
  }
  return ''
}

export const resolveMobileHotRefresh = (route: string, changedKeys: string[]) => {
  if (!Array.isArray(changedKeys) || !changedKeys.length) return null
  const channel = getMobileFeedChannel(route)
  if (!channel) return null
  return { channel, changedKeys }
}

export const isMobileFeedRefreshEvent = (payload: any, channel: string) => {
  try {
    const detail = payload?.detail || payload || {}
    return detail.channel === channel ? detail : null
  } catch {
    return null
  }
}

export const shouldRefreshMobileFeed = (
  route: string,
  activeFeedTab: 'recommend' | 'following' | 'featured',
  changedKeys: string[]
): boolean => {
  const channel = getMobileFeedChannel(route)
  if (channel === 'home-feed') {
    return shouldRefreshMobileHomeFeed(activeFeedTab, changedKeys)
  }
  return false
}
