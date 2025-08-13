import { useNavigate } from 'react-router-dom'

export default function MatchPrep() {
  const navigate = useNavigate()

  return (
    <div style={{ padding: 24 }}>
      <h2>대전 준비</h2>
      <p>간단한 설명: 여기에서 장비/스킬 선택(추후 확장)</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/lobby')}>뒤로</button>
        <button onClick={() => navigate('/battle')}>매칭 시작</button>
      </div>
    </div>
  )
}


