import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'

export default function MatchPrep() {
  const navigate = useNavigate()
  useEffect(() => {
    const onFound = (m: unknown) => {
      console.log('match.found', m)
      navigate('/battle')
    }
    const onHello = (m: unknown) => console.log('server.hello', m)
    const onConnect = () => console.log('socket connected', socket.id)
    const onError = (e: unknown) => console.error('socket error', e)

    socket.on('connect', onConnect)
    socket.on('server.hello', onHello)
    socket.on('match.found', onFound)
    socket.on('connect_error', onError)
    return () => {
      socket.off('connect', onConnect)
      socket.off('server.hello', onHello)
      socket.off('match.found', onFound)
      socket.off('connect_error', onError)
    }
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


