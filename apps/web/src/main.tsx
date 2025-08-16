import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import './index.css'
import Login from './scenes/Login'
import Lobby from './scenes/Lobby'
import MatchQueue from './scenes/MatchQueue'
import Training from './scenes/Training'
import Battle from './scenes/Battle'
import Result from './scenes/Result'
import Skills from './scenes/Skills'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuthStore()
  if (!user?.token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function RedirectIfAuthed({ children }: { children: JSX.Element }) {
  const { user } = useAuthStore()
  if (user?.token) {
    return <Navigate to="/lobby" replace />
  }
  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: (
      <RedirectIfAuthed>
        <Login />
      </RedirectIfAuthed>
    ) },
  { path: '/lobby', element: (
      <RequireAuth>
        <Lobby />
      </RequireAuth>
    ) },
  { path: '/match', element: (
      <RequireAuth>
        <MatchQueue />
      </RequireAuth>
    ) },
  { path: '/training', element: (
      <RequireAuth>
        <Training />
      </RequireAuth>
    ) },
  { path: '/battle', element: (
      <RequireAuth>
        <Battle />
      </RequireAuth>
    ) },
  { path: '/result', element: (
      <RequireAuth>
        <Result />
      </RequireAuth>
    ) },
  { path: '/skills', element: (
      <RequireAuth>
        <Skills />
      </RequireAuth>
    ) },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
