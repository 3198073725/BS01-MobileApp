import { getBaseUrl } from '@/utils/request'

let socketTask: UniApp.SocketTask | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0
let started = false
let intentionalClose = false
let onConfigUpdated: (payload: any) => void = () => {}

const buildSystemEventsUrl = (): string => {
  try {
    const base = String(getBaseUrl() || '').trim().replace(/\/$/, '')
    if (!base) return ''
    const token = String(uni.getStorageSync('token') || '').trim()
    const wsBase = base.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:')
    const query = token ? `?token=${encodeURIComponent(token)}` : ''
    return `${wsBase}/ws/system-events/${query}`
  } catch {
    return ''
  }
}

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const cleanupSocket = () => {
  if (!socketTask) return
  const cur = socketTask
  socketTask = null
  try { cur.close({ code: 1000, reason: 'client_close' }) } catch { }
}

const scheduleReconnect = () => {
  if (!started || reconnectTimer) return
  const delay = Math.min(30000, 1000 * Math.pow(2, Math.min(reconnectAttempt, 5)))
  reconnectAttempt += 1
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connectSystemEvents()
  }, delay)
}

const handleMessage = (raw: string) => {
  try {
    const payload = JSON.parse(String(raw || ''))
    if (!payload || typeof payload !== 'object') return
    if (String(payload.type || '') !== 'config.updated') return
    onConfigUpdated(payload)
    try { uni.$emit('system-config-updated', payload) } catch { }
  } catch { }
}

const connectSystemEvents = () => {
  if (!started || socketTask) return
  const url = buildSystemEventsUrl()
  if (!url) return
  intentionalClose = false
  clearReconnectTimer()
  try {
    const task = uni.connectSocket({ url, complete: () => {} })
    socketTask = task
    task.onOpen(() => {
      reconnectAttempt = 0
    })
    task.onMessage((event) => {
      handleMessage((event && (event.data as string)) || '')
    })
    task.onError(() => { /* no-op */ })
    task.onClose(() => {
      socketTask = null
      if (intentionalClose) {
        intentionalClose = false
        return
      }
      scheduleReconnect()
    })
  } catch {
    socketTask = null
    scheduleReconnect()
  }
}

export const startSystemEvents = (options: { onConfigUpdated?: (payload: any) => void } = {}) => {
  onConfigUpdated = typeof options.onConfigUpdated === 'function' ? options.onConfigUpdated : () => {}
  started = true
  reconnectAttempt = 0
  connectSystemEvents()
}

export const notifySystemEventsForeground = () => {
  if (!started) return
  reconnectAttempt = 0
  connectSystemEvents()
}

export const notifySystemEventsBackground = () => {
  intentionalClose = true
  clearReconnectTimer()
  cleanupSocket()
}

export const stopSystemEvents = () => {
  started = false
  intentionalClose = true
  clearReconnectTimer()
  cleanupSocket()
}
