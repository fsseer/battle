import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 서버 연동 전까지는 더미 인증
    if (id && password) {
      setUser({ id, name: id })
      navigate('/lobby')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
        <h2>로그인</h2>
        <input placeholder="아이디" value={id} onChange={(e) => setId(e.target.value)} />
        <input placeholder="비밀번호" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">입장</button>
      </form>
    </div>
  )
}


