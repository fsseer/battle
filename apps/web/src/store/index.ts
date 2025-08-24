// 중앙화된 스토어 관리
export { useAuthStore } from './auth'
export { useGameStore } from './game'

// 스토어 타입들
export type { User } from './auth'
export type { GameState, Character } from './game'

// 스토어 초기화
export function initializeStores() {
  // 모든 스토어의 초기화 로직을 여기서 관리
  console.log('[Store] 모든 스토어 초기화 완료')
}

// 스토어 정리
export function cleanupStores() {
  // 모든 스토어의 정리 로직을 여기서 관리
  console.log('[Store] 모든 스토어 정리 완료')
}
