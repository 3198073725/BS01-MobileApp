import { BASE_URL } from './request'

/**
 * 统一处理图片/头像 URL 格式化逻辑 (对齐 Web 端逻辑)
 * @param source 后端返回的相对/绝对路径字符串，或包含头像字段的用户/作者对象
 * @returns 完整的可访问 URL
 */
export const formatImageUrl = (source?: string | any): string => {
  if (!source) return '/static/logo.png'
  
  let url = ''
  if (typeof source === 'string') {
    url = source
  } else if (typeof source === 'object') {
    // 优先级：profile_picture > avatar_url (头像) 
    // 或者：thumbnail > thumbnail_url > cover (视频封面)
    url = source.profile_picture || source.avatar_url || source.thumbnail || source.thumbnail_url || source.cover || ''
  }

  if (!url) return '/static/logo.png'
  
  const base = BASE_URL.replace(/\/$/, '')
  
  // 如果已经是完整路径
  if (/^https?:\/\//i.test(url)) return url
  
  // 统一去除开头的斜杠
  const rel = String(url).replace(/^\/+/, '')
  
  // 如果路径中已经包含 media/，则不再重复添加 (对齐 Web 端 buildAvatarUrl 逻辑)
  const path = rel.includes('media/') ? rel : `media/${rel}`
  
  return `${base}/${path}`
}
