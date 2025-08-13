import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()

  return (
    <div style={{ padding: 24 }}>
      <h2>로비</h2>
      <div style={{ marginBottom: 12 }}>안녕하세요, {user?.name ?? '게스트'}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/match')}>대전 준비</button>
        <button onClick={() => { clear(); navigate('/login') }}>로그아웃</button>
      </div>
    </div>
  )
}


