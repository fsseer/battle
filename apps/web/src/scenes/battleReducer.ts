export type Role = 'ATTACK' | 'DEFENSE'

export type BattleState = {
  round: number
  role: Role
  choice: string | null
  oppChoice: string | null
  momentum: number
  log: string[]
  selfHp: number
  selfMaxHp: number
  oppHp: number
  oppMaxHp: number
  selfInjuries: Array<'ARM' | 'LEG' | 'TORSO'>
  oppInjuries: Array<'ARM' | 'LEG' | 'TORSO'>
}

export type BattleAction =
  | { type: 'init'; role: Role }
  | { type: 'select'; id: string }
  | {
      type: 'resolve'
      msg: {
        round: number
        self: string
        opp: string
        result: 0 | 1 | 2
        nextRole: Role
        momentum?: number
      }
    }
  | {
      type: 'decisive'
      hitterIsMe: boolean
      damage: number
      injured: Array<'ARM' | 'LEG' | 'TORSO'>
      hp: number
    }
  | { type: 'end'; reason: string; winner?: string }

export function createInitialState(role: Role): BattleState {
  return {
    round: 1,
    role,
    choice: null,
    oppChoice: null,
    momentum: 0,
    log: [],
    selfHp: 2,
    selfMaxHp: 2,
    oppHp: 2,
    oppMaxHp: 2,
    selfInjuries: [],
    oppInjuries: [],
  }
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'init':
      return createInitialState(action.role)
    case 'select':
      return { ...state, choice: action.id }
    case 'resolve': {
      const label =
        action.msg.result === 1 ? '라운드 승' : action.msg.result === 2 ? '라운드 패' : '무승부'
      return {
        ...state,
        role: action.msg.nextRole,
        momentum: typeof action.msg.momentum === 'number' ? action.msg.momentum : state.momentum,
        round: state.round + 1,
        choice: null,
        oppChoice: null,
        log: [
          `[R${action.msg.round}] 나:${action.msg.self} vs 상대:${action.msg.opp} → ${label}`,
          ...state.log,
        ],
      }
    }
    case 'decisive': {
      if (action.hitterIsMe) {
        const nextOppMax = Math.max(state.oppMaxHp, action.hp + action.damage)
        return {
          ...state,
          oppHp: action.hp,
          oppMaxHp: nextOppMax,
          oppInjuries: [...state.oppInjuries, ...action.injured],
          log: [`[결정타] 가함 - 피해:${action.damage}, 남은HP:${action.hp}`, ...state.log],
        }
      } else {
        const nextSelfMax = Math.max(state.selfMaxHp, action.hp + action.damage)
        return {
          ...state,
          selfHp: action.hp,
          selfMaxHp: nextSelfMax,
          selfInjuries: [...state.selfInjuries, ...action.injured],
          log: [`[결정타] 피격 - 피해:${action.damage}, 남은HP:${action.hp}`, ...state.log],
        }
      }
    }
    case 'end':
      return {
        ...state,
        log: [
          `전투 종료: ${action.reason} ${action.winner ? `(승자:${action.winner})` : ''}`,
          ...state.log,
        ],
      }
    default:
      return state
  }
}
