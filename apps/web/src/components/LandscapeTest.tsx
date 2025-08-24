import React from 'react'
import { useLandscapeEnforcement } from '../utils/orientation'

/**
 * 가로형 강제 적용 테스트 컴포넌트
 */
export default function LandscapeTest() {
  const { orientation, isLandscape, isPortrait } = useLandscapeEnforcement({
    forceLandscape: true,
    showMessage: true,
  })

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h2>가로형 강제 적용 테스트</h2>
      <div style={{ marginBottom: '20px' }}>
        <p>
          <strong>현재 방향:</strong> {orientation}
        </p>
        <p>
          <strong>가로형 여부:</strong> {isLandscape ? '✅ 예' : '❌ 아니오'}
        </p>
        <p>
          <strong>세로형 여부:</strong> {isPortrait ? '✅ 예' : '❌ 아니오'}
        </p>
      </div>

      <div
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <h3>테스트 방법:</h3>
        <ol>
          <li>브라우저 창을 세로로 줄여보세요</li>
          <li>모바일 기기에서 세로 모드로 확인해보세요</li>
          <li>가로형 안내 메시지가 표시되는지 확인하세요</li>
          <li>가로형으로 회전하면 게임이 정상 표시되는지 확인하세요</li>
        </ol>
      </div>

      <div
        style={{
          background: 'rgba(139, 69, 19, 0.3)',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid var(--bronze)',
          marginTop: '20px',
        }}
      >
        <h3>예상 동작:</h3>
        <ul>
          <li>세로형: 가로 회전 안내 메시지 표시</li>
          <li>가로형: 정상 게임 화면 표시</li>
          <li>화면 회전 시 자동으로 상태 업데이트</li>
        </ul>
      </div>
    </div>
  )
}
