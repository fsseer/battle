import React from 'react'

/**
 * 720p 이하 해상도에서 표시되는 해상도 요구사항 메시지
 */
export default function ResolutionRequirement() {
  return (
    <div className="resolution-required-message">
      <div className="screen-icon">🖥️</div>

      <h1>해상도 요구사항</h1>

      <p>
        Vindex Arena는 최소 1280x720 (720p) 해상도가 필요합니다.
        <br />
        현재 화면 크기가 너무 작아 게임을 실행할 수 없습니다.
      </p>

      <div className="resolution-info">
        <h3>해결 방법</h3>
        <ul>
          <li>
            <strong>데스크톱/노트북:</strong> 브라우저 창을 1280x720 이상으로 확대
          </li>
          <li>
            <strong>태블릿:</strong> 가로 모드로 회전하고 브라우저 확대
          </li>
          <li>
            <strong>모바일:</strong> 가로 모드로 회전하고 브라우저 확대
          </li>
          <li>
            <strong>브라우저:</strong> Ctrl + '+' 또는 Cmd + '+'로 확대
          </li>
        </ul>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(139, 69, 19, 0.3)',
          borderRadius: '8px',
          border: '1px solid var(--bronze)',
        }}
      >
        <p style={{ margin: 0, fontSize: '14px', color: '#fbbf24' }}>
          💡 <strong>권장 해상도:</strong> 1920x1080 (Full HD) 이상
        </p>
      </div>
    </div>
  )
}
