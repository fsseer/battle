export type Role = 'ATTACK' | 'DEFENSE'

// 공격: light(약공), heavy(강공), poke(견제)
// 방어: block(막기), dodge(회피), counter(반격)
export type AttackSkill = 'light' | 'heavy' | 'poke'
export type DefenseSkill = 'block' | 'dodge' | 'counter'
export type SkillId = AttackSkill | DefenseSkill

export const ATTACK_SKILLS: AttackSkill[] = ['light', 'heavy', 'poke']
export const DEFENSE_SKILLS: DefenseSkill[] = ['block', 'dodge', 'counter']

// 공격자가 이기는 관계: (강공 > 막기), (약공 > 회피), (견제 > 반격)
export const attackBeats: Record<AttackSkill, DefenseSkill> = {
  heavy: 'block',
  light: 'dodge',
  poke: 'counter',
}
// 수비자가 이기는 관계: (막기 > 견제), (회피 > 강공), (반격 > 약공)
export const defenseBeats: Record<DefenseSkill, AttackSkill> = {
  block: 'poke',
  dodge: 'heavy',
  counter: 'light',
}

export const BATTLE_DEADLINE_MS = 15_000

export type Injury = 'ARM' | 'LEG' | 'TORSO'

export type BattleState = {
  roomId: string
  round: number
  players: string[] // socket ids [A,B]
  roles: Record<string, Role> // sid -> role
  choices: Record<string, SkillId | undefined>
  momentum: number // >0: current attacker 우세, <0: 수비 우세
  decisiveThreshold: number
  deadlineAt?: number
  hp?: Record<string, number>
  injuries?: Record<string, Injury[]>
  weapon?: Record<string, 'ONE_HAND' | 'TWO_HAND'>
}
