import { useState } from 'react'
import { usePerformanceMonitor } from '../hooks/usePerformanceMonitor'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

interface PerformanceMonitorProps {
  showDetails?: boolean
  showWarnings?: boolean
  showSuggestions?: boolean
  className?: string
}

export default function PerformanceMonitor({
  showDetails = true,
  showWarnings = true,
  showSuggestions = true,
  className = '',
}: PerformanceMonitorProps) {
  const { canDisplayGame } = useLandscapeLayout()
  const [isExpanded, setIsExpanded] = useState(false)

  const { metrics, warnings, generatePerformanceReport, getOptimizationSuggestions } =
    usePerformanceMonitor({
      enableFPSMonitoring: true,
      enableMemoryMonitoring: true,
      enableRenderTimeMonitoring: true,
      updateInterval: 2000,
      fpsThreshold: 30,
      memoryThreshold: 50 * 1024 * 1024,
      renderTimeThreshold: 16,
    })

  // 해상도나 방향이 유효하지 않으면 표시하지 않음
  if (!canDisplayGame) {
    return null
  }

  const suggestions = getOptimizationSuggestions()
  const report = generatePerformanceReport()
  const hasWarnings = warnings.length > 0
  const hasSuggestions = suggestions.length > 0

  const formatMemory = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)}MB`
  }

  const getStatusColor = (score: number) => {
    if (score >= 80) return '#10b981' // green
    if (score >= 60) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 50) return '#10b981'
    if (fps >= 30) return '#f59e0b'
    return '#ef4444'
  }

  const getRenderTimeColor = (renderTime: number) => {
    if (renderTime <= 16) return '#10b981'
    if (renderTime <= 33) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className={`performance-monitor landscape-card ${className}`}>
      <div className="monitor-header">
        <h3 className="monitor-title">
          📊 성능 모니터
          <span
            className="status-indicator"
            style={{ backgroundColor: getStatusColor(report.summary.score) }}
          />
        </h3>
        <button
          className="expand-button landscape-btn landscape-icon-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* 기본 메트릭 */}
      <div className="metrics-overview">
        <div className="metric-item">
          <span className="metric-label">FPS</span>
          <span className="metric-value" style={{ color: getFPSColor(metrics.fps) }}>
            {metrics.fps}
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">렌더링</span>
          <span className="metric-value" style={{ color: getRenderTimeColor(metrics.renderTime) }}>
            {metrics.renderTime.toFixed(1)}ms
          </span>
        </div>
        <div className="metric-item">
          <span className="metric-label">메모리</span>
          <span className="metric-value">{formatMemory(metrics.memoryUsage)}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">컴포넌트</span>
          <span className="metric-value">{metrics.componentCount}</span>
        </div>
      </div>

      {/* 상세 정보 */}
      {isExpanded && showDetails && (
        <div className="monitor-details">
          <div className="detail-section">
            <h4>📈 상세 메트릭</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">마지막 업데이트</span>
                <span className="detail-value">
                  {new Date(metrics.lastUpdate).toLocaleTimeString()}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">성능 점수</span>
                <span className="detail-value">{report.summary.score}/100</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">상태</span>
                <span className="detail-value">{report.summary.status}</span>
              </div>
            </div>
          </div>

          {/* 경고 메시지 */}
          {showWarnings && hasWarnings && (
            <div className="detail-section">
              <h4>⚠️ 성능 경고</h4>
              <div className="warnings-list">
                {warnings.map((warning, index) => (
                  <div key={index} className="warning-item">
                    {warning}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 최적화 제안 */}
          {showSuggestions && hasSuggestions && (
            <div className="detail-section">
              <h4>💡 최적화 제안</h4>
              <div className="suggestions-list">
                {suggestions.map((suggestion, index) => (
                  <div key={index} className="suggestion-item">
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 성능 리포트 다운로드 */}
          <div className="detail-section">
            <h4>📋 성능 리포트</h4>
            <button
              className="download-report-btn landscape-btn landscape-btn-secondary"
              onClick={() => {
                const reportData = JSON.stringify(report, null, 2)
                const blob = new Blob([reportData], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `performance-report-${new Date().toISOString().split('T')[0]}.json`
                a.click()
                URL.revokeObjectURL(url)
              }}
            >
              📥 리포트 다운로드
            </button>
          </div>
        </div>
      )}

      {/* 실시간 차트 (간단한 시각화) */}
      {isExpanded && (
        <div className="monitor-charts">
          <div className="chart-section">
            <h4>📊 실시간 차트</h4>
            <div className="chart-container">
              <div className="chart-bar">
                <div
                  className="chart-fill fps-chart"
                  style={{
                    width: `${Math.min((metrics.fps / 60) * 100, 100)}%`,
                    backgroundColor: getFPSColor(metrics.fps),
                  }}
                />
              </div>
              <div className="chart-label">FPS (60 기준)</div>
            </div>
            <div className="chart-container">
              <div className="chart-bar">
                <div
                  className="chart-fill render-chart"
                  style={{
                    width: `${Math.min((metrics.renderTime / 33) * 100, 100)}%`,
                    backgroundColor: getRenderTimeColor(metrics.renderTime),
                  }}
                />
              </div>
              <div className="chart-label">렌더링 시간 (33ms 기준)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * 간단한 성능 표시기 (상세 정보 없음)
 */
export function PerformanceIndicator() {
  const { canDisplayGame } = useLandscapeLayout()
  const { metrics } = usePerformanceMonitor({
    enableFPSMonitoring: true,
    enableMemoryMonitoring: false,
    enableRenderTimeMonitoring: false,
    updateInterval: 5000,
  })

  if (!canDisplayGame) {
    return null
  }

  const getFPSColor = (fps: number) => {
    if (fps >= 50) return '#10b981'
    if (fps >= 30) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="performance-indicator">
      <span className="fps-indicator" style={{ color: getFPSColor(metrics.fps) }}>
        {metrics.fps} FPS
      </span>
    </div>
  )
}
