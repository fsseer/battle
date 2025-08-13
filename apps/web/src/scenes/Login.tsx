import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'

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
    <div className="arena-frame">
      <div className="panel">
        <div className="parchment">
          <div className="title">Ludus Entrance</div>
          <div className="subtitle">로마의 검투사 양성소에 오신 것을 환영합니다.</div>
          <form onSubmit={onSubmit} className="grid" style={{ gridTemplateColumns: '1fr' }}>
            <input placeholder="코그나멘(아이디)" value={id} onChange={(e) => setId(e.target.value)} />
            <input placeholder="암구(비밀번호)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="ghost-btn" onClick={() => { setId('Maximus'); setPassword('test'); }}>임시채움</button>
              <button type="submit" className="gold-btn">Ludus에 입장</button>
            </div>
          </form>
          <div className="section" style={{ fontSize: 14 }}>
            계정 생성은 추후 진행됩니다. 지금은 임시 입장으로 로비에 들어갈 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  )
}


