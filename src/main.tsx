import { StrictMode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
import { LanguageProvider } from './context/language-provider'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast.error('Session expired!')
          useAuthStore.getState().signOut().catch(console.error)
          // 只传递路径部分，确保是字符串
          let currentPath = '/'
          try {
            const pathname = String(router.history.location.pathname || '')
            const search = String(router.history.location.search || '')
            currentPath = pathname + search
            // 如果结果不是有效的字符串，使用默认值
            if (!currentPath || currentPath === 'undefinedundefined' || currentPath.includes('[object')) {
              currentPath = '/'
            }
          } catch (error) {
            // 如果转换失败，使用默认路径
            currentPath = '/'
          }
          router.navigate({ to: '/sign-in', search: { redirect: currentPath } })
        }
        if (error.response?.status === 500) {
          toast.error('Internal Server Error!')
          // Only navigate to error page in production to avoid disrupting HMR in development
          if (import.meta.env.PROD) {
            router.navigate({ to: '/500' })
          }
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// 在渲染 Router 前完成 auth 初始化，避免权限相关页面首次加载时 user/loading 未就绪导致数据请求被 enabled:false 拦截
function App() {
  const [authReady, setAuthReady] = useState(false)
  const initializeAuth = useAuthStore((state) => state.initialize)

  useEffect(() => {
    initializeAuth().finally(() => setAuthReady(true))
  }, [initializeAuth])

  if (!authReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return <RouterProvider router={router} />
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ThemeProvider>
            <FontProvider>
              <DirectionProvider>
                <App />
              </DirectionProvider>
            </FontProvider>
          </ThemeProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}
