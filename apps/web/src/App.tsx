import React from 'react'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import './styles/theme.css'
import './styles/base.css'
import './styles/landscape.css'
import { useAuthStore } from './store/auth'
import Login from './scenes/Login'
import Lobby from './scenes/Lobby'
import Training from './scenes/Training'
import Skills from './scenes/Skills'
import Battle from './scenes/Battle'
import MatchPrep from './scenes/MatchPrep'
import MatchQueue from './scenes/MatchQueue'
import Result from './scenes/Result'
import { useApRecovery } from './hooks/useApRecovery'
import { useLandscapeEnforcement } from './utils/orientation'
import ResolutionRequirement from './components/ResolutionRequirement'
import { PerformanceIndicator } from './components/PerformanceMonitor'

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user) {
    return <Navigate to="/lobby" replace />
  }

  return <>{children}</>
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  // 전역 AP 자동 회복 활성화
  useApRecovery()

  // 가로형 디스플레이 강제 적용
  useLandscapeEnforcement({
    forceLandscape: true,
    showMessage: true,
  })

  // 해상도 요구사항 체크
  const [showResolutionMessage, setShowResolutionMessage] = React.useState(false)

  React.useEffect(() => {
    const checkResolution = () => {
      const isLowResolution = window.innerWidth < 1280 || window.innerHeight < 720
      setShowResolutionMessage(isLowResolution)
    }

    checkResolution()
    window.addEventListener('resize', checkResolution)

    return () => window.removeEventListener('resize', checkResolution)
  }, [])

  // 720p 이하 해상도에서는 해상도 요구사항 메시지만 표시
  if (showResolutionMessage) {
    return <ResolutionRequirement />
  }

  const router = createBrowserRouter([
    {
      path: '/',
      element: <Navigate to="/login" replace />,
    },
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
      path: '/training',
      element: (
        <RequireAuth>
          <Training />
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
    {
      path: '/match',
      element: (
        <RequireAuth>
          <MatchPrep />
        </RequireAuth>
      ),
    },
    {
      path: '/queue',
      element: (
        <RequireAuth>
          <MatchQueue />
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
  ])

  return (
    <>
      <RouterProvider router={router} />
      <PerformanceIndicator />
    </>
  )
}

export default App
