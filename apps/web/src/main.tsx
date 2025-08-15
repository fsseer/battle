import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import './index.css'
import Login from './scenes/Login'
import Lobby from './scenes/Lobby'
import MatchPrep from './scenes/MatchPrep'
import Battle from './scenes/Battle'
import Result from './scenes/Result'
import Skills from './scenes/Skills'

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <Login /> },
  { path: '/lobby', element: <Lobby /> },
  { path: '/match', element: <MatchPrep /> },
  { path: '/battle', element: <Battle /> },
  { path: '/result', element: <Result /> },
  { path: '/skills', element: <Skills /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
