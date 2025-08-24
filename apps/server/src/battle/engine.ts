import {
  ATTACK_SKILLS,
  DEFENSE_SKILLS,
  Role,
  SkillId,
  AttackSkill,
  DefenseSkill,
  BattleState,
  Injury,
  attackBeats,
  defenseBeats,
  BATTLE_DEADLINE_MS,
} from './types'

export function isSkillAllowedForRole(skill: SkillId, role: Role): boolean {
  return role === 'ATTACK'
    ? (ATTACK_SKILLS as readonly string[]).includes(skill)
    : (DEFENSE_SKILLS as readonly string[]).includes(skill)
}

export function isSkillAllowedConsideringInjury(
  state: BattleState,
  sid: string,
  role: Role,
  skill: SkillId
): boolean {
  const injuries = state.injuries?.[sid] ?? []
  if (role === 'ATTACK' && injuries.includes('ARM')) return false
  if (role === 'DEFENSE' && skill === 'dodge' && injuries.includes('LEG')) return false
  return isSkillAllowedForRole(skill, role)
}

export function applyDecisiveDamage(state: BattleState, attackerSid: string, defenderSid: string) {
  const hp = state.hp ?? (state.hp = { [attackerSid]: 2, [defenderSid]: 2 })
  const weapon =
    state.weapon ?? (state.weapon = { [attackerSid]: 'ONE_HAND', [defenderSid]: 'ONE_HAND' })
  const inj = state.injuries ?? (state.injuries = { [attackerSid]: [], [defenderSid]: [] })
  const dmg = weapon[attackerSid] === 'TWO_HAND' ? 2 : 1
  for (let i = 0; i < dmg; i++) {
    const part: Injury = (['ARM', 'LEG', 'TORSO'] as Injury[])[Math.floor(Math.random() * 3)]
    inj[defenderSid].push(part)
  }
  hp[defenderSid] = Math.max(0, (hp[defenderSid] ?? 2) - dmg)
  state.momentum = 0
  return { dmg, injured: inj[defenderSid].slice(-dmg), hp: hp[defenderSid] }
}

export function resetDeadline(state: BattleState) {
  state.deadlineAt = Date.now() + BATTLE_DEADLINE_MS
}

export function judgeOutcome(
  attChoice: SkillId,
  defChoice: SkillId
): 'ATTACKER' | 'DEFENDER' | 'DRAW' {
  if (attChoice in attackBeats && attackBeats[attChoice as AttackSkill] === defChoice)
    return 'ATTACKER'
  if (defChoice in defenseBeats && defenseBeats[defChoice as DefenseSkill] === attChoice)
    return 'DEFENDER'
  return 'DRAW'
}
