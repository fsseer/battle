/**
 * 가로형 디스플레이 강제 및 세로형 안내 유틸리티
 */

export interface OrientationConfig {
  forceLandscape?: boolean
  showMessage?: boolean
  messageContainer?: string
}

export class OrientationManager {
  private config: OrientationConfig
  private messageElement: HTMLElement | null = null

  constructor(config: OrientationConfig = {}) {
    this.config = {
      forceLandscape: true,
      showMessage: true,
      messageContainer: 'body',
      ...config,
    }
  }

  /**
   * 가로형 강제 적용 및 세로형 안내 메시지 표시
   */
  public enforceLandscape(): void {
    if (this.config.forceLandscape) {
      this.forceLandscapeOrientation()
    }

    if (this.config.showMessage) {
      this.showLandscapeMessage()
    }

    // 화면 회전 이벤트 리스너 등록
    this.addOrientationChangeListener()
  }

  /**
   * 가로형 강제 적용 (CSS transform 사용)
   */
  private forceLandscapeOrientation(): void {
    if (window.innerHeight > window.innerWidth) {
      // 세로형일 때 가로형으로 강제 회전
      document.body.style.transform = 'rotate(90deg)'
      document.body.style.transformOrigin = 'center center'
      document.body.style.width = '100vh'
      document.body.style.height = '100vw'
      document.body.style.position = 'fixed'
      document.body.style.top = '0'
      document.body.style.left = '0'
    } else {
      // 가로형일 때 정상 표시
      document.body.style.transform = 'none'
      document.body.style.width = '100vw'
      document.body.style.height = '100vh'
      document.body.style.position = 'static'
    }
  }

  /**
   * 세로형 안내 메시지 표시
   */
  private showLandscapeMessage(): void {
    if (window.innerHeight > window.innerWidth) {
      this.createLandscapeMessage()
    } else {
      this.removeLandscapeMessage()
    }
  }

  /**
   * 가로형 안내 메시지 생성
   */
  private createLandscapeMessage(): void {
    if (this.messageElement) return

    const messageHtml = `
      <div class="landscape-required-message">
        <div class="rotate-icon">📱</div>
        <h1>가로 모드로 전환해주세요</h1>
        <p>
          Vindex Arena는 가로형 디스플레이에서 최적의 게임 경험을 제공합니다.<br>
          기기를 가로로 회전시켜 주세요.
        </p>
        <div class="device-info">
          <h3>📱 모바일 기기</h3>
          <ul>
            <li>자동 회전을 켜고 기기를 가로로 회전</li>
            <li>화면 회전 잠금이 켜져있다면 해제</li>
          </ul>
        </div>
        <div class="device-info">
          <h3>💻 태블릿/PC</h3>
          <ul>
            <li>브라우저 창을 가로로 확장</li>
            <li>최소 너비 1024px 이상 권장</li>
          </ul>
        </div>
      </div>
    `

    const container =
      this.config.messageContainer === 'body'
        ? document.body
        : document.querySelector(this.config.messageContainer!) || document.body

    this.messageElement = document.createElement('div')
    this.messageElement.innerHTML = messageHtml
    this.messageElement = this.messageElement.firstElementChild as HTMLElement
    container.appendChild(this.messageElement)
  }

  /**
   * 가로형 안내 메시지 제거
   */
  private removeLandscapeMessage(): void {
    if (this.messageElement) {
      this.messageElement.remove()
      this.messageElement = null
    }
  }

  /**
   * 화면 회전 이벤트 리스너 추가
   */
  private addOrientationChangeListener(): void {
    const handleOrientationChange = () => {
      if (this.config.forceLandscape) {
        this.forceLandscapeOrientation()
      }
      if (this.config.showMessage) {
        this.showLandscapeMessage()
      }
    }

    // 화면 회전 이벤트
    window.addEventListener('orientationchange', handleOrientationChange)

    // 리사이즈 이벤트 (브라우저 창 크기 변경)
    window.addEventListener('resize', handleOrientationChange)

    // 초기 실행
    handleOrientationChange()
  }

  /**
   * 현재 화면 방향 확인
   */
  public getCurrentOrientation(): 'portrait' | 'landscape' {
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  }

  /**
   * 가로형 여부 확인
   */
  public isLandscape(): boolean {
    return this.getCurrentOrientation() === 'landscape'
  }

  /**
   * 세로형 여부 확인
   */
  public isPortrait(): boolean {
    return this.getCurrentOrientation() === 'portrait'
  }

  /**
   * 정리
   */
  public destroy(): void {
    this.removeLandscapeMessage()
    // 이벤트 리스너는 페이지 이동 시 자동으로 정리됨
  }
}

/**
 * React Hook으로 사용할 수 있는 가로형 강제 훅
 */
export function useLandscapeEnforcement(config?: OrientationConfig) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  )

  useEffect(() => {
    const manager = new OrientationManager(config)
    manager.enforceLandscape()

    const handleOrientationChange = () => {
      const newOrientation = manager.getCurrentOrientation()
      setOrientation(newOrientation)
    }

    window.addEventListener('orientationchange', handleOrientationChange)
    window.addEventListener('resize', handleOrientationChange)

    return () => {
      manager.destroy()
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [config])

  return {
    orientation,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  }
}

// React import 추가
import { useState, useEffect } from 'react'
