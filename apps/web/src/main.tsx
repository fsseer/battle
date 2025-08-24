import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuthStore } from './store/auth'
import { socket } from './lib/socket'
import './index.css'
import './styles/index.css'
import Login from './scenes/Login'
import Lobby from './scenes/Lobby'
import MatchQueue from './scenes/MatchQueue'
import MatchConfirm from './scenes/MatchConfirm'
import Training from './scenes/Training'
import Battle from './scenes/Battle'
import Result from './scenes/Result'
import Skills from './scenes/Skills'

// 전역 소켓 이벤트 리스너 설정
socket.on('session.terminated', (data) => {
  const { forceLogout } = useAuthStore.getState()
  forceLogout(data.reason)
})

// 전역 토큰 만료 감지 및 처리
window.addEventListener('storage', (event) => {
  if (event.key === 'token' && event.newValue === null) {
    console.log('[Main] localStorage에서 토큰 제거 감지, 자동 로그아웃')
    const { handleTokenExpiration } = useAuthStore.getState()
    handleTokenExpiration()
  }
})

// 주기적으로 토큰 유효성 확인 (5분마다)
setInterval(() => {
  const token = localStorage.getItem('token')
  if (token) {
    console.log('[Main] 토큰 유효성 확인 중...')
    // 여기서 서버에 토큰 유효성 검증 요청을 보낼 수 있습니다
    // 현재는 단순히 토큰 존재 여부만 확인
  } else {
    console.log('[Main] 토큰이 없음, 로그인 상태 확인')
    const { user } = useAuthStore.getState()
    if (user) {
      console.log('[Main] 토큰이 없지만 user 상태가 존재, 강제 로그아웃')
      const { handleTokenExpiration } = useAuthStore.getState()
      handleTokenExpiration()
    }
  }
}, 5 * 60 * 1000) // 5분마다

// 앱 시작 시 localStorage에서 토큰 초기화
const { initializeFromStorage } = useAuthStore.getState()
initializeFromStorage()

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  if (!user?.token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user } = useAuthStore()
  if (user?.token) {
    return <Navigate to="/lobby" replace />
  }
  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  {
    path: '/login',
    element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ),
  },
  {
    path: '/lobby',
    element: (
      <RequireAuth>
        <Lobby />
      </RequireAuth>
    ),
  },
  {
    path: '/match',
    element: (
      <RequireAuth>
        <MatchQueue />
      </RequireAuth>
    ),
  },
  {
    path: '/match-confirm',
    element: (
      <RequireAuth>
        <MatchConfirm />
      </RequireAuth>
    ),
  },
  {
    path: '/training',
    element: (
      <RequireAuth>
        <Training />
      </RequireAuth>
    ),
  },
  {
    path: '/battle',
    element: (
      <RequireAuth>
        <Battle />
      </RequireAuth>
    ),
  },
  {
    path: '/result',
    element: (
      <RequireAuth>
        <Result />
      </RequireAuth>
    ),
  },
  {
    path: '/skills',
    element: (
      <RequireAuth>
        <Skills />
      </RequireAuth>
    ),
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
