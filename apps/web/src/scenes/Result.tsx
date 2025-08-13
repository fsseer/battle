import { useNavigate } from 'react-router-dom'

export default function Result() {
  const navigate = useNavigate()
  // TODO: 실제 결과/보상/로그 요약 연결
  return (
    <div style={{ padding: 24 }}>
      <h2>전투 결과</h2>
      <p>프로토타입 결과 화면입니다.</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/battle')}>다시하기</button>
        <button onClick={() => navigate('/lobby')}>로비로</button>
      </div>
    </div>
  )
}


