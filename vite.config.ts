import { defineConfig, loadEnv } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiOrigin = env.VITE_DEV_API_ORIGIN || env.VITE_APP_API_BASE || 'http://127.0.0.1:8000'
  const allowedHost = env.VITE_DEV_ALLOWED_HOST || 'mobile.bs01.local'

  return {
    plugins: [
      uni(),
      Components({
        resolvers: [VantResolver()],
      }),
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: [allowedHost],
      proxy: {
        '/api': {
          target: devApiOrigin,
          changeOrigin: true,
        },
        '/media': {
          target: devApiOrigin,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  }
})
