import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="title">Castrum Gladiatorum</div>
        <div className="subtitle">{user?.name ?? '게스트'} 님, 오늘의 훈련과 시합을 선택하세요.</div>

        <div className="parchment">
          <div className="grid">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>훈련장</div>
              <div style={{ fontSize: 14, opacity: .9 }}>기본 동작과 스킬을 연습합니다. 추후 PvE로 확장됩니다.</div>
              <div className="section"><button className="ghost-btn" onClick={() => navigate('/match')}>훈련 시작</button></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>콜로세움</div>
              <div style={{ fontSize: 14, opacity: .9 }}>매칭을 통해 검투 시합을 진행합니다.</div>
              <div className="section"><button className="gold-btn" onClick={() => navigate('/match')}>매칭 대기열 입장</button></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>병영</div>
              <div style={{ fontSize: 14, opacity: .9 }}>장비와 스킬을 정비합니다. 추후 육성 요소 추가.</div>
              <div className="section"><button className="ghost-btn" onClick={() => alert('준비중입니다')}>정비하기</button></div>
            </div>
          </div>
        </div>

        <div className="row section" style={{ justifyContent: 'space-between' }}>
          <button className="ghost-btn" onClick={() => { clear(); navigate('/login') }}>로그아웃</button>
          <button className="gold-btn" onClick={() => navigate('/match')}>즉시 시합</button>
        </div>
      </div>
    </div>
  )
}


