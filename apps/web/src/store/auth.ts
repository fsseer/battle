import { create } from 'zustand'

export interface User {
  id: string
  name: string
  nickname: string // 닉네임 필드 추가
  token: string
  characters: Array<{
    id: string
    name: string
    level: number
    stats: {
      str: number
      agi: number
      sta: number
    }
  }>
  // 자원 관련 필드들 추가
  ap?: number
  apMax?: number
  gold?: number
  stress?: number
  stressMax?: number
  lastApUpdate?: number
}

interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
  logout: () => void
  forceLogout: (reason: string) => void // 강제 로그아웃 추가
  updateUserResources: (resources: {
    ap?: number
    gold?: number
    stress?: number
    lastApUpdate?: number
    character?: { id: string }
  }) => void
  restoreToken: () => string | null // 토큰 복원 함수 추가
  initializeFromStorage: () => void // 스토리지에서 초기화 함수 추가
  handleTokenExpiration: () => void // 토큰 만료 처리 함수 추가
  validateToken: () => boolean // 토큰 유효성 검증 함수 추가
  validateTokenWithServer: () => Promise<boolean> // 서버 토큰 유효성 검증 함수 추가
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => {
    console.log('[AuthStore] setUser 호출됨:', {
      hasUser: !!user,
      userId: user?.id,
      userNickname: user?.nickname,
    })

    // 토큰을 localStorage에 저장 (시크릿 창 호환성)
    if (user?.token) {
      localStorage.setItem('token', user.token)
      console.log('[AuthStore] 토큰을 localStorage에 저장됨')
    }

    set({ user })
    console.log('[AuthStore] setUser 완료')
  },
  logout: () => {
    console.log('[AuthStore] logout 호출됨')
    // localStorage에서 토큰 제거
    localStorage.removeItem('token')
    console.log('[AuthStore] localStorage에서 토큰 제거됨')
    set({ user: null })
  },
  forceLogout: (reason: string) => {
    console.log('[AuthStore] forceLogout 호출됨:', reason)
    // localStorage에서 토큰 제거
    localStorage.removeItem('token')
    console.log('[AuthStore] localStorage에서 토큰 제거됨')
    // 강제 로그아웃 시 사용자에게 알림
    if (reason === 'DUPLICATE_LOGIN') {
      alert('다른 곳에서 로그인되어 현재 세션이 종료되었습니다.')
    }
    set({ user: null })
  },
  updateUserResources: (resources: {
    ap?: number
    gold?: number
    stress?: number
    lastApUpdate?: number
    character?: { id: string }
  }) =>
    set((state) => ({
      user: state.user
        ? {
            ...state.user,
            // 자원 정보 업데이트
            ...(resources.ap !== undefined && { ap: resources.ap }),
            ...(resources.gold !== undefined && { gold: resources.gold }),
            ...(resources.stress !== undefined && { stress: resources.stress }),
            ...(resources.lastApUpdate !== undefined && { lastApUpdate: resources.lastApUpdate }),
            // 캐릭터 정보 업데이트 (기존 로직 유지)
            ...(resources.character && {
              characters: state.user.characters.map((char) =>
                char.id === resources.character?.id
                  ? {
                      ...char,
                      stats: {
                        ...char.stats,
                        // 필요한 경우 다른 스탯도 업데이트
                      },
                    }
                  : char
              ),
            }),
          }
        : null,
    })),
  restoreToken: () => {
    const token = localStorage.getItem('token')
    console.log('[AuthStore] localStorage에서 토큰 복원 시도:', !!token)
    return token
  },
  initializeFromStorage: () => {
    const token = localStorage.getItem('token')
    if (token) {
      console.log('[AuthStore] 스토리지에서 토큰 발견, 초기화 시작')
      // 여기서 토큰 유효성 검증을 할 수 있습니다
      // 현재는 단순히 토큰 존재 여부만 확인
    } else {
      console.log('[AuthStore] 스토리지에 토큰 없음')
    }
  },
  handleTokenExpiration: () => {
    console.log('[AuthStore] handleTokenExpiration 시작')
    console.log(
      '[AuthStore] localStorage 토큰 확인:',
      localStorage.getItem('token') ? '존재함' : '없음'
    )

    // localStorage에서 토큰 제거
    localStorage.removeItem('token')
    console.log('[AuthStore] localStorage에서 토큰 제거 완료')

    // 사용자 상태 초기화
    set({ user: null })
    console.log('[AuthStore] user 상태 초기화 완료')

    // 로그인 페이지로 리다이렉트 (여러 방법 시도)
    console.log('[AuthStore] 로그인 페이지로 리다이렉트 시작')

    try {
      // 방법 1: window.location.href
      window.location.href = '/login'
      console.log('[AuthStore] window.location.href 완료')
    } catch (error) {
      console.error('[AuthStore] window.location.href 실패:', error)

      try {
        // 방법 2: window.location.replace
        window.location.replace('/login')
        console.log('[AuthStore] window.location.replace 완료')
      } catch (error2) {
        console.error('[AuthStore] window.location.replace 실패:', error2)

        try {
          // 방법 3: window.location.assign
          window.location.assign('/login')
          console.log('[AuthStore] window.location.assign 완료')
        } catch (error3) {
          console.error('[AuthStore] window.location.assign 실패:', error3)

          // 방법 4: 강제 새로고침
          console.log('[AuthStore] 강제 새로고침 시도')
          window.location.reload()
        }
      }
    }

    console.log('[AuthStore] handleTokenExpiration 완료')
  },
  validateToken: () => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('[AuthStore] 토큰이 없음')
      return false
    }

    // 토큰이 존재하는지만 확인 (실제 유효성은 서버에서 검증)
    console.log('[AuthStore] 토큰 존재 확인됨')
    return true
  },
  validateTokenWithServer: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('[AuthStore] 서버 검증: 토큰이 없음')
      return false
    }

    try {
      // 서버에 토큰 유효성 검증 요청
      const response = await fetch('http://127.0.0.1:5174/api/auth/validate', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        console.log('[AuthStore] 서버 검증: 토큰 유효함')
        return true
      } else if (response.status === 401 || response.status === 403) {
        console.log('[AuthStore] 서버 검증: 토큰 만료됨')
        // 토큰이 만료되었으므로 자동 로그아웃
        useAuthStore.getState().handleTokenExpiration()
        return false
      } else {
        console.log('[AuthStore] 서버 검증: 기타 오류', response.status)
        return false
      }
    } catch (error) {
      console.error('[AuthStore] 서버 검증 실패:', error)
      // 네트워크 오류 시에도 토큰을 만료된 것으로 처리
      useAuthStore.getState().handleTokenExpiration()
      return false
    }
  },
}))
