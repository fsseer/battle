import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket'

export default function MatchPrep() {
  const navigate = useNavigate()
  useEffect(() => {
    const onFound = () => navigate('/battle')
    socket.on('match.found', onFound)
    return () => { socket.off('match.found', onFound) }
  }, [navigate])

  return (
    <div style={{ padding: 24 }}>
      <h2>대전 준비</h2>
      <p>간단한 설명: 여기에서 장비/스킬 선택(추후 확장)</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/lobby')}>뒤로</button>
        <button onClick={() => socket.emit('queue.join')}>매칭 시작</button>
      </div>
    </div>
  )
}


