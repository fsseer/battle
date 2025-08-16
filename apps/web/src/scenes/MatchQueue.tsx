import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket'
import ResourceBar from '../components/ResourceBar'

export default function MatchQueue() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<{ state: string; position?: number; size?: number } | null>(null)

  useEffect(() => {
    const onFound = (m: unknown) => {
      console.log('match.found', m)
      navigate('/battle')
    }
    const onQueue = (s: any) => {
      setStatus(s)
      console.log('queue.status', s)
    }
    const onConnect = () => {
      console.log('socket connected', socket.id)
      socket.emit('queue.join')
    }
    const onError = (e: unknown) => console.error('socket error', e)
    socket.on('connect', onConnect)
    socket.on('match.found', onFound)
    socket.on('queue.status', onQueue)
    socket.on('connect_error', onError)
    socket.emit('queue.join')
    return () => {
      socket.emit('queue.leave')
      socket.off('connect', onConnect)
      socket.off('match.found', onFound)
      socket.off('queue.status', onQueue)
      socket.off('connect_error', onError)
    }
  }, [navigate])

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="parchment">
          <ResourceBar />
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>매칭 대기 중...</div>
            <div style={{ opacity: 0.85, marginTop: 8 }}>
              상대가 입장하면 자동으로 전투로 이동합니다.
            </div>
            {status?.state === 'WAITING' ? (
              <div style={{ marginTop: 8, opacity: 0.9 }}>대기열: {status.position}/{status.size}</div>
            ) : null}
            <div style={{ marginTop: 16 }}>
              <button className="ghost-btn" onClick={() => navigate('/lobby')}>
                취소하고 로비로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
