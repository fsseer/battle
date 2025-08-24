import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useLandscapeEnforcement } from '../utils/orientation'
import GameHeader from '../components/GameHeader'
import { socket } from '../lib/socket'

export default function MatchPrep() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const { isLandscape } = useLandscapeEnforcement()

  useEffect(() => {
    if (!user?.token) {
      navigate('/login')
      return
    }

    const token = user.token

    // 소켓 이벤트 리스너
    const onMatchFound = (m: { ok?: boolean; user?: { id: string; name: string; characters: { id: string; name: string; level: number; stats: { str: number; agi: number; sta: number } }[] } }) => {
      if (m?.ok && m.user) {
        setUser({ 
          id: m.user.id, 
          name: m.user.name, 
          nickname: m.user.name,
          token, 
          characters: m.user.characters 
        })
      }
    }

    const onDuplicateLogin = (j: { error?: string }) => {
      if (j?.error === 'DUPLICATE_LOGIN') {
        alert('다른 곳에서 로그인되어 현재 세션이 종료되었습니다.')
        navigate('/login')
      }
    }

    socket.on('match.found', onMatchFound)
    socket.on('duplicate.login', onDuplicateLogin)

    return () => {
      socket.off('match.found', onMatchFound)
      socket.off('duplicate.login', onDuplicateLogin)
    }
  }, [user, navigate, setUser])

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!isLandscape) {
    return (
      <div className="match-prep-layout landscape-layout">
        <GameHeader />
        <div className="loading-content landscape-center-content">
          <div className="landscape-spinner">⚔️</div>
          <div className="landscape-loading-text">가로형 화면으로 전환해주세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="match-prep-layout landscape-layout">
      <GameHeader />
      <div className="match-prep-content landscape-center-content">
        <h2>대전 준비</h2>
        <p>매치를 찾는 중...</p>
      </div>
    </div>
  )
}
